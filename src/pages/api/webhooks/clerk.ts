import type { APIRoute } from "astro";
import { Webhook } from "svix";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

export const POST: APIRoute = async ({ request }) => {
  const webhookSecret = import.meta.env.CLERK_WEBHOOK_SECRET;
  const convexUrl = import.meta.env.PUBLIC_CONVEX_URL;

  const svix_id = request.headers.get("svix-id");
  const svix_timestamp = request.headers.get("svix-timestamp");
  const svix_signature = request.headers.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await request.text();
  const wh = new Webhook(webhookSecret);

  let event: any;
  try {
    event = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  // Upsert on user CREATED or user UPDATED
  if (event.type === "user.created" || event.type === "user.updated") {
    const { id, email_addresses, first_name, last_name, public_metadata } = event.data;
    const email = email_addresses?.[0]?.email_address ?? "";
    const role = public_metadata?.role === "admin" ? "admin" : "user";

    const client = new ConvexHttpClient(convexUrl);
    await client.mutation(api.users.upsertUser, {
      clerkId: id,
      email,
      firstName: first_name ?? undefined,
      lastName: last_name ?? undefined,
      role,
    });
  // Delete user on user DELETE
  } else if (event.type === "user.deleted") {
    const { id } = event.data;
    const client = new ConvexHttpClient(convexUrl);
    await client.mutation(api.users.deleteUser, { clerkId: id });
  }

  return new Response("OK", { status: 200 });
};
