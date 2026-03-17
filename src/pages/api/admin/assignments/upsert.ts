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
    eventId: string;
    clerkId: string;
    station: "stretch" | "warmup" | "offense" | "ground_balls" | "defense" | "3v3_combat" | "team_specific" | "u6_practice";
    ageGroup?: "U6" | "U8" | "U12" | "U14";
    notes?: string;
  };

  if (!body.eventId || !body.clerkId || !body.station) {
    return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const assignmentId = await client.mutation(api.assignments.upsertAssignment, {
    eventId: body.eventId as Id<"events">,
    clerkId: body.clerkId,
    station: body.station,
    ageGroup: body.ageGroup,
    notes: body.notes,
  });

  return new Response(JSON.stringify({ success: true, assignmentId }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
