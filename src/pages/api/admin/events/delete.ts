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

  const formData = await request.formData();
  const eventId = formData.get("eventId");

  if (typeof eventId !== "string" || !eventId.trim()) {
    return new Response("Missing eventId", { status: 400 });
  }

  await client.mutation(api.events.deleteEvent, { id: eventId.trim() as Id<"events"> });

  return new Response(null, {
    status: 302,
    headers: { Location: "/admin/events" },
  });
};
