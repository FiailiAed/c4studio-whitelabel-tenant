import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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
    tenantRole: v.union(
      v.literal("admin"),
      v.literal("coach"),
      v.literal("parent"),
    ),
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

  tenant_invites: defineTable({
    tenantId: v.id("tenants"),
    token: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("coach"),
      v.literal("parent"),
    ),
    type: v.union(
      v.literal("email"),
      v.literal("link"),
    ),
    email: v.optional(v.string()),
    clerkInvitationId: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("expired"),
      v.literal("revoked"),
    ),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_tenant", ["tenantId"]),

  // --- Registration Engine ---

  programs: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    description: v.optional(v.string()),
    priceInCents: v.number(),
    capacity: v.optional(v.number()),
    status: v.union(v.literal("DRAFT"), v.literal("ACTIVE"), v.literal("CLOSED")),
    stripePriceId: v.optional(v.string()),
  }).index("by_tenant", ["tenantId"]),

  players: defineTable({
    parentId: v.id("users"),
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    grade: v.number(),
    usLacrosseNumber: v.optional(v.string()),
    medicalNotes: v.optional(v.string()),
  }).index("by_parent", ["parentId"]),

  registrations: defineTable({
    tenantId: v.id("tenants"),
    programId: v.id("programs"),
    playerId: v.id("players"),
    parentId: v.id("users"),
    status: v.union(
      v.literal("PENDING_PAYMENT"),
      v.literal("PAID"),
      v.literal("REFUNDED"),
    ),
    stripeCheckoutSessionId: v.optional(v.string()),
  })
    .index("by_program", ["programId"])
    .index("by_tenant", ["tenantId"])
    .index("by_parent", ["parentId"])
    .index("by_checkout_session", ["stripeCheckoutSessionId"]),
});
