import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Admin roster: joins registrations + players + programs for a tenant.
 * Auth-gated — caller must be authenticated.
 */
export const getAdminRoster = query({
  args: { tenantSlug: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.tenantSlug))
      .first();
    if (!tenant) throw new Error("Tenant not found.");

    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenant._id))
      .collect();

    const rows = await Promise.all(
      registrations.map(async (reg) => {
        const [player, program] = await Promise.all([
          ctx.db.get(reg.playerId),
          ctx.db.get(reg.programId),
        ]);
        if (!player || !program) return null;

        return {
          id: reg._id,
          playerName: `${player.firstName} ${player.lastName}`,
          grade: player.grade,
          usLacrosseNumber: player.usLacrosseNumber ?? "—",
          programName: program.name,
          status: reg.status,
        };
      }),
    );

    return rows.filter(
      (row): row is NonNullable<typeof row> => row !== null,
    );
  },
});
