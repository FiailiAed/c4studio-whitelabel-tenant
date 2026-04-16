import { v } from "convex/values";
import { query } from "./_generated/server";

export const getBoard = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const clients = await ctx.db
      .query("clients")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .order("asc")
      .collect();

    return await Promise.all(
      clients.map(async (client) => {
        const tasks = await ctx.db
          .query("tasks")
          .withIndex("by_client", (q) => q.eq("clientId", client._id))
          .order("asc")
          .collect();
        return { ...client, tasks };
      }),
    );
  },
});

export const getClientBoard = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const client = await ctx.db.get(args.clientId);
    if (!client) return null;

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .order("asc")
      .collect();

    return { ...client, tasks };
  },
});
