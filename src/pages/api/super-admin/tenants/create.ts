import type { APIRoute } from "astro";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

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

  const { name, slug, primaryColor, logoUrl, customDomain, status } = body as Record<string, string>;
  if (!name || !slug) {
    return new Response(JSON.stringify({ error: "name and slug are required" }), { status: 400 });
  }

  try {
    const client = new ConvexHttpClient(import.meta.env.PUBLIC_CONVEX_URL);
    const id = await client.mutation(api.tenants.createTenant, {
      name,
      slug,
      primaryColor: primaryColor || undefined,
      logoUrl: logoUrl || undefined,
      customDomain: customDomain || undefined,
      status: (status as "active" | "inactive") || "active",
    });
    return new Response(JSON.stringify({ success: true, id }), { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 409 });
  }
};
