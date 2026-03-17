import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
  },
});

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const deleteUser = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const upsertUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    onboardStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("submitted"),
      v.literal("done")
    )),
    role: v.union(v.literal("user"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        onboardStatus: existing.onboardStatus ?? args.onboardStatus ?? "pending",
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("users", {
        ...args,
        onboardStatus: args.onboardStatus ?? "pending",
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const updateOnboardStatus = mutation({
  args: {
    clerkId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("submitted"),
      v.literal("done")
    ),
  },
  handler: async (ctx, { clerkId, status }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (!existing) throw new Error(`User not found: ${clerkId}`);
    await ctx.db.patch(existing._id, { onboardStatus: status, updatedAt: Date.now() });
  },
});
