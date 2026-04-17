import type { APIRoute } from "astro";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { z } from "zod";

const UpdateProgramSchema = z.object({
  id: z.string().min(1, "Program ID is required."),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  priceInCents: z.number().int().min(0).optional(),
  capacity: z.number().int().positive().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED"]).optional(),
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

  const parsed = UpdateProgramSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Validation failed.";
    return new Response(JSON.stringify({ error: message }), { status: 400 });
  }

  const { id, ...updateFields } = parsed.data;

  try {
    const token = await locals.auth().getToken({ template: "convex" });
    const client = new ConvexHttpClient(import.meta.env.PUBLIC_CONVEX_URL);
    if (token) client.setAuth(token);

    // Verify program exists and caller is an admin of the owning tenant
    const program = await client.query(api.programs.getProgram, {
      programId: id as Id<"programs">,
    });
    if (!program) {
      return new Response(JSON.stringify({ error: "Program not found." }), { status: 404 });
    }

    const membership = await client.query(api.tenantMembers.getMembership, {
      tenantId: program.tenantId as Id<"tenants">,
      clerkId: userId,
    });
    const isImpersonating = locals.isImpersonating ?? false;
    if (!isImpersonating && membership?.tenantRole !== "admin") {
      return new Response(JSON.stringify({ error: "Only admins can update programs." }), { status: 403 });
    }

    await client.mutation(api.programs.updateProgram, {
      id: id as Id<"programs">,
      ...updateFields,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error.";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
