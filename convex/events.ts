import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const typeValidator = v.union(
  v.literal("practice"),
  v.literal("program_training"),
  v.literal("individual_practice"),
  v.literal("game"),
  v.literal("other"),
  v.literal("speed_series"),
  v.literal("shootaround"),
  v.literal("team_practice"),
  v.literal("scrimmage"),
  v.literal("festival"),
);

const ageGroupValidator = v.union(
  v.literal("U6"),
  v.literal("U8"),
  v.literal("U12"),
  v.literal("U14"),
);

export const listEvents = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("events").collect().then((events) =>
      events.sort((a, b) => a.date - b.date)
    );
  },
});

export const getEvent = query({
  args: { id: v.id("events") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const createEvent = mutation({
  args: {
    title: v.string(),
    date: v.number(),
    type: typeValidator,
    targetAgeGroup: v.optional(ageGroupValidator),
    location: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("events", {
      ...args,
      published: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateEvent = mutation({
  args: {
    id: v.id("events"),
    title: v.optional(v.string()),
    date: v.optional(v.number()),
    type: v.optional(typeValidator),
    targetAgeGroup: v.optional(ageGroupValidator),
    location: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});

export const deleteEvent = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

const GAME_TYPES = ["game", "scrimmage", "festival"] as const;
type GameType = typeof GAME_TYPES[number];

export const publishEvent = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, { id }) => {
    const event = await ctx.db.get(id);
    if (!event) throw new Error("Event not found.");

    if (GAME_TYPES.includes(event.type as GameType)) {
      // Game types require a game checklist
      const checklist = await ctx.db
        .query("game_checklists")
        .withIndex("by_event", (q) => q.eq("eventId", id))
        .first();
      if (!checklist) {
        throw new Error(
          "Cannot publish: no game checklist is attached to this event. Create a checklist first."
        );
      }
    } else {
      // Practice types require a practice plan
      const plan = await ctx.db
        .query("practice_plans")
        .withIndex("by_event", (q) => q.eq("eventId", id))
        .first();
      if (!plan) {
        throw new Error(
          "Cannot publish: no practice plan is attached to this event. Create a plan first."
        );
      }
    }

    await ctx.db.patch(id, { published: true, updatedAt: Date.now() });
  },
});

export const unpublishEvent = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { published: false, updatedAt: Date.now() });
  },
});

// Run once via Convex dashboard to seed March 2026 practice dates
export const seedMarchEvents = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    // All March 2026 practices at 6:00 PM UTC (adjust to local if needed)
    const marchDates = [
      "2026-03-02", "2026-03-04", "2026-03-06", "2026-03-07",
      "2026-03-09", "2026-03-11", "2026-03-13", "2026-03-14",
      "2026-03-16", "2026-03-18", "2026-03-20", "2026-03-21",
      "2026-03-23", "2026-03-25", "2026-03-27", "2026-03-30",
    ];

    const inserted: string[] = [];
    for (const dateStr of marchDates) {
      const date = new Date(`${dateStr}T18:00:00`).getTime();
      const title = `Practice — ${new Date(date).toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric",
      })}`;
      await ctx.db.insert("events", {
        title,
        date,
        type: "program_training", // updated from legacy "practice"
        durationMinutes: 90,
        published: false,
        createdAt: now,
        updatedAt: now,
      });
      inserted.push(title);
    }

    return { inserted: inserted.length, titles: inserted };
  },
});
