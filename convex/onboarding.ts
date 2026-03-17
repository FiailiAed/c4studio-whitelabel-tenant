import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ── Validators ────────────────────────────────────────────────────────────────

const volunteerTypeValidator = v.union(
  v.literal("parent_volunteer"),
  v.literal("high_school_player"),
  v.literal("adult_volunteer"),
);

const practicePositionValidator = v.union(
  v.literal("coach"),
  v.literal("defensive_trainer"),
  v.literal("offensive_trainer"),
  v.literal("goalie_trainer"),
  v.literal("helper"),
  v.literal("media"),
);

const gamePositionValidator = v.union(
  v.literal("head_coach"),
  v.literal("assistant_coach"),
  v.literal("goalie_coach"),
  v.literal("parent_coach"),
  v.literal("scorekeeper"),
  v.literal("media_team"),
  v.literal("game_day_helper"),
);

const practiceAgeGroupValidator = v.union(
  v.literal("06U"),
  v.literal("08U"),
  v.literal("10U"),
  v.literal("12U"),
  v.literal("14U"),
);

const gameAgeGroupValidator = v.union(
  v.literal("08U"),
  v.literal("10U"),
  v.literal("12U"),
  v.literal("14U"),
);

const practiceDayValidator = v.union(
  v.literal("monday"),
  v.literal("wednesday"),
  v.literal("friday"),
);

const gameTimeSlotValidator = v.union(
  v.literal("9am"),
  v.literal("10am"),
  v.literal("11am"),
  v.literal("12pm"),
  v.literal("1pm"),
  v.literal("2pm"),
);

// ── Queries ───────────────────────────────────────────────────────────────────

export const getOnboardingByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    return await ctx.db
      .query("onboarding")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
  },
});

export const getSeasonConfig = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db.query("seasonConfig").first();
    if (!config) {
      // Return default if no config has been saved yet
      return { activeGameAgeGroups: ["10U", "12U"] as Array<"08U" | "10U" | "12U" | "14U"> };
    }
    return config;
  },
});

// ── Step Mutations ────────────────────────────────────────────────────────────

/** Step 1: Background Info */
export const saveBackgroundInfo = mutation({
  args: {
    clerkId: v.string(),
    volunteerType: volunteerTypeValidator,
    playingExperience: v.object({
      yearsPlayed: v.number(),
      highestLevel: v.union(
        v.literal("none"),
        v.literal("youth"),
        v.literal("high_school"),
        v.literal("college"),
        v.literal("pro"),
      ),
    }),
    coachingExperience: v.array(v.object({
      sport: v.string(),
      years: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("onboarding")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        volunteerType: args.volunteerType,
        playingExperience: args.playingExperience,
        coachingExperience: args.coachingExperience,
        currentStep: Math.max(existing.currentStep ?? 0, 1),
      });
    } else {
      await ctx.db.insert("onboarding", {
        clerkId: args.clerkId,
        volunteerType: args.volunteerType,
        playingExperience: args.playingExperience,
        coachingExperience: args.coachingExperience,
        certifications: [],
        documentAcknowledgments: [],
        currentStep: 1,
      });
    }

    // Update user onboardStatus to in_progress
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (user && (!user.onboardStatus || user.onboardStatus === "pending")) {
      await ctx.db.patch(user._id, {
        onboardStatus: "in_progress",
        updatedAt: now,
      });
    }
  },
});

/** Step 2: Practice Availability */
export const savePracticeAvailability = mutation({
  args: {
    clerkId: v.string(),
    practicePositions: v.array(practicePositionValidator),
    practiceAgeGroups: v.array(practiceAgeGroupValidator),
    practiceDays: v.array(practiceDayValidator),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("onboarding")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!existing || (existing.currentStep ?? 0) < 1) {
      throw new Error("Complete Step 1 (Background Info) before saving practice availability.");
    }

    if (!args.practicePositions.length) {
      throw new Error("Select at least one practice position.");
    }
    if (!args.practiceAgeGroups.length) {
      throw new Error("Select at least one practice age group.");
    }
    if (!args.practiceDays.length) {
      throw new Error("Select at least one practice day.");
    }

    await ctx.db.patch(existing._id, {
      practicePositions: args.practicePositions,
      practiceAgeGroups: args.practiceAgeGroups,
      practiceDays: args.practiceDays,
      currentStep: Math.max(existing.currentStep ?? 0, 2),
    });
  },
});

/** Step 3: Game Availability */
export const saveGameAvailability = mutation({
  args: {
    clerkId: v.string(),
    gamePositions: v.array(gamePositionValidator),
    gameAgeGroups: v.array(gameAgeGroupValidator),
    gameAvailability: v.array(gameTimeSlotValidator),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("onboarding")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!existing || (existing.currentStep ?? 0) < 2) {
      throw new Error("Complete Step 2 (Practice Availability) before saving game availability.");
    }

    // High school players cannot be head coach
    if (
      existing.volunteerType === "high_school_player" &&
      args.gamePositions.includes("head_coach")
    ) {
      throw new Error("High School Players are not eligible to serve as Head Coach.");
    }

    if (!args.gamePositions.length) {
      throw new Error("Select at least one game-day role.");
    }

    await ctx.db.patch(existing._id, {
      gamePositions: args.gamePositions,
      gameAgeGroups: args.gameAgeGroups,
      gameAvailability: args.gameAvailability,
      currentStep: Math.max(existing.currentStep ?? 0, 3),
    });
  },
});

