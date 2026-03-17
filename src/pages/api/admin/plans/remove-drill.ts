import type { APIRoute } from "astro";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

export const POST: APIRoute = async ({ request, locals }) => {
  const { userId } = locals.auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const client = new ConvexHttpClient(import.meta.env.PUBLIC_CONVEX_URL);
  const user = await client.query(api.users.getUserByClerkId, { clerkId: userId });
  if (!user || user.role !== "admin") return new Response("Forbidden", { status: 403 });

  const body = await request.json() as { planDrillId: string };

  if (!body.planDrillId) {
    return new Response(JSON.stringify({ success: false, error: "Missing planDrillId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  await client.mutation(api.plans.removeDrillFromPlan, {
    planDrillId: body.planDrillId as Id<"plan_drills">,
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
