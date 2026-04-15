import { v } from "convex/values";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const createTask = mutation({
  args: {
    clientId: v.id("clients"),
    title: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, { clientId, title, createdBy }) => {
    return ctx.db.insert("tasks", {
      clientId,
      title,
      status: "todo",
      createdAt: Date.now(),
      createdBy,
    });
  },
});

export const updateStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(
      v.literal("todo"),
      v.literal("pending"),
      v.literal("done"),
    ),
  },
  handler: async (ctx, { taskId, status }) => {
    await ctx.db.patch(taskId, { status });

    if (status === "pending") {
      await ctx.scheduler.runAfter(0, internal.emails.sendPendingNotification, {
        taskId,
      });
    }
  },
});

export const updateTask = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    resources: v.optional(v.array(v.object({ label: v.string(), url: v.string() }))),
  },
  handler: async (ctx, { taskId, title, resources }) => {
    const patch: Partial<{ title: string; resources: { label: string; url: string }[] }> = {};
    if (title !== undefined) patch.title = title;
    if (resources !== undefined) patch.resources = resources;
    return ctx.db.patch(taskId, patch);
  },
});

// Internal query used by the email action to look up task details
export const getTask = internalQuery({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => ctx.db.get(taskId),
});

// Internal mutation called by the Stripe webhook when invoice.paid fires
export const handleInvoicePaid = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    stripeInvoiceId: v.string(),
    amountPaid: v.number(),
    currency: v.string(),
    paidAt: v.number(),
  },
  handler: async (ctx, { stripeCustomerId, stripeInvoiceId, amountPaid, currency, paidAt }) => {
    // Find the client by Stripe customer ID
    const client = await ctx.db
      .query("clients")
      .filter((q) => q.eq(q.field("stripeCustomerId"), stripeCustomerId))
      .first();

    if (!client) return;

    // Store the invoice record
    await ctx.db.insert("invoices", {
      clientId: client._id,
      stripeInvoiceId,
      amountPaid,
      currency,
      paidAt,
    });

    // Mark all pending tasks for this client as done
    const pendingTasks = await ctx.db
      .query("tasks")
      .withIndex("by_client_and_status", (q) =>
        q.eq("clientId", client._id).eq("status", "pending"),
      )
      .collect();

    await Promise.all(
      pendingTasks.map((task) => ctx.db.patch(task._id, { status: "done" })),
    );
  },
});
