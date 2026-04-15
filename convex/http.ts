import { httpRouter } from "convex/server";
import { components, internal } from "./_generated/api";
import { registerRoutes } from "@convex-dev/stripe";
import type Stripe from "stripe";

const http = httpRouter();

registerRoutes(http, components.stripe, {
  webhookPath: "/stripe/webhook",
  events: {
    "invoice.paid": async (ctx, event: Stripe.InvoicePaidEvent) => {
      const invoice = event.data.object;
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;

      if (!customerId) return;

      await ctx.runMutation(internal.tasks.handleInvoicePaid, {
        stripeCustomerId: customerId,
        stripeInvoiceId: invoice.id,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        paidAt: invoice.status_transitions?.paid_at
          ? invoice.status_transitions.paid_at * 1000
          : Date.now(),
      });
    },
  },
});

export default http;
