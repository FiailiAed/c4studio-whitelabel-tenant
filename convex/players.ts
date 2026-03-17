import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const ageGroupValidator = v.union(
  v.literal("U6"),
  v.literal("U8"),
  v.literal("U12"),
  v.literal("U14"),
);

export const listPlayersByAgeGroup = query({
  args: { ageGroup: v.optional(ageGroupValidator) },
  handler: async (ctx, { ageGroup }) => {
    if (ageGroup) {
      return await ctx.db
        .query("players")
        .withIndex("by_age_group", (q) => q.eq("ageGroup", ageGroup))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();
    }
    return await ctx.db
      .query("players")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

export const listAllPlayers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("players").collect();
  },
});

export const createPlayer = mutation({
  args: {
    name: v.string(),
    jerseyNumber: v.optional(v.number()),
    ageGroup: ageGroupValidator,
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("players", {
      ...args,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const setPlayerActive = mutation({
  args: {
    playerId: v.id("players"),
    isActive: v.boolean(),
  },
  handler: async (ctx, { playerId, isActive }) => {
    await ctx.db.patch(playerId, { isActive, updatedAt: Date.now() });
  },
});
