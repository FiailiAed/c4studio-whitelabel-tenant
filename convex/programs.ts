import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Active programs for a tenant — parent-facing (no auth required). */
export const listActiveByTenant = query({
  args: { tenantSlug: v.string() },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.tenantSlug))
      .first();
    if (!tenant) return [];

    return ctx.db
      .query("programs")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenant._id))
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .collect();
  },
});

/** All programs (all statuses) for a tenant — admin only. */
export const listAllByTenant = query({
  args: { tenantSlug: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.tenantSlug))
      .first();
    if (!tenant) return [];

    return ctx.db
      .query("programs")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenant._id))
      .collect();
  },
});

/** Single program by ID. */
export const getProgram = query({
  args: { programId: v.id("programs") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.programId);
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const createProgram = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
    description: v.optional(v.string()),
    priceInCents: v.number(),
    capacity: v.optional(v.number()),
    status: v.union(v.literal("DRAFT"), v.literal("ACTIVE"), v.literal("CLOSED")),
  },
  returns: v.id("programs"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return ctx.db.insert("programs", args);
  },
});

export const updateProgram = mutation({
  args: {
    id: v.id("programs"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    priceInCents: v.optional(v.number()),
    capacity: v.optional(v.number()),
    status: v.optional(
      v.union(v.literal("DRAFT"), v.literal("ACTIVE"), v.literal("CLOSED")),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const { id, ...fields } = args;
    const patch: Partial<typeof fields> = {};
    if (fields.name !== undefined) patch.name = fields.name;
    if (fields.description !== undefined) patch.description = fields.description;
    if (fields.priceInCents !== undefined) patch.priceInCents = fields.priceInCents;
    if (fields.capacity !== undefined) patch.capacity = fields.capacity;
    if (fields.status !== undefined) patch.status = fields.status;

    await ctx.db.patch(id, patch);
    return null;
  },
});

/** Internal: set stripePriceId after it's created during checkout setup. */
export const setStripePriceId = internalMutation({
  args: { id: v.id("programs"), stripePriceId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { stripePriceId: args.stripePriceId });
    return null;
  },
});
