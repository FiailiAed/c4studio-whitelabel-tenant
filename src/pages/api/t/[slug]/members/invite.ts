import type { APIRoute } from "astro";
import { createClerkClient } from "@clerk/backend";
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

  // Admin check: super_admin always allowed; otherwise verify tenant admin membership
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

  let body: { email?: string; firstName?: string; lastName?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { email, firstName, lastName, role } = body;
  if (!email || !role) {
    return new Response(JSON.stringify({ error: "email and role are required" }), { status: 400 });
  }
  if (!["admin", "coach", "parent"].includes(role)) {
    return new Response(JSON.stringify({ error: "Invalid role" }), { status: 400 });
  }

  const token = crypto.randomUUID();
  const origin = new URL(request.url).origin;
  const redirectUrl = `${origin}/t/${slug}/join/${token}`;

  try {
    const clerk = createClerkClient({ secretKey: import.meta.env.CLERK_SECRET_KEY });
    const invitation = await clerk.invitations.createInvitation({
      emailAddress: email,
      redirectUrl,
      publicMetadata: { firstName, lastName },
    });

    await convex.mutation(api.tenantInvites.createInvite, {
      tenantId: tenant._id,
      token,
      role: role as TenantRole,
      type: "email",
      email,
      clerkInvitationId: invitation.id,
      expiresAt: Date.now() + SEVEN_DAYS,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
