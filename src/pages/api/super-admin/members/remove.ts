import type { APIRoute } from "astro";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

export const POST: APIRoute = async ({ request, locals }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
  }

  const isSuperAdmin = locals.platformUser?.platformRole === "super_admin";
  const isTenantAdmin = locals.membership?.tenantRole === "admin" || locals.isImpersonating;
  if (!isSuperAdmin && !isTenantAdmin) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
  }

  let body: { tenantId?: string; clerkId?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  if (!body.tenantId || !body.clerkId) {
    return new Response(JSON.stringify({ error: "tenantId and clerkId are required" }), { status: 400 });
  }

  try {
    const client = new ConvexHttpClient(import.meta.env.PUBLIC_CONVEX_URL);
    await client.mutation(api.tenantMembers.removeMember, {
      tenantId: body.tenantId as Id<"tenants">,
      clerkId: body.clerkId,
    });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 400 });
  }
};
