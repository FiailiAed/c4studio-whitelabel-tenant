import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id, Doc } from "./_generated/dataModel";
import type Stripe from "stripe";

// ---------------------------------------------------------------------------
// Public Queries
// ---------------------------------------------------------------------------

/** Parent's own registrations with joined program name and player name. */
export const getParentRegistrations = query({
  args: { parentId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const regs = await ctx.db
      .query("registrations")
      .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
      .collect();

    const rows = await Promise.all(
      regs.map(async (reg) => {
        const [player, program] = await Promise.all([
          ctx.db.get(reg.playerId),
          ctx.db.get(reg.programId),
        ]);
        return {
          id: reg._id,
          status: reg.status,
          playerName: player
            ? `${player.firstName} ${player.lastName}`
            : "Unknown",
          programName: program?.name ?? "Unknown",
        };
      }),
    );
    return rows;
  },
});

// ---------------------------------------------------------------------------
// Internal Queries
// ---------------------------------------------------------------------------

/** Check for an existing non-refunded registration for a player + program. */
export const checkDuplicate = internalQuery({
  args: {
    programId: v.id("programs"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("registrations")
      .withIndex("by_program", (q) => q.eq("programId", args.programId))
      .filter((q) =>
        q.and(
          q.eq(q.field("playerId"), args.playerId),
          q.neq(q.field("status"), "REFUNDED"),
        ),
      )
      .first();
  },
});

export const getProgramById = internalQuery({
  args: { programId: v.id("programs") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.programId);
  },
});

// ---------------------------------------------------------------------------
// Action: create registration + Stripe checkout session
// ---------------------------------------------------------------------------

export const createRegistrationAndCheckout = action({
  args: {
    tenantId: v.id("tenants"),
    programId: v.id("programs"),
    playerId: v.id("players"),
    parentId: v.id("users"),
    siteUrl: v.string(),
    tenantSlug: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Block duplicate PAID registrations
    const duplicate = await ctx.runQuery(internal.registrations.checkDuplicate, {
      programId: args.programId,
      playerId: args.playerId,
    });
    if (duplicate?.status === "PAID") {
      throw new Error(
        "This player is already registered and paid for this program.",
      );
    }

    // Fetch program
    const program = (await ctx.runQuery(internal.registrations.getProgramById, {
      programId: args.programId,
    })) as Doc<"programs"> | null;
    if (!program) throw new Error("Program not found.");
    if (program.status !== "ACTIVE") {
      throw new Error("This program is not open for registration.");
    }

    // Create PENDING_PAYMENT registration
    const registrationId = (await ctx.runMutation(
      internal.registrations.createPendingRegistration,
      {
        tenantId: args.tenantId,
        programId: args.programId,
        playerId: args.playerId,
        parentId: args.parentId,
      },
    )) as Id<"registrations">;

    // Create Stripe Checkout Session with inline price_data
    const StripeSDK = (await import("stripe")).default;
    const stripeClient = new StripeSDK(process.env.STRIPE_SECRET_KEY!);

    const session = (await stripeClient.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: program.priceInCents,
            product_data: { name: program.name },
          },
          quantity: 1,
        },
      ],
      metadata: {
        registrationId,
        tenantId: args.tenantId,
        tenantSlug: args.tenantSlug,
        parentClerkId: identity.subject,
      },
      success_url: `${args.siteUrl}/t/${args.tenantSlug}/regs?success=true`,
      cancel_url: `${args.siteUrl}/t/${args.tenantSlug}/register/${args.programId}?canceled=true`,
    })) as Stripe.Checkout.Session;

    if (!session.url) throw new Error("Stripe did not return a checkout URL.");

    // Attach the Stripe session ID for webhook lookup
    await ctx.runMutation(internal.registrations.setCheckoutSession, {
      registrationId,
      stripeCheckoutSessionId: session.id,
    });

    return session.url;
  },
});

// ---------------------------------------------------------------------------
// Internal Mutations
// ---------------------------------------------------------------------------

export const createPendingRegistration = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    programId: v.id("programs"),
    playerId: v.id("players"),
    parentId: v.id("users"),
  },
  returns: v.id("registrations"),
  handler: async (ctx, args) => {
    return ctx.db.insert("registrations", {
      ...args,
      status: "PENDING_PAYMENT",
    });
  },
});

export const setCheckoutSession = internalMutation({
  args: {
    registrationId: v.id("registrations"),
    stripeCheckoutSessionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.registrationId, {
      stripeCheckoutSessionId: args.stripeCheckoutSessionId,
    });
    return null;
  },
});

/**
 * Called by the Stripe webhook (checkout.session.completed).
 * Marks the registration PAID and auto-adds the parent as a tenant member.
 */
export const fulfillRegistration = internalMutation({
  args: { stripeCheckoutSessionId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const registration = await ctx.db
      .query("registrations")
      .withIndex("by_checkout_session", (q) =>
        q.eq("stripeCheckoutSessionId", args.stripeCheckoutSessionId),
      )
      .first();

    if (!registration) return null;
    if (registration.status === "PAID") return null; // idempotent

    await ctx.db.patch(registration._id, { status: "PAID" });

    // Auto-enroll parent as tenant member with role "parent"
    const parent = await ctx.db.get(registration.parentId);
    if (!parent) return null;

    const existingMember = await ctx.db
      .query("tenant_members")
      .withIndex("by_tenant_and_clerk", (q) =>
        q
          .eq("tenantId", registration.tenantId)
          .eq("clerkId", parent.clerkId),
      )
      .first();

    if (!existingMember) {
      await ctx.db.insert("tenant_members", {
        tenantId: registration.tenantId,
        clerkId: parent.clerkId,
        tenantRole: "parent",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});
