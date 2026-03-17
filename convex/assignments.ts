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

export const getMyAssignments = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    return ctx.db
      .query("staff_assignments")
      .withIndex("by_clerk", (q) => q.eq("clerkId", clerkId))
      .collect();
  },
});

export const getAssignmentsForEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const assignments = await ctx.db
      .query("staff_assignments")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();

    // Join with user info for display
    const result = await Promise.all(
      assignments.map(async (a) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", a.clerkId))
          .first();
        const staffName = user
          ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
          : a.clerkId;
        return { ...a, staffName, staffEmail: user?.email ?? "" };
      })
    );

    return result;
  },
});

export const getAvailableStaffForEvent = query({
  args: {
    eventId: v.id("events"),
    ageGroup: v.optional(ageGroupValidator),
  },
  handler: async (ctx, { ageGroup }) => {
    // All staff who have completed onboarding
    const approvedUsers = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("onboardStatus"), "done"))
      .collect();

    // Join with onboarding to get each staff member's age group preferences
    const withOnboarding = await Promise.all(
      approvedUsers.map(async (u) => {
        const onboarding = await ctx.db
          .query("onboarding")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", u.clerkId))
          .first();
        return {
          clerkId: u.clerkId,
          name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email,
          email: u.email,
          ageGroups: (onboarding?.ageGroups ?? []) as string[],
        };
      })
    );

    if (!ageGroup) return withOnboarding;

    // Filter to staff who indicated this age group during onboarding
    return withOnboarding.filter((s) => s.ageGroups.includes(ageGroup));
  },
});

export const upsertAssignment = mutation({
  args: {
    eventId: v.id("events"),
    clerkId: v.string(),
    station: sectionValidator,
    ageGroup: v.optional(ageGroupValidator),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { eventId, clerkId, station, ageGroup, notes }) => {
    // Find any existing assignment for this event + station + ageGroup slot
    const byStation = await ctx.db
      .query("staff_assignments")
      .withIndex("by_event_station", (q) =>
        q.eq("eventId", eventId).eq("station", station)
      )
      .collect();

    const existing = byStation.find((a) => a.ageGroup === ageGroup);

    if (existing) {
      await ctx.db.patch(existing._id, { clerkId, notes, createdAt: Date.now() });
      return existing._id;
    }

    return await ctx.db.insert("staff_assignments", {
      eventId,
      clerkId,
      station,
      ageGroup,
      notes,
      createdAt: Date.now(),
    });
  },
});

export const removeAssignment = mutation({
  args: { assignmentId: v.id("staff_assignments") },
  handler: async (ctx, { assignmentId }) => {
    await ctx.db.delete(assignmentId);
  },
});

export const upsertAssignmentsBatch = mutation({
  args: {
    eventId: v.id("events"),
    assignments: v.array(v.object({
      station: sectionValidator,
      ageGroup: v.optional(ageGroupValidator),
      clerkId: v.string(), // empty string = delete existing assignment
    })),
  },
  handler: async (ctx, { eventId, assignments }) => {
    let upserted = 0;
    let deleted = 0;

    for (const { station, ageGroup, clerkId } of assignments) {
      // Find existing assignment for this event + station + ageGroup slot
      const byStation = await ctx.db
        .query("staff_assignments")
        .withIndex("by_event_station", (q) =>
          q.eq("eventId", eventId).eq("station", station)
        )
        .collect();

      const existing = byStation.find((a) => a.ageGroup === ageGroup);

      if (clerkId === "") {
        // Delete existing if present
        if (existing) {
          await ctx.db.delete(existing._id);
          deleted++;
        }
      } else if (existing) {
        await ctx.db.patch(existing._id, { clerkId, createdAt: Date.now() });
        upserted++;
      } else {
        await ctx.db.insert("staff_assignments", {
          eventId,
          clerkId,
          station,
          ageGroup,
          createdAt: Date.now(),
        });
        upserted++;
      }
    }

    return { upserted, deleted };
  },
});
