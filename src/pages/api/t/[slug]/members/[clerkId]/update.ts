import type { APIRoute } from "astro";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

type TenantRole = "admin" | "coach" | "parent";

export const POST: APIRoute = async ({ request, locals, params }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { slug, clerkId } = params;
  if (!slug || !clerkId) {
    return new Response(JSON.stringify({ error: "Missing slug or clerkId" }), { status: 400 });
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

  let body: { tenantRole?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { tenantRole, status } = body;
  if (tenantRole && !["admin", "coach", "parent"].includes(tenantRole)) {
    return new Response(JSON.stringify({ error: "Invalid role" }), { status: 400 });
  }
  if (status && !["active", "inactive", "invited"].includes(status)) {
    return new Response(JSON.stringify({ error: "Invalid status" }), { status: 400 });
  }

  try {
    await convex.mutation(api.tenantMembers.updateMemberRole, {
      tenantId: tenant._id,
      clerkId,
      tenantRole: tenantRole as TenantRole | undefined,
      status: status as "active" | "inactive" | "invited" | undefined,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
