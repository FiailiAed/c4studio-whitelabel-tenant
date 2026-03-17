import type { APIRoute } from "astro";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

type GameAgeGroup = "08U" | "10U" | "12U" | "14U";
const VALID_GAME_AGE_GROUPS = new Set<string>(["08U", "10U", "12U", "14U"]);

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const client = new ConvexHttpClient(import.meta.env.PUBLIC_CONVEX_URL);

  // Verify admin role
  const user = await client.query(api.users.getUserByClerkId, { clerkId: userId });
  if (!user || user.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const formData = await request.formData();
  const activeGameAgeGroups = (formData.getAll("activeGameAgeGroups") as string[])
    .filter((ag): ag is GameAgeGroup => VALID_GAME_AGE_GROUPS.has(ag));

  await client.mutation(api.onboarding.updateSeasonConfig, { activeGameAgeGroups });

  return redirect("/admin/config?saved=1", 303);
};
