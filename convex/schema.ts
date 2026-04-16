import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  clients: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    email: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    contacts: v.array(
      v.object({
        name: v.string(),
        email: v.string(),
        role: v.string(),
        phone: v.string(),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_and_status", ["tenantId", "status"]),

  tasks: defineTable({
    clientId: v.id("clients"),
    tenantId: v.id("tenants"),
    title: v.string(),
    status: v.union(v.literal("todo"), v.literal("pending"), v.literal("done")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_and_status", ["tenantId", "status"]),


  tenants: defineTable({
    name: v.string(),
    slug: v.string(),
    customDomain: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_custom_domain", ["customDomain"]),

  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    platformRole: v.union(v.literal("super_admin"), v.literal("user")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  tenant_members: defineTable({
    tenantId: v.id("tenants"),
    clerkId: v.string(),
    tenantRole: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("invited"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_clerk_id", ["clerkId"])
    .index("by_tenant_and_clerk", ["tenantId", "clerkId"]),
});
