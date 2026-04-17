import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

export const getMembership = query({
  args: { tenantId: v.id("tenants"), clerkId: v.string() },
  handler: async (ctx, { tenantId, clerkId }) => {
    return await ctx.db
      .query("tenant_members")
      .withIndex("by_tenant_and_clerk", (q) =>
        q.eq("tenantId", tenantId).eq("clerkId", clerkId),
      )
      .unique();
  },
});

export const listTenantMembers = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    return await ctx.db
      .query("tenant_members")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();
  },
});

export const listUserTenants = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const memberships = await ctx.db
      .query("tenant_members")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .collect();
    const results = await Promise.all(
      memberships.map(async (m) => {
        const tenant = await ctx.db.get(m.tenantId);
        return tenant ? { membership: m, tenant } : null;
      }),
    );
    return results.filter(Boolean) as Array<{
      membership: Doc<"tenant_members">;
      tenant: Doc<"tenants">;
    }>;
  },
});

export const addMember = mutation({
  args: {
    tenantId: v.id("tenants"),
    clerkId: v.string(),
    tenantRole: v.union(
      v.literal("admin"),
      v.literal("coach"),
      v.literal("parent"),
    ),
  },
  handler: async (ctx, { tenantId, clerkId, tenantRole }) => {
    const existing = await ctx.db
      .query("tenant_members")
      .withIndex("by_tenant_and_clerk", (q) =>
        q.eq("tenantId", tenantId).eq("clerkId", clerkId),
      )
      .unique();
    if (existing) {
      throw new Error("User is already a member of this tenant.");
    }
    const now = Date.now();
    return await ctx.db.insert("tenant_members", {
      tenantId,
      clerkId,
      tenantRole,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateMemberRole = mutation({
  args: {
    tenantId: v.id("tenants"),
    clerkId: v.string(),
    tenantRole: v.optional(v.union(
      v.literal("admin"),
      v.literal("coach"),
      v.literal("parent"),
    )),
    status: v.optional(
      v.union(v.literal("active"), v.literal("inactive"), v.literal("invited")),
    ),
  },
  handler: async (ctx, { tenantId, clerkId, tenantRole, status }) => {
    const existing = await ctx.db
      .query("tenant_members")
      .withIndex("by_tenant_and_clerk", (q) =>
        q.eq("tenantId", tenantId).eq("clerkId", clerkId),
      )
      .unique();
    if (!existing) throw new Error("Membership not found.");
    await ctx.db.patch(existing._id, {
      ...(tenantRole !== undefined ? { tenantRole } : {}),
      ...(status !== undefined ? { status } : {}),
      updatedAt: Date.now(),
    });
  },
});

export const removeMember = mutation({
  args: { tenantId: v.id("tenants"), clerkId: v.string() },
  handler: async (ctx, { tenantId, clerkId }) => {
    const existing = await ctx.db
      .query("tenant_members")
      .withIndex("by_tenant_and_clerk", (q) =>
        q.eq("tenantId", tenantId).eq("clerkId", clerkId),
      )
      .unique();
    if (!existing) throw new Error("Membership not found.");
    await ctx.db.delete(existing._id);
  },
});
