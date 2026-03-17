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

  type UpdateItem = {
    planDrillId: string;
    durationMinutes: number;
    playerCountAtStation?: number;
    repsOverride?: number;
  };

  let body: { updates?: UpdateItem[]; planId?: string; playlistUrl?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { updates = [], planId, playlistUrl } = body;

  if (!Array.isArray(updates)) {
    return Response.json({ success: false, error: "updates must be an array" }, { status: 400 });
  }

  try {
    // Batch update plan drills
    if (updates.length > 0) {
      await client.mutation(api.plans.updatePlanDrillsBatch, {
        updates: updates.map((u) => ({
          planDrillId: u.planDrillId as Id<"plan_drills">,
          durationMinutes: Number(u.durationMinutes),
          playerCountAtStation: u.playerCountAtStation != null ? Number(u.playerCountAtStation) : undefined,
          repsOverride: u.repsOverride != null ? Number(u.repsOverride) : undefined,
        })),
      });
    }

    // Optionally update plan metadata (playlist URL for shootaround events)
    if (planId && playlistUrl !== undefined) {
      await client.mutation(api.plans.updatePlan, {
        id: planId as Id<"practice_plans">,
        playlistUrl: playlistUrl || undefined,
      });
    }

    return Response.json({ success: true, updated: updates.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
};
