import type { APIRoute } from "astro";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

export const POST: APIRoute = async ({ request, locals }) => {
  const { userId } = locals.auth();
  if (!userId || locals.platformUser?.platformRole !== "super_admin") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
  }

  const formData = await request.formData();
  const tenantId = formData.get("tenantId")?.toString();
  if (!tenantId) {
    return new Response(JSON.stringify({ error: "tenantId required" }), { status: 400 });
  }

  const secret = import.meta.env.IMPERSONATION_SECRET;
  if (!secret) {
    return new Response(JSON.stringify({ error: "IMPERSONATION_SECRET not configured" }), { status: 500 });
  }

  try {
    // Load tenant to get slug for redirect
    const client = new ConvexHttpClient(import.meta.env.PUBLIC_CONVEX_URL);
    const tenant = await client.query(api.tenants.getTenant, { id: tenantId as Id<"tenants"> });
    if (!tenant) {
      return new Response(JSON.stringify({ error: "Tenant not found" }), { status: 404 });
    }

    // Sign: base64url(tenantId.timestamp) + "." + base64url(signature)
    const timestamp = Date.now();
    const payload = `${tenantId}.${timestamp}`;
    const payloadB64 = btoa(payload).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    const cookieValue = `${payloadB64}.${sigB64}`;

    return new Response(null, {
      status: 302,
      headers: {
        Location: `/t/${tenant.slug}`,
        "Set-Cookie": `impersonating_tenant_id=${cookieValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
