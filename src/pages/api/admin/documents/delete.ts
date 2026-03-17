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

  if (typeof documentId !== "string" || !documentId.trim()) {
    return new Response("Missing documentId", { status: 400 });
  }

  const doc = await client.query(api.documents.getDocument, {
    id: documentId.trim() as Id<"documents">,
  });

  if (!doc) {
    return new Response("Document not found", { status: 404 });
  }

  if (doc.isActive) {
    return new Response("Cannot delete an active document. Deactivate it first.", { status: 400 });
  }

  await client.mutation(api.documents.deleteDocument, {
    id: documentId.trim() as Id<"documents">,
  });

  return redirect("/admin/documents");
};
