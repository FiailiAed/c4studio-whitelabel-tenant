import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

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

export const getMyLogsForEvent = query({
  args: {
    eventId: v.id("events"),
    clerkId: v.string(),
  },
  handler: async (ctx, { eventId, clerkId }) => {
    return await ctx.db
      .query("reps_log")
      .withIndex("by_event_clerk", (q) =>
        q.eq("eventId", eventId).eq("clerkId", clerkId)
      )
      .collect();
  },
});

export const upsertStationLog = mutation({
  args: {
    eventId: v.id("events"),
    clerkId: v.string(),
    drillId: v.id("drills"),
    station: sectionValidator,
    ageGroup: v.optional(ageGroupValidator),
    totalRepsCompleted: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find existing log for this event+clerk+drill combination
    const existing = await ctx.db
      .query("reps_log")
      .withIndex("by_event_clerk", (q) =>
        q.eq("eventId", args.eventId).eq("clerkId", args.clerkId)
      )
      .filter((q) => q.eq(q.field("drillId"), args.drillId))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        totalRepsCompleted: args.totalRepsCompleted,
        notes: args.notes,
        loggedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("reps_log", {
      eventId: args.eventId,
      clerkId: args.clerkId,
      drillId: args.drillId,
      station: args.station,
      ageGroup: args.ageGroup,
      totalRepsCompleted: args.totalRepsCompleted,
      notes: args.notes,
      loggedAt: now,
    });
  },
});

export const getMyAllLogs = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    return ctx.db
      .query("reps_log")
      .withIndex("by_clerk", (q) => q.eq("clerkId", clerkId))
      .order("desc")
      .collect();
  },
});

export const getMyLogsEnriched = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const logs = await ctx.db
      .query("reps_log")
      .withIndex("by_clerk", (q) => q.eq("clerkId", clerkId))
      .order("desc")
      .collect();

    if (logs.length === 0) return [];

    const uniqueEventIds = [...new Set(logs.map((l) => l.eventId))];
    const uniqueDrillIds = [...new Set(logs.map((l) => l.drillId))];

    const [eventsArr, drillsArr, plansArr] = await Promise.all([
      Promise.all(uniqueEventIds.map((id) => ctx.db.get(id))),
      Promise.all(uniqueDrillIds.map((id) => ctx.db.get(id))),
      Promise.all(
        uniqueEventIds.map((eventId) =>
          ctx.db
            .query("practice_plans")
            .withIndex("by_event", (q) => q.eq("eventId", eventId))
            .first()
        )
      ),
    ]);

    const eventMap = new Map(uniqueEventIds.map((id, i) => [id, eventsArr[i]]));
    const drillMap = new Map(uniqueDrillIds.map((id, i) => [id, drillsArr[i]]));
    const planMap = new Map(uniqueEventIds.map((id, i) => [id, plansArr[i]]));

    const enriched = await Promise.all(
      logs.map(async (log) => {
        const event = eventMap.get(log.eventId);
        const drill = drillMap.get(log.drillId);
        const plan = planMap.get(log.eventId);

        let targetReps: number | null = null;
        if (plan && drill) {
          const planDrill = await ctx.db
            .query("plan_drills")
            .withIndex("by_plan", (q) => q.eq("planId", plan._id))
            .filter((q) => q.eq(q.field("drillId"), log.drillId))
            .first();
          if (planDrill) {
            targetReps =
              planDrill.repsOverride ??
              Math.round(planDrill.durationMinutes * drill.repsPerMinute);
          }
        }

        return {
          _id: log._id,
          eventId: log.eventId,
          drillId: log.drillId,
          station: log.station,
          ageGroup: log.ageGroup,
          totalRepsCompleted: log.totalRepsCompleted,
          notes: log.notes,
          loggedAt: log.loggedAt,
          eventTitle: event?.title ?? "Unknown Event",
          eventDate: event?.date ?? 0,
          drillName: drill?.name ?? "Unknown Drill",
          targetReps,
        };
      })
    );

    return enriched;
  },
});

export const getTopPlayersByReps = query({
  args: {},
  handler: async (ctx) => {
    const allLogs = await ctx.db.query("player_reps_log").collect();

    const repsByPlayer = new Map<string, number>();
    for (const log of allLogs) {
      const id = log.playerId as string;
      repsByPlayer.set(id, (repsByPlayer.get(id) ?? 0) + log.repsCompleted);
    }

    const top5 = [...repsByPlayer.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return Promise.all(
      top5.map(async ([playerId, totalReps]) => {
        const player = await ctx.db.get(playerId as Id<"players">);
        return {
          totalReps,
          name: player?.name ?? "Unknown",
          ageGroup: player?.ageGroup ?? null,
          jerseyNumber: player?.jerseyNumber ?? null,
        };
      })
    );
  },
});

export const logPlayerReps = mutation({
  args: {
    eventId: v.id("events"),
    clerkId: v.string(),
    playerId: v.id("players"),
    drillId: v.id("drills"),
    station: sectionValidator,
    repsCompleted: v.number(),
  },
  handler: async (ctx, args) => {
    // Find existing player log for this event+player+drill
    const existing = await ctx.db
      .query("player_reps_log")
      .withIndex("by_event_clerk", (q) =>
        q.eq("eventId", args.eventId).eq("clerkId", args.clerkId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("playerId"), args.playerId),
          q.eq(q.field("drillId"), args.drillId),
        )
      )
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        repsCompleted: args.repsCompleted,
        loggedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("player_reps_log", {
      eventId: args.eventId,
      clerkId: args.clerkId,
      playerId: args.playerId,
      drillId: args.drillId,
      station: args.station,
      repsCompleted: args.repsCompleted,
      loggedAt: now,
    });
  },
});
