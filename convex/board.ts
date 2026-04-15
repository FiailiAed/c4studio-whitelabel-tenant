import { v } from "convex/values";
import { query } from "./_generated/server";

export const getBoard = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    return Promise.all(
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
