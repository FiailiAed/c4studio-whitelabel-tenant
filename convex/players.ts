import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** All players linked to a parent (by Convex user _id). */
export const listByParent = query({
  args: { parentId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return ctx.db
      .query("players")
      .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
      .collect();
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const createPlayer = mutation({
  args: {
    parentId: v.id("users"),
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    grade: v.number(),
    usLacrosseNumber: v.optional(v.string()),
    medicalNotes: v.optional(v.string()),
  },
  returns: v.id("players"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return ctx.db.insert("players", args);
  },
});

export const updatePlayer = mutation({
  args: {
    id: v.id("players"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    grade: v.optional(v.number()),
    usLacrosseNumber: v.optional(v.string()),
    medicalNotes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const { id, ...fields } = args;
    const patch: Partial<typeof fields> = {};
    if (fields.firstName !== undefined) patch.firstName = fields.firstName;
    if (fields.lastName !== undefined) patch.lastName = fields.lastName;
    if (fields.dateOfBirth !== undefined) patch.dateOfBirth = fields.dateOfBirth;
    if (fields.grade !== undefined) patch.grade = fields.grade;
    if (fields.usLacrosseNumber !== undefined) patch.usLacrosseNumber = fields.usLacrosseNumber;
    if (fields.medicalNotes !== undefined) patch.medicalNotes = fields.medicalNotes;

    await ctx.db.patch(id, patch);
    return null;
  },
});
