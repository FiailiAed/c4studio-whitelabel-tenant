import type { APIRoute } from "astro";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

export const POST: APIRoute = async ({ request, locals }) => {
  const { userId } = locals.auth();
  if (!userId || locals.platformUser?.platformRole !== "super_admin") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { id, name, slug, primaryColor, logoUrl, customDomain, status } = body as Record<string, string>;
  if (!id) {
    return new Response(JSON.stringify({ error: "id is required" }), { status: 400 });
  }

  try {
    const client = new ConvexHttpClient(import.meta.env.PUBLIC_CONVEX_URL);
    await client.mutation(api.tenants.updateTenant, {
      id: id as Id<"tenants">,
      ...(name ? { name } : {}),
      ...(slug ? { slug } : {}),
      ...(primaryColor ? { primaryColor } : {}),
      ...(logoUrl !== undefined ? { logoUrl: logoUrl || undefined } : {}),
      ...(customDomain !== undefined ? { customDomain: customDomain || undefined } : {}),
      ...(status ? { status: status as "active" | "inactive" } : {}),
    });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 400 });
  }
};
