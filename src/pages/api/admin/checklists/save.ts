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

  type EquipmentItem = { item: string; checked: boolean };
  type ScheduleItem = { ageGroup: string; time: string; location?: string };

  let body: {
    eventId?: string;
    warmupDrillIds?: string[];
    equipmentItems?: EquipmentItem[];
    gameSchedule?: ScheduleItem[];
    rosterNotes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { eventId, warmupDrillIds = [], equipmentItems = [], gameSchedule = [], rosterNotes } = body;
  if (!eventId) {
    return Response.json({ success: false, error: "eventId is required" }, { status: 400 });
  }

  const validAgeGroups = ["U6", "U8", "U12", "U14"] as const;
  type ValidAgeGroup = typeof validAgeGroups[number];

  try {
    await client.mutation(api.gameDayChecklists.upsertChecklist, {
      eventId: eventId as Id<"events">,
      warmupDrillIds: warmupDrillIds as Id<"drills">[],
      equipmentItems: equipmentItems.map((e) => ({ item: e.item, checked: Boolean(e.checked) })),
      gameSchedule: gameSchedule
        .filter((s) => validAgeGroups.includes(s.ageGroup as ValidAgeGroup))
        .map((s) => ({
          ageGroup: s.ageGroup as ValidAgeGroup,
          time: s.time,
          location: s.location || undefined,
        })),
      rosterNotes: rosterNotes || undefined,
    });
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
};
