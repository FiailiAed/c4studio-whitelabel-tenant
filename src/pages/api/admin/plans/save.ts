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

  const body = await request.json() as {
    planId?: string;
    name?: string;
    notes?: string;
    eventId?: string;
    isTemplate?: boolean;
  };

  if (body.planId) {
    // Update existing plan
    await client.mutation(api.plans.updatePlan, {
      id: body.planId as Id<"practice_plans">,
      name: body.name,
      notes: body.notes,
    });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Create new plan
  if (!body.eventId && !body.isTemplate) {
    return new Response(JSON.stringify({ success: false, error: "eventId or isTemplate required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const planId = await client.mutation(api.plans.createPlan, {
    name: body.name ?? "Untitled Plan",
    isTemplate: body.isTemplate ?? false,
    eventId: body.eventId ? (body.eventId as Id<"events">) : undefined,
    notes: body.notes,
    createdBy: userId,
  });

  return new Response(JSON.stringify({ success: true, planId }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
