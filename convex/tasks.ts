import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const createTask = mutation({
  args: {
    clientId: v.id("clients"),
    tenantId: v.id("tenants"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const now = Date.now();
    return await ctx.db.insert("tasks", {
      ...args,
      status: "todo",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateTaskStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(v.literal("todo"), v.literal("pending"), v.literal("done")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    await ctx.db.patch(args.taskId, { status: args.status, updatedAt: Date.now() });
  },
});

export const deleteTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    await ctx.db.delete(args.taskId);
  },
});
