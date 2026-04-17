import type { APIRoute } from "astro";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

type TenantRole = "admin" | "coach" | "parent";

export const POST: APIRoute = async ({ request, locals, params }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const slug = params.slug;
  if (!slug) {
    return new Response(JSON.stringify({ error: "Missing slug" }), { status: 400 });
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

  let body: { role?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { role } = body;
  if (!role || !["admin", "coach", "parent"].includes(role)) {
    return new Response(JSON.stringify({ error: "Valid role is required (admin, coach, parent)" }), { status: 400 });
  }

  const token = crypto.randomUUID();
  const origin = new URL(request.url).origin;
  const url = `${origin}/t/${slug}/join/${token}`;

  try {
    await convex.mutation(api.tenantInvites.createInvite, {
      tenantId: tenant._id,
      token,
      role: role as TenantRole,
      type: "link",
      expiresAt: Date.now() + SEVEN_DAYS,
    });

    return new Response(JSON.stringify({ success: true, url }), { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
