import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

const roleValidator = v.union(
  v.literal("admin"),
  v.literal("coach"),
  v.literal("parent"),
);

export const createInvite = mutation({
  args: {
    tenantId: v.id("tenants"),
    token: v.string(),
    role: roleValidator,
    type: v.union(v.literal("email"), v.literal("link")),
    email: v.optional(v.string()),
    clerkInvitationId: v.optional(v.string()),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    return await ctx.db.insert("tenant_invites", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    return await ctx.db
      .query("tenant_invites")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
  },
});

export const consumeInvite = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const invite = await ctx.db
      .query("tenant_invites")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!invite) throw new Error("Invite not found");
    if (invite.status !== "pending") throw new Error("Invite already used or revoked");
    if (invite.expiresAt < Date.now()) {
      await ctx.db.patch(invite._id, { status: "expired" });
      throw new Error("Invite has expired");
    }
    await ctx.db.patch(invite._id, { status: "accepted" });
  },
});

export const listByTenant = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    return await ctx.db
      .query("tenant_invites")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .order("desc")
      .collect();
  },
});

export const revokeInvite = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const invite = await ctx.db
      .query("tenant_invites")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!invite) throw new Error("Invite not found");
    await ctx.db.patch(invite._id, { status: "revoked" });
  },
});

// One-time data migration: normalizes all tenantRole values to the new enum.
// Any role that is not "admin", "coach", or "parent" gets mapped to "coach".
// Run: bunx convex run tenantInvites:migrateMemberRoles
// BEFORE pushing the schema with the tenantRole enum constraint.
export const migrateMemberRoles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const members = await ctx.db.query("tenant_members").collect();
    const valid = new Set(["admin", "coach", "parent"]);
    let migrated = 0;
    for (const m of members) {
      if (!valid.has(m.tenantRole)) {
        await ctx.db.patch(m._id, { tenantRole: "coach" });
        migrated++;
      }
    }
    return { migrated };
  },
});
