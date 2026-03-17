import { internalMutation } from "./_generated/server";

/**
 * Renames all records that use the old "speed_series" section/station value
 * to the new "3v3_combat" value. Covers plan_drills, staff_assignments, drills,
 * reps_log, and player_reps_log.
 *
 * Run once from the Convex dashboard before removing speed_series from sectionValidator.
 * After this runs successfully, remove v.literal("speed_series") from sectionValidator
 * in convex/schema.ts and redeploy.
 */
export const renameSectionSpeedSeries = internalMutation({
  args: {},
  handler: async (ctx) => {
    let planDrillsUpdated = 0;
    let assignmentsUpdated = 0;
    let drillsUpdated = 0;
    let repsLogUpdated = 0;
    let playerRepsLogUpdated = 0;

    // Update plan_drills
    const allPlanDrills = await ctx.db.query("plan_drills").collect();
    for (const pd of allPlanDrills) {
      if ((pd.section as string) === "speed_series") {
        await ctx.db.patch(pd._id, { section: "3v3_combat" });
        planDrillsUpdated++;
      }
    }

    // Update staff_assignments
    const allAssignments = await ctx.db.query("staff_assignments").collect();
    for (const a of allAssignments) {
      if ((a.station as string) === "speed_series") {
        await ctx.db.patch(a._id, { station: "3v3_combat" });
        assignmentsUpdated++;
      }
    }

    // Update drills.defaultSection
    const allDrills = await ctx.db.query("drills").collect();
    for (const d of allDrills) {
      if ((d.defaultSection as string | undefined) === "speed_series") {
        await ctx.db.patch(d._id, { defaultSection: "3v3_combat" });
        drillsUpdated++;
      }
    }

    // Update reps_log
    const allRepsLog = await ctx.db.query("reps_log").collect();
    for (const r of allRepsLog) {
      if ((r.station as string) === "speed_series") {
        await ctx.db.patch(r._id, { station: "3v3_combat" });
        repsLogUpdated++;
      }
    }

    // Update player_reps_log
    const allPlayerRepsLog = await ctx.db.query("player_reps_log").collect();
    for (const r of allPlayerRepsLog) {
      if ((r.station as string) === "speed_series") {
        await ctx.db.patch(r._id, { station: "3v3_combat" });
        playerRepsLogUpdated++;
      }
    }

    return { planDrillsUpdated, assignmentsUpdated, drillsUpdated, repsLogUpdated, playerRepsLogUpdated };
  },
});

/**
 * Migrates onboarding records from the old 2-step schema (positions, ageGroups)
 * to the new 4-step schema (practicePositions, practiceAgeGroups, etc.).
 *
 * Also seeds the seasonConfig table with default active game age groups.
 *
 * Run once from the Convex dashboard:
 *   npx convex run migrations:migrateOnboardingV2
 */
export const migrateOnboardingV2 = internalMutation({
  args: {},
  handler: async (ctx) => {
    let recordsMigrated = 0;
    let seasonConfigSeeded = false;

    const allOnboarding = await ctx.db.query("onboarding").collect();

    for (const record of allOnboarding) {
      const updates: Record<string, unknown> = {};

      // Set default volunteerType if missing
      if (!record.volunteerType) {
        updates.volunteerType = "adult_volunteer";
      }

      // Map old positions → practicePositions (best-effort)
      if (record.positions && record.positions.length > 0 && !record.practicePositions) {
        const positionMap: Record<string, string> = {
          head_coach:      "coach",
          assistant_coach: "coach",
          trainer:         "coach",
          practice_helper: "helper",
          game_day_helper: "helper",
          scorekeeper:     "helper",
          media_team:      "media",
        };
        const mapped = record.positions
          .map((p) => positionMap[p])
          .filter((p): p is string => Boolean(p));
        // Deduplicate
        updates.practicePositions = [...new Set(mapped)] as string[];
      }

      // Initialize gamePositions if missing
      if (!record.gamePositions) {
        updates.gamePositions = [];
      }

      // Map old ageGroups (U6/U8/U12/U14) → practiceAgeGroups (06U/08U/10U/12U/14U)
      if (record.ageGroups && record.ageGroups.length > 0 && !record.practiceAgeGroups) {
        const ageGroupMap: Record<string, string> = {
          U6:  "06U",
          U8:  "08U",
          U12: "12U",
          U14: "14U",
        };
        const mapped = record.ageGroups
          .map((ag) => ageGroupMap[ag as string])
          .filter((ag): ag is string => Boolean(ag));
        updates.practiceAgeGroups = mapped;
      }

      // Initialize gameAgeGroups if missing
      if (!record.gameAgeGroups) {
        updates.gameAgeGroups = [];
      }

      // Set currentStep based on completion state
      if (!record.currentStep) {
        if (record.submittedAt) {
          // Completed old 2-step flow — treat as having done Steps 1–3 of new flow
          updates.currentStep = 3;
        } else if (record.positions && record.positions.length > 0) {
          // Completed old Step 1 → new Step 1
          updates.currentStep = 1;
        }
      }

      if (Object.keys(updates).length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await ctx.db.patch(record._id, updates as any);
        recordsMigrated++;
      }
    }

    // Seed seasonConfig if it doesn't exist
    const existingConfig = await ctx.db.query("seasonConfig").first();
    if (!existingConfig) {
      await ctx.db.insert("seasonConfig", {
        activeGameAgeGroups: ["10U", "12U"],
        updatedAt: Date.now(),
      });
      seasonConfigSeeded = true;
    }

    return { recordsMigrated, seasonConfigSeeded };
  },
});
