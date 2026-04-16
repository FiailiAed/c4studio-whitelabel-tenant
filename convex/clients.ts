import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const contactSchema = v.object({
  name: v.string(),
  email: v.string(),
  role: v.string(),
  phone: v.string(),
});

export const getClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    return await ctx.db.get(args.clientId);
  },
});

export const createClient = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
    email: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    contacts: v.array(contactSchema),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const now = Date.now();
    return await ctx.db.insert("clients", { ...args, createdAt: now, updatedAt: now });
  },
});

export const updateClient = mutation({
  args: {
    clientId: v.id("clients"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
    priority: v.optional(v.union(v.literal("high"), v.literal("medium"), v.literal("low"))),
    contacts: v.optional(v.array(contactSchema)),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const { clientId, ...fields } = args;
    const updates = Object.fromEntries(
      Object.entries(fields).filter(([, val]) => val !== undefined),
    );
    await ctx.db.patch(clientId, { ...updates, updatedAt: Date.now() });
  },
});

export const addContact = mutation({
  args: {
    clientId: v.id("clients"),
    contact: contactSchema,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error("Client not found");
    await ctx.db.patch(args.clientId, {
      contacts: [...client.contacts, args.contact],
      updatedAt: Date.now(),
    });
  },
});

export const deleteClient = mutation({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect();
    await Promise.all(tasks.map((t) => ctx.db.delete(t._id)));
    await ctx.db.delete(args.clientId);
  },
});
