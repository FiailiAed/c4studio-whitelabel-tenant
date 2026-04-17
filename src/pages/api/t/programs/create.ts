import type { APIRoute } from "astro";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { z } from "zod";

const CreateProgramSchema = z.object({
  tenantSlug: z.string().min(1),
  name: z.string().min(1, "Program name is required."),
  description: z.string().optional(),
  priceInCents: z.number().int().min(0, "Price must be a positive number."),
  capacity: z.number().int().positive().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED"]),
});

export const POST: APIRoute = async ({ locals, request }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body." }), { status: 400 });
  }

  const parsed = CreateProgramSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Validation failed.";
    return new Response(JSON.stringify({ error: message }), { status: 400 });
  }

  const { tenantSlug, ...programData } = parsed.data;

  try {
    const token = await locals.auth().getToken({ template: "convex" });
    const client = new ConvexHttpClient(import.meta.env.PUBLIC_CONVEX_URL);
    if (token) client.setAuth(token);

    // Resolve tenantId from slug
    const tenant = await client.query(api.tenants.getTenantBySlug, { slug: tenantSlug });
    if (!tenant) {
      return new Response(JSON.stringify({ error: "Tenant not found." }), { status: 404 });
    }

    // Verify caller is an admin of this tenant
    const membership = await client.query(api.tenantMembers.getMembership, {
      tenantId: tenant._id as Id<"tenants">,
      clerkId: userId,
    });
    const isImpersonating = locals.isImpersonating ?? false;
    if (!isImpersonating && membership?.tenantRole !== "admin") {
      return new Response(JSON.stringify({ error: "Only admins can create programs." }), { status: 403 });
    }

    const programId = await client.mutation(api.programs.createProgram, {
      tenantId: tenant._id as Id<"tenants">,
      ...programData,
    });

    return new Response(JSON.stringify({ success: true, id: programId }), { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error.";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
