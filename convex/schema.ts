import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Shared validators — reused across multiple tables
const ageGroupValidator = v.union(
  v.literal("U6"),
  v.literal("U8"),
  v.literal("U12"),
  v.literal("U14"),
);

const dayOfWeekValidator = v.union(
  v.literal("monday"),
  v.literal("wednesday"),
  v.literal("friday"),
  v.literal("saturday"),
);

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

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    role: v.union(
      v.literal("user"),  // coaches, trainers, volunteers
      v.literal("admin")  // directors, board members, developers
    ),
    onboardStatus: v.optional(v.union(
      v.literal("pending"),     // Onboarding not started
      v.literal("in_progress"), // Onboarding step 1 complete
      v.literal("submitted"),   // All steps complete, awaiting admin approval
      v.literal("done")         // Admin approved
    )),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  onboarding: defineTable({
    clerkId: v.string(),

    // ── Legacy Step 1 fields (optional; kept for migration compat) ────────────
    positions: v.optional(v.array(v.string())),
    ageGroups: v.optional(v.array(v.string())),
    // NOTE: migrated from v.array(v.id("events")) → v.array(dayOfWeekValidator)
    // Schema accepts v.string() to keep legacy documents valid.
    practiceAvailability: v.optional(v.array(v.string())),
    practiceAvailabilityEventIds: v.optional(v.array(v.id("events"))),

    // ── Step 1: Background Info ───────────────────────────────────────────────
    volunteerType: v.optional(v.union(
      v.literal("parent_volunteer"),
      v.literal("high_school_player"),
      v.literal("adult_volunteer"),
    )),
    playingExperience: v.optional(v.object({
      yearsPlayed: v.number(),
      highestLevel: v.union(
        v.literal("none"),
        v.literal("youth"),
        v.literal("high_school"),
        v.literal("college"),
        v.literal("pro"),
      ),
    })),
    coachingExperience: v.optional(v.array(v.object({
      sport: v.string(),
      years: v.number(),
    }))),

    // ── Step 2: Practice Availability ────────────────────────────────────────
    practicePositions: v.optional(v.array(v.union(
      v.literal("coach"),
      v.literal("defensive_trainer"),
      v.literal("offensive_trainer"),
      v.literal("goalie_trainer"),
      v.literal("helper"),
      v.literal("media"),
    ))),
    practiceAgeGroups: v.optional(v.array(v.union(
      v.literal("06U"),
      v.literal("08U"),
      v.literal("10U"),
      v.literal("12U"),
      v.literal("14U"),
    ))),
    // practiceDays stored separately from practiceAvailability (legacy)
    practiceDays: v.optional(v.array(v.union(
      v.literal("monday"),
      v.literal("wednesday"),
      v.literal("friday"),
    ))),

    // ── Step 3: Game Availability ─────────────────────────────────────────────
    gamePositions: v.optional(v.array(v.union(
      v.literal("head_coach"),
      v.literal("assistant_coach"),
      v.literal("goalie_coach"),
      v.literal("parent_coach"),
      v.literal("scorekeeper"),
      v.literal("media_team"),
      v.literal("game_day_helper"),
    ))),
    gameAgeGroups: v.optional(v.array(v.union(
      v.literal("08U"),
      v.literal("10U"),
      v.literal("12U"),
      v.literal("14U"),
    ))),
    gameAvailability: v.optional(v.array(v.union(
      v.literal("9am"),
      v.literal("10am"),
      v.literal("11am"),
      v.literal("12pm"),
      v.literal("1pm"),
      v.literal("2pm"),
    ))),

    // ── Step 4: Compliance ────────────────────────────────────────────────────
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
    submittedAt: v.optional(v.number()),
    approvedAt: v.optional(v.number()),

    // ── Progress tracking ─────────────────────────────────────────────────────
    currentStep: v.optional(v.number()), // 1–4
  }).index("by_clerk_id", ["clerkId"]),

  // ─── Season Config (single document) ─────────────────────────────────────
  seasonConfig: defineTable({
    activeGameAgeGroups: v.array(v.union(
      v.literal("08U"),
      v.literal("10U"),
      v.literal("12U"),
      v.literal("14U"),
    )),
    updatedAt: v.number(),
  }),

  events: defineTable({
    title: v.string(),
    date: v.number(),               // Unix ms timestamp
    type: v.union(
      v.literal("practice"),            // legacy — treat as program_training when reading
      v.literal("program_training"),    // all age groups together
      v.literal("individual_practice"), // one age group only
      v.literal("game"),
      v.literal("other"),
      v.literal("speed_series"),        // shared stations, no per-age-group split
      v.literal("shootaround"),         // flat drill list + playlist URL
      v.literal("team_practice"),       // per-age-group team sections
      v.literal("scrimmage"),           // game type — uses checklist
      v.literal("festival"),            // game type — uses checklist
    ),
    targetAgeGroup: v.optional(ageGroupValidator), // only used when type = individual_practice
    location: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),       // default 90 min
    notes: v.optional(v.string()),
    published: v.optional(v.boolean()),            // default false; requires attached plan
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  documents: defineTable({
    title: v.string(),
    content: v.string(),   // markdown text shown to user
    version: v.number(),
    isActive: v.boolean(),
    fileUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  // ─── Drill Library ───────────────────────────────────────────────────────────
  drills: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    defaultSection: v.optional(sectionValidator),
    suitableAgeGroups: v.optional(v.array(ageGroupValidator)),
    defaultDurationMinutes: v.number(),
    repsPerMinute: v.number(),
    diagramSvg: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  // ─── Practice Plans ───────────────────────────────────────────────────────────
  practice_plans: defineTable({
    name: v.string(),
    isTemplate: v.boolean(),
    eventId: v.optional(v.id("events")), // absent when isTemplate = true
    notes: v.optional(v.string()),
    playlistUrl: v.optional(v.string()), // for shootaround events
    createdBy: v.string(),               // clerkId of the admin who created it
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_template", ["isTemplate"]),

  // ─── Plan Drills (line items) ─────────────────────────────────────────────────
  plan_drills: defineTable({
    planId: v.id("practice_plans"),
    drillId: v.id("drills"),
    section: sectionValidator,
    ageGroup: v.optional(ageGroupValidator), // absent = applies to all (stretch/warmup)
    order: v.number(),                       // position within section+ageGroup
    durationMinutes: v.number(),             // may override drill default
    repsOverride: v.optional(v.number()),    // manual override for special cases
    playerCountAtStation: v.optional(v.number()), // for perPlayerReps calculation
    notes: v.optional(v.string()),
  })
    .index("by_plan", ["planId"])
    .index("by_plan_section", ["planId", "section"])
    .index("by_drill", ["drillId"]),

  // ─── Staff Assignments ────────────────────────────────────────────────────────
  staff_assignments: defineTable({
    eventId: v.id("events"),
    clerkId: v.string(),  // assigned staff member's Clerk ID
    station: sectionValidator,
    ageGroup: v.optional(ageGroupValidator), // required for split stations
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_clerk", ["clerkId"])
    .index("by_event_station", ["eventId", "station"]),

  // ─── Players ─────────────────────────────────────────────────────────────────
  players: defineTable({
    name: v.string(),
    jerseyNumber: v.optional(v.number()),
    ageGroup: ageGroupValidator,
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_age_group", ["ageGroup"])
    .index("by_active", ["isActive"]),

  // ─── Event RSVP ───────────────────────────────────────────────────────────────
  event_rsvp: defineTable({
    eventId: v.id("events"),
    clerkId: v.string(),
    status: v.union(
      v.literal("confirmed"),
      v.literal("declined"),
      v.literal("maybe"),
    ),
    updatedAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_clerk", ["clerkId"])
    .index("by_event_clerk", ["eventId", "clerkId"]),

  // ─── Reps Log (station-level) ─────────────────────────────────────────────────
  reps_log: defineTable({
    eventId: v.id("events"),
    clerkId: v.string(),
    drillId: v.id("drills"),
    station: sectionValidator,
    ageGroup: v.optional(ageGroupValidator),
    totalRepsCompleted: v.number(),
    notes: v.optional(v.string()),
    loggedAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_clerk", ["clerkId"])
    .index("by_event_clerk", ["eventId", "clerkId"]),

  // ─── Game Day Checklists ──────────────────────────────────────────────────────
  game_checklists: defineTable({
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
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_event", ["eventId"]),

  // ─── Player Reps Log ──────────────────────────────────────────────────────────
  player_reps_log: defineTable({
    eventId: v.id("events"),
    clerkId: v.string(),
    playerId: v.id("players"),
    drillId: v.id("drills"),
    station: sectionValidator,
    repsCompleted: v.number(),
    loggedAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_player", ["playerId"])
    .index("by_event_clerk", ["eventId", "clerkId"]),
});
