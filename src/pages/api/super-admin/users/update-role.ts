import type { APIRoute } from "astro";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

export const POST: APIRoute = async ({ request, locals }) => {
  const { userId } = locals.auth();
  if (!userId || locals.platformUser?.platformRole !== "super_admin") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
  }

  let body: { clerkId?: string; platformRole?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  if (!body.clerkId || !body.platformRole) {
    return new Response(JSON.stringify({ error: "clerkId and platformRole are required" }), { status: 400 });
  }

  if (body.platformRole !== "super_admin" && body.platformRole !== "user") {
    return new Response(JSON.stringify({ error: "Invalid platformRole" }), { status: 400 });
  }

  try {
    const client = new ConvexHttpClient(import.meta.env.PUBLIC_CONVEX_URL);
    await client.mutation(api.users.updatePlatformRole, {
      clerkId: body.clerkId,
      platformRole: body.platformRole as "super_admin" | "user",
    });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 400 });
  }
};
