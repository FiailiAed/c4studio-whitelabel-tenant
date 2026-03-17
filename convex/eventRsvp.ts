import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const getMyRsvp = query({
  args: {
    eventId: v.id("events"),
    clerkId: v.string(),
  },
  handler: async (ctx, { eventId, clerkId }) => {
    return await ctx.db
      .query("event_rsvp")
      .withIndex("by_event_clerk", (q) =>
        q.eq("eventId", eventId).eq("clerkId", clerkId)
      )
      .unique();
  },
});

export const getRsvpsForEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    return await ctx.db
      .query("event_rsvp")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();
  },
});

export const upsertRsvp = mutation({
  args: {
    eventId: v.id("events"),
    clerkId: v.string(),
    status: v.union(
      v.literal("confirmed"),
      v.literal("declined"),
      v.literal("maybe"),
    ),
  },
  handler: async (ctx, { eventId, clerkId, status }): Promise<Id<"event_rsvp">> => {
    const existing = await ctx.db
      .query("event_rsvp")
      .withIndex("by_event_clerk", (q) =>
        q.eq("eventId", eventId).eq("clerkId", clerkId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { status, updatedAt: Date.now() });
      return existing._id;
    }

    return await ctx.db.insert("event_rsvp", {
      eventId,
      clerkId,
      status,
      updatedAt: Date.now(),
    });
  },
});
