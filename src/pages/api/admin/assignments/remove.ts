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

  const body = await request.json() as { assignmentId: string };

  if (!body.assignmentId) {
    return new Response(JSON.stringify({ success: false, error: "Missing assignmentId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  await client.mutation(api.assignments.removeAssignment, {
    assignmentId: body.assignmentId as Id<"staff_assignments">,
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
