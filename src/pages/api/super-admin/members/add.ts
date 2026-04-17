import type { APIRoute } from "astro";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

export const POST: APIRoute = async ({ request, locals }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
  }

  // Allow super_admin or tenant admin
  const isSuperAdmin = locals.platformUser?.platformRole === "super_admin";
  const isTenantAdmin = locals.membership?.tenantRole === "admin" || locals.isImpersonating;
  if (!isSuperAdmin && !isTenantAdmin) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
  }

  let body: { tenantId?: string; clerkId?: string; tenantRole?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const validRoles = ["admin", "coach", "parent"] as const;
  type TenantRole = typeof validRoles[number];

  if (!body.tenantId || !body.clerkId || !body.tenantRole) {
    return new Response(JSON.stringify({ error: "tenantId, clerkId, and tenantRole are required" }), { status: 400 });
  }
  if (!validRoles.includes(body.tenantRole as TenantRole)) {
    return new Response(JSON.stringify({ error: "Invalid role. Must be admin, coach, or parent." }), { status: 400 });
  }

  try {
    const client = new ConvexHttpClient(import.meta.env.PUBLIC_CONVEX_URL);
    const id = await client.mutation(api.tenantMembers.addMember, {
      tenantId: body.tenantId as Id<"tenants">,
      clerkId: body.clerkId,
      tenantRole: body.tenantRole as TenantRole,
    });
    return new Response(JSON.stringify({ success: true, id }), { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 409 });
  }
};
