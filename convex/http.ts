import { httpRouter } from "convex/server";
import { components, internal } from "./_generated/api";
import { registerRoutes } from "@convex-dev/stripe";
import type Stripe from "stripe";

const http = httpRouter();

/**
 * Register Stripe webhook handler.
 * Endpoint: https://<your-deployment>.convex.site/stripe/webhook
 * Add this URL in the Stripe Dashboard → Developers → Webhooks.
 */
registerRoutes(http, components.stripe, {
  webhookPath: "/stripe/webhook",
  events: {
    "checkout.session.completed": async (
      ctx,
      event: Stripe.CheckoutSessionCompletedEvent,
    ) => {
      const session = event.data.object;
      if (!session.id) return;

      await ctx.runMutation(internal.registrations.fulfillRegistration, {
        stripeCheckoutSessionId: session.id,
      });
    },
  },
});

export default http;
