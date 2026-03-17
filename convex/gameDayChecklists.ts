import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const ageGroupValidator = v.union(
  v.literal("U6"),
  v.literal("U8"),
  v.literal("U12"),
  v.literal("U14"),
);

export const getChecklistForEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const checklist = await ctx.db
      .query("game_checklists")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .first();

    if (!checklist) return null;

    // Join warmupDrillIds with drill names
    const warmupDrills = await Promise.all(
      checklist.warmupDrillIds.map(async (drillId) => {
        const drill = await ctx.db.get(drillId);
        return drill ? { id: drillId, name: drill.name } : null;
      })
    );

    return {
      ...checklist,
      warmupDrills: warmupDrills.filter(Boolean) as Array<{ id: string; name: string }>,
    };
  },
});

export const upsertChecklist = mutation({
  args: {
    eventId: v.id("events"),
    warmupDrillIds: v.array(v.id("drills")),
    equipmentItems: v.array(v.object({
      item: v.string(),
      checked: v.boolean(),
    })),
    gameSchedule: v.array(v.object({
      ageGroup: ageGroupValidator,
      time: v.string(),
      location: v.optional(v.string()),
    })),
    rosterNotes: v.optional(v.string()),
  },
  handler: async (ctx, { eventId, warmupDrillIds, equipmentItems, gameSchedule, rosterNotes }) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("game_checklists")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        warmupDrillIds,
        equipmentItems,
        gameSchedule,
        rosterNotes,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("game_checklists", {
      eventId,
      warmupDrillIds,
      equipmentItems,
      gameSchedule,
      rosterNotes,
      createdAt: now,
      updatedAt: now,
    });
  },
});
