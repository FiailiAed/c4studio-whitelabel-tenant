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
    id: string;
    title?: string;
    date?: number;
    type?: "practice" | "program_training" | "individual_practice" | "game" | "other";
    targetAgeGroup?: "U6" | "U8" | "U12" | "U14";
    location?: string;
    durationMinutes?: number;
    notes?: string;
  };

  const { id, ...fields } = body;
  if (!id) return new Response("Missing id", { status: 400 });

  await client.mutation(api.events.updateEvent, {
    id: id as Id<"events">,
    ...fields,
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
