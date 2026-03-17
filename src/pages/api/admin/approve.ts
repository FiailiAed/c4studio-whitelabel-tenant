import type { APIRoute } from "astro";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const { userId } = locals.auth();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Verify caller is an admin
  const client = new ConvexHttpClient(import.meta.env.PUBLIC_CONVEX_URL);
  const callerUser = await client.query(api.users.getUserByClerkId, { clerkId: userId });
  if (!callerUser || callerUser.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const formData = await request.formData();
  const clerkId = formData.get("clerkId");

  if (typeof clerkId !== "string" || !clerkId.trim()) {
    return new Response("Missing clerkId", { status: 400 });
  }

  await client.mutation(api.onboarding.approveUser, { clerkId: clerkId.trim() });

  return redirect(`/admin/staff/${clerkId.trim()}`);
};
