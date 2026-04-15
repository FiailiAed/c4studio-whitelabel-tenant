import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

export const createInvoice = action({
  args: {
    clientId: v.id("clients"),
    amountCents: v.number(),
    description: v.string(),
  },
  handler: async (ctx, { clientId, amountCents, description }) => {
    const client = await ctx.runQuery(api.clients.getClient, { clientId });
    if (!client?.stripeCustomerId) {
      throw new Error("No Stripe customer linked to this client.");
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not set in Convex environment.");
    }

    // Create invoice item
    const itemRes = await fetch("https://api.stripe.com/v1/invoiceitems", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        customer: client.stripeCustomerId,
        amount: String(amountCents),
        currency: "usd",
        description,
      }),
    });

    if (!itemRes.ok) {
      const err = await itemRes.json();
      throw new Error(err?.error?.message ?? "Failed to create invoice item.");
    }

    // Create invoice
    const invoiceRes = await fetch("https://api.stripe.com/v1/invoices", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        customer: client.stripeCustomerId,
        auto_advance: "true",
        collection_method: "send_invoice",
        days_until_due: "30",
      }),
    });

    if (!invoiceRes.ok) {
      const err = await invoiceRes.json();
      throw new Error(err?.error?.message ?? "Failed to create invoice.");
    }

    const invoice = await invoiceRes.json() as { id: string; hosted_invoice_url: string };

    // Finalize so it can be sent
    const finalizeRes = await fetch(
      `https://api.stripe.com/v1/invoices/${invoice.id}/finalize`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${stripeSecretKey}` },
      },
    );

    if (!finalizeRes.ok) {
      const err = await finalizeRes.json();
      throw new Error(err?.error?.message ?? "Failed to finalize invoice.");
    }

    const finalized = await finalizeRes.json() as { id: string; hosted_invoice_url: string };

    return {
      invoiceId: finalized.id,
      hostedInvoiceUrl: finalized.hosted_invoice_url,
    };
  },
});
