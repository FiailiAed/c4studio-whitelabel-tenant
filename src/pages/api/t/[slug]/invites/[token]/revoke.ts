import type { APIRoute } from "astro";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

export const POST: APIRoute = async ({ locals, params }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { slug, token } = params;
  if (!slug || !token) {
    return new Response(JSON.stringify({ error: "Missing slug or token" }), { status: 400 });
  }

  const convex = new ConvexHttpClient(import.meta.env.PUBLIC_CONVEX_URL);
  const authToken = await locals.auth().getToken({ template: "convex" });
  if (authToken) convex.setAuth(authToken);

  const tenant = await convex.query(api.tenants.getTenantBySlug, { slug });
  if (!tenant) {
    return new Response(JSON.stringify({ error: "Tenant not found" }), { status: 404 });
  }

  const isSuperAdmin = locals.platformUser?.platformRole === "super_admin";
  if (!isSuperAdmin) {
    const membership = await convex.query(api.tenantMembers.getMembership, {
      tenantId: tenant._id,
      clerkId: userId,
    });
    if (membership?.tenantRole !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403 });
    }
  }

  try {
    await convex.mutation(api.tenantInvites.revokeInvite, { token });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
