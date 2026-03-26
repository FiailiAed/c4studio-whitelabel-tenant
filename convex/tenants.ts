import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getTenant = query({
  args: { id: v.id("tenants") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const getTenantBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
  },
});

export const listTenants = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tenants").order("desc").collect();
  },
});

export const getTenantStats = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    const members = await ctx.db
      .query("tenant_members")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();
    const memberCount = members.length;
    const activeMemberCount = members.filter((m) => m.status === "active").length;
    return { memberCount, activeMemberCount };
  },
});

const SLUG_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

export const createTenant = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    primaryColor: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    customDomain: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    if (!SLUG_RE.test(args.slug)) {
      throw new Error("Invalid slug format. Use lowercase letters, numbers, and hyphens only.");
    }
    const existing = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) {
      throw new Error(`Slug "${args.slug}" is already taken.`);
    }
    const now = Date.now();
    return await ctx.db.insert("tenants", {
      name: args.name,
      slug: args.slug,
      primaryColor: args.primaryColor,
      logoUrl: args.logoUrl,
      customDomain: args.customDomain,
      status: args.status ?? "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateTenant = mutation({
  args: {
    id: v.id("tenants"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    customDomain: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, { id, slug, ...rest }) => {
    if (slug !== undefined) {
      if (!SLUG_RE.test(slug)) {
        throw new Error("Invalid slug format. Use lowercase letters, numbers, and hyphens only.");
      }
      const existing = await ctx.db
        .query("tenants")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      if (existing && existing._id !== id) {
        throw new Error(`Slug "${slug}" is already taken.`);
      }
    }
    await ctx.db.patch(id, { ...rest, ...(slug ? { slug } : {}), updatedAt: Date.now() });
  },
});

export const deleteTenant = mutation({
  args: { id: v.id("tenants") },
  handler: async (ctx, { id }) => {
    const members = await ctx.db
      .query("tenant_members")
      .withIndex("by_tenant", (q) => q.eq("tenantId", id))
      .collect();
    for (const member of members) {
      await ctx.db.delete(member._id);
    }
    await ctx.db.delete(id);
  },
});
