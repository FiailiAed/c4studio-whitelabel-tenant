import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createClient = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
    abbrev: v.string(),
    themeColor: v.string(),
  },
  handler: async (ctx, { tenantId, name, abbrev, themeColor }) => {
    return ctx.db.insert("clients", {
      tenantId,
      name,
      abbrev,
      themeColor,
    });
  },
});

export const getClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, { clientId }) => ctx.db.get(clientId),
});

export const listClientTasks = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, { clientId }) => {
    return ctx.db
      .query("tasks")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .order("desc")
      .collect();
  },
});

export const listClientInvoices = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, { clientId }) => {
    return ctx.db
      .query("invoices")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .order("desc")
      .collect();
  },
});
