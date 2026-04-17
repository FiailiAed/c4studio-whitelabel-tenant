/**
 * Convex authentication configuration.
 * Tells Convex to accept JWTs issued by Clerk.
 *
 * The domain is derived from your Clerk publishable key.
 * To find it: Clerk Dashboard → Configure → API Keys → "Issuer" URL
 */
export default {
  providers: [
    {
      domain: "https://nearby-yak-3.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
