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

export const getPlanForEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const plan = await ctx.db
      .query("practice_plans")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .first();
    if (!plan) return null;

    const drills = await ctx.db
      .query("plan_drills")
      .withIndex("by_plan", (q) => q.eq("planId", plan._id))
      .collect();

    // Join with drill details so the UI has repsPerMinute etc.
    const drillsWithDetails = await Promise.all(
      drills.map(async (pd) => {
        const drill = await ctx.db.get(pd.drillId);
        return { ...pd, drill };
      })
    );

    return { plan, drills: drillsWithDetails };
  },
});

export const listTemplates = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("practice_plans")
      .withIndex("by_template", (q) => q.eq("isTemplate", true))
      .collect();
  },
});

export const createPlan = mutation({
  args: {
    name: v.string(),
    isTemplate: v.boolean(),
    eventId: v.optional(v.id("events")),
    notes: v.optional(v.string()),
    playlistUrl: v.optional(v.string()),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("practice_plans", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updatePlan = mutation({
  args: {
    id: v.id("practice_plans"),
    name: v.optional(v.string()),
    notes: v.optional(v.string()),
    playlistUrl: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});

export const updatePlanDrillsBatch = mutation({
  args: {
    updates: v.array(v.object({
      planDrillId: v.id("plan_drills"),
      durationMinutes: v.number(),
      playerCountAtStation: v.optional(v.number()),
      repsOverride: v.optional(v.number()),
    })),
  },
  handler: async (ctx, { updates }) => {
    for (const { planDrillId, durationMinutes, playerCountAtStation, repsOverride } of updates) {
      await ctx.db.patch(planDrillId, {
        durationMinutes,
        playerCountAtStation,
        repsOverride,
      });
    }
    return { updated: updates.length };
  },
});

export const addDrillToPlan = mutation({
  args: {
    planId: v.id("practice_plans"),
    drillId: v.id("drills"),
    section: sectionValidator,
    ageGroup: v.optional(ageGroupValidator),
    durationMinutes: v.number(),
    playerCountAtStation: v.optional(v.number()),
    repsOverride: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Determine insertion order by counting existing drills in same section+ageGroup
    const allInPlan = await ctx.db
      .query("plan_drills")
      .withIndex("by_plan", (q) => q.eq("planId", args.planId))
      .collect();

    const sameGroup = allInPlan.filter(
      (d) => d.section === args.section && d.ageGroup === args.ageGroup
    );
    const order = sameGroup.length;

    return await ctx.db.insert("plan_drills", { ...args, order });
  },
});

export const removeDrillFromPlan = mutation({
  args: { planDrillId: v.id("plan_drills") },
  handler: async (ctx, { planDrillId }) => {
    await ctx.db.delete(planDrillId);
  },
});

export const applyTemplate = mutation({
  args: {
    templateId: v.id("practice_plans"),
    targetEventId: v.id("events"),
    createdBy: v.string(),
  },
  handler: async (ctx, { templateId, targetEventId, createdBy }) => {
    const template = await ctx.db.get(templateId);
    if (!template) throw new Error("Template not found.");

    // Guard: refuse if the event already has a plan
    const existing = await ctx.db
      .query("practice_plans")
      .withIndex("by_event", (q) => q.eq("eventId", targetEventId))
      .first();
    if (existing) {
      throw new Error(
        "This event already has a practice plan. Remove it before applying a template."
      );
    }

    const now = Date.now();
    const newPlanId = await ctx.db.insert("practice_plans", {
      name: template.name,
      isTemplate: false,
      eventId: targetEventId,
      notes: template.notes,
      createdBy,
      createdAt: now,
      updatedAt: now,
    });

    // Deep-copy all plan drills from the template
    const templateDrills = await ctx.db
      .query("plan_drills")
      .withIndex("by_plan", (q) => q.eq("planId", templateId))
      .collect();

    for (const td of templateDrills) {
      await ctx.db.insert("plan_drills", {
        planId: newPlanId,
        drillId: td.drillId,
        section: td.section,
        ageGroup: td.ageGroup,
        order: td.order,
        durationMinutes: td.durationMinutes,
        repsOverride: td.repsOverride,
        playerCountAtStation: td.playerCountAtStation,
        notes: td.notes,
      });
    }

    return newPlanId;
  },
});

export const saveAsTemplate = mutation({
  args: {
    planId: v.id("practice_plans"),
    templateName: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, { planId, templateName, createdBy }) => {
    const plan = await ctx.db.get(planId);
    if (!plan) throw new Error("Plan not found.");

    const now = Date.now();
    const newTemplateId = await ctx.db.insert("practice_plans", {
      name: templateName,
      isTemplate: true,
      notes: plan.notes,
      createdBy,
      createdAt: now,
      updatedAt: now,
    });

    const drills = await ctx.db
      .query("plan_drills")
      .withIndex("by_plan", (q) => q.eq("planId", planId))
      .collect();

    for (const d of drills) {
      await ctx.db.insert("plan_drills", {
        planId: newTemplateId,
        drillId: d.drillId,
        section: d.section,
        ageGroup: d.ageGroup,
        order: d.order,
        durationMinutes: d.durationMinutes,
        repsOverride: d.repsOverride,
        playerCountAtStation: d.playerCountAtStation,
        notes: d.notes,
      });
    }

    return newTemplateId;
  },
});