/** Step 4: Compliance */
export const saveCompliance = mutation({
  args: {
    clerkId: v.string(),
    usaLacrosseId: v.optional(v.string()),
    certifications: v.array(v.object({
      url: v.string(),
      name: v.string(),
      uploadedAt: v.number(),
    })),
    documentAcknowledgments: v.array(v.object({
      documentId: v.id("documents"),
      acknowledgedAt: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("onboarding")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!existing) {
      throw new Error("No onboarding record found. Complete Step 1 first.");
    }

    // Require currentStep >= 3, but allow legacy records (old 2-step flow) to submit
    const isLegacyRecord = !existing.currentStep && existing.positions && existing.positions.length > 0;
    if (!isLegacyRecord && (existing.currentStep ?? 0) < 3) {
      throw new Error("Complete Step 3 (Game Availability) before submitting compliance.");
    }

    // Head coach requires USA Lacrosse ID
    const isHeadCoach = existing.gamePositions?.includes("head_coach") ?? false;
    if (isHeadCoach && (!args.usaLacrosseId || !args.usaLacrosseId.trim())) {
      throw new Error("USA Lacrosse Member ID is required for Head Coaches.");
    }

    const now = Date.now();

    await ctx.db.patch(existing._id, {
      usaLacrosseId: args.usaLacrosseId || undefined,
      certifications: args.certifications,
      documentAcknowledgments: args.documentAcknowledgments,
      submittedAt: now,
      currentStep: 4,
    });

    // Update user onboardStatus to submitted
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (user) {
      await ctx.db.patch(user._id, {
        onboardStatus: "submitted",
        updatedAt: now,
      });
    }
  },
});

// ── Legacy mutations (kept for backward compat; new UI uses step-specific ones) ──

export const saveStep1 = mutation({
  args: {
    clerkId: v.string(),
    positions: v.array(v.string()),
    ageGroups: v.array(v.string()),
    practiceAvailability: v.array(v.string()),
    practiceAvailabilityEventIds: v.optional(v.array(v.id("events"))),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("onboarding")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        positions: args.positions,
        ageGroups: args.ageGroups,
        practiceAvailability: args.practiceAvailability,
        practiceAvailabilityEventIds: args.practiceAvailabilityEventIds,
      });
    } else {
      await ctx.db.insert("onboarding", {
        clerkId: args.clerkId,
        positions: args.positions,
        ageGroups: args.ageGroups,
        practiceAvailability: args.practiceAvailability,
        practiceAvailabilityEventIds: args.practiceAvailabilityEventIds,
        certifications: [],
        documentAcknowledgments: [],
      });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (user) {
      await ctx.db.patch(user._id, {
        onboardStatus: "in_progress",
        updatedAt: Date.now(),
      });
    }
  },
});

export const saveStep2 = mutation({
  args: {
    clerkId: v.string(),
    usaLacrosseId: v.optional(v.string()),
    certifications: v.array(v.object({
      url: v.string(),
      name: v.string(),
      uploadedAt: v.number(),
    })),
    documentAcknowledgments: v.array(v.object({
      documentId: v.id("documents"),
      acknowledgedAt: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("onboarding")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!existing) {
      throw new Error("No onboarding record found. Complete Step 1 first.");
    }

    const now = Date.now();

    await ctx.db.patch(existing._id, {
      usaLacrosseId: args.usaLacrosseId,
      certifications: args.certifications,
      documentAcknowledgments: args.documentAcknowledgments,
      submittedAt: now,
    });

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (user) {
      await ctx.db.patch(user._id, {
        onboardStatus: "submitted",
        updatedAt: now,
      });
    }
  },
});

// ── Approval ──────────────────────────────────────────────────────────────────

export const approveUser = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const now = Date.now();

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (!user) throw new Error(`User not found: ${clerkId}`);
    await ctx.db.patch(user._id, { onboardStatus: "done", updatedAt: now });

    const onboarding = await ctx.db
      .query("onboarding")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (onboarding) {
      await ctx.db.patch(onboarding._id, { approvedAt: now });
    }
  },
});

// ── Season Config ─────────────────────────────────────────────────────────────

export const updateSeasonConfig = mutation({
  args: {
    activeGameAgeGroups: v.array(v.union(
      v.literal("08U"),
      v.literal("10U"),
      v.literal("12U"),
      v.literal("14U"),
    )),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("seasonConfig").first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        activeGameAgeGroups: args.activeGameAgeGroups,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("seasonConfig", {
        activeGameAgeGroups: args.activeGameAgeGroups,
        updatedAt: now,
      });
    }
  },
});
