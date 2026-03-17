import type { APIRoute } from "astro";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const { userId } = locals.auth();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const client = new ConvexHttpClient(import.meta.env.PUBLIC_CONVEX_URL);
  const callerUser = await client.query(api.users.getUserByClerkId, { clerkId: userId });
  if (!callerUser || callerUser.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const formData = await request.formData();
  const documentId = formData.get("documentId");
  const isActiveStr = formData.get("isActive");

  if (typeof documentId !== "string" || !documentId.trim()) {
    return new Response("Missing documentId", { status: 400 });
  }

  // isActive is the current value — we toggle it to the opposite
  const currentIsActive = isActiveStr === "true";

  await client.mutation(api.documents.updateDocument, {
    id: documentId.trim() as Id<"documents">,
    isActive: !currentIsActive,
  });

  const referer = request.headers.get("Referer");
  return redirect(referer ?? "/admin/documents");
};
