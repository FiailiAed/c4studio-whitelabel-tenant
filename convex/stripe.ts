import { StripeSubscriptions } from "@convex-dev/stripe";
import { components } from "./_generated/api";

/**
 * Stripe component client.
 * Used for customer management and checkout session creation.
 * The STRIPE_SECRET_KEY env var is read from the Convex dashboard environment.
 */
const stripe = new StripeSubscriptions(components.stripe, {});

export default stripe;
