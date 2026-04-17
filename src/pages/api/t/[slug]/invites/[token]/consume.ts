import type { APIRoute } from "astro";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

export const POST: APIRoute = async ({ locals, params }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { token } = params;
  if (!token) {
    return new Response(JSON.stringify({ error: "Missing token" }), { status: 400 });
  }

  const convex = new ConvexHttpClient(import.meta.env.PUBLIC_CONVEX_URL);
  const authToken = await locals.auth().getToken({ template: "convex" });
  if (authToken) convex.setAuth(authToken);

  try {
    const invite = await convex.query(api.tenantInvites.getByToken, { token });
    if (!invite) {
      return new Response(JSON.stringify({ error: "Invite not found" }), { status: 404 });
    }
    if (invite.status !== "pending") {
      return new Response(JSON.stringify({ error: "Invite already used or revoked" }), { status: 409 });
    }
    if (invite.expiresAt < Date.now()) {
      return new Response(JSON.stringify({ error: "Invite has expired" }), { status: 410 });
    }

    await convex.mutation(api.tenantMembers.addMember, {
      tenantId: invite.tenantId,
      clerkId: userId,
      tenantRole: invite.role,
    });

    await convex.mutation(api.tenantInvites.consumeInvite, { token });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("already a member")) {
      return new Response(JSON.stringify({ success: true, alreadyMember: true }), { status: 200 });
    }
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
