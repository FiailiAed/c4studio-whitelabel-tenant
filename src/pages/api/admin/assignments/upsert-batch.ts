import type { APIRoute } from "astro";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

export const POST: APIRoute = async ({ request, locals }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const client = new ConvexHttpClient(import.meta.env.PUBLIC_CONVEX_URL);
  const callerUser = await client.query(api.users.getUserByClerkId, { clerkId: userId });
  if (!callerUser || callerUser.role !== "admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  type AssignmentItem = {
    station: string;
    ageGroup?: string;
    clerkId: string;
  };

  let body: { eventId?: string; assignments?: AssignmentItem[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { eventId, assignments } = body;
  if (!eventId || !Array.isArray(assignments)) {
    return Response.json({ success: false, error: "eventId and assignments are required" }, { status: 400 });
  }

  const validStations = ["stretch", "warmup", "offense", "ground_balls", "defense", "3v3_combat", "team_specific", "u6_practice"] as const;
  type ValidStation = typeof validStations[number];

  const validAgeGroups = ["U6", "U8", "U12", "U14"] as const;
  type ValidAgeGroup = typeof validAgeGroups[number];

  try {
    await client.mutation(api.assignments.upsertAssignmentsBatch, {
      eventId: eventId as Id<"events">,
      assignments: assignments.map((a) => ({
        station: a.station as ValidStation,
        ageGroup: (a.ageGroup && validAgeGroups.includes(a.ageGroup as ValidAgeGroup))
          ? (a.ageGroup as ValidAgeGroup)
          : undefined,
        clerkId: a.clerkId,
      })),
    });
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
};
