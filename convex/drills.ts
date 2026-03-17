import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const sectionValidator = v.union(
  v.literal("stretch"),
  v.literal("warmup"),
  v.literal("offense"),
  v.literal("ground_balls"),
  v.literal("defense"),
  v.literal("3v3_combat"),
  v.literal("team_specific"),
  v.literal("u6_practice"),
);

const ageGroupValidator = v.union(
  v.literal("U6"),
  v.literal("U8"),
  v.literal("U12"),
  v.literal("U14"),
);

export const listDrills = query({
  args: {},
  handler: async (ctx) => {
    const drills = await ctx.db.query("drills").collect();
    return drills.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const getDrill = query({
  args: { id: v.id("drills") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const createDrill = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    defaultSection: v.optional(sectionValidator),
    suitableAgeGroups: v.optional(v.array(ageGroupValidator)),
    defaultDurationMinutes: v.number(),
    repsPerMinute: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("drills", { ...args, createdAt: now, updatedAt: now });
  },
});

export const updateDrill = mutation({
  args: {
    id: v.id("drills"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    defaultSection: v.optional(sectionValidator),
    suitableAgeGroups: v.optional(v.array(ageGroupValidator)),
    defaultDurationMinutes: v.optional(v.number()),
    repsPerMinute: v.optional(v.number()),
    diagramSvg: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});

export const getDrillStats = query({
  args: { id: v.id("drills") },
  handler: async (ctx, { id }) => {
    const usages = await ctx.db
      .query("plan_drills")
      .withIndex("by_drill", (q) => q.eq("drillId", id))
      .collect();
    const uniquePlans = new Set(usages.map((u) => u.planId)).size;
    const sectionBreakdown: Record<string, number> = {};
    for (const u of usages) {
      sectionBreakdown[u.section] = (sectionBreakdown[u.section] ?? 0) + 1;
    }
    return {
      totalUses: usages.length,
      uniquePlans,
      isStale: usages.length === 0,
      sectionBreakdown,
    };
  },
});

export const deleteDrill = mutation({
  args: { id: v.id("drills") },
  handler: async (ctx, { id }) => {
    // Refuse deletion if any practice plan references this drill
    const referenced = await ctx.db
      .query("plan_drills")
      .filter((q) => q.eq(q.field("drillId"), id))
      .first();
    if (referenced) {
      throw new Error(
        "Cannot delete: this drill is referenced in one or more practice plans. Remove it from all plans first."
      );
    }
    await ctx.db.delete(id);
  },
});
