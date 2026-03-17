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

  const body = await request.json() as { planId: string; templateName: string };

  if (!body.planId || !body.templateName?.trim()) {
    return new Response(JSON.stringify({ success: false, error: "planId and templateName required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const templateId = await client.mutation(api.plans.saveAsTemplate, {
      planId: body.planId as Id<"practice_plans">,
      templateName: body.templateName.trim(),
      createdBy: userId,
    });
    return new Response(JSON.stringify({ success: true, templateId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
