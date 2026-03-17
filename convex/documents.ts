import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listDocuments = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const listAllDocuments = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("documents").collect();
  },
});

export const getDocument = query({
  args: { id: v.id("documents") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const createDocument = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    isActive: v.boolean(),
    fileUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("documents", { ...args, version: 1, createdAt: now, updatedAt: now });
  },
});

export const updateDocument = mutation({
  args: {
    id: v.id("documents"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    fileUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error(`Document not found: ${id}`);
    await ctx.db.patch(id, {
      ...fields,
      version: existing.version + 1,
      updatedAt: Date.now(),
    });
  },
});

export const deleteDocument = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const getAcknowledgmentCounts = query({
  args: {},
  handler: async (ctx): Promise<Record<string, number>> => {
    const allOnboarding = await ctx.db.query("onboarding").collect();
    const counts: Record<string, number> = {};
    for (const record of allOnboarding) {
      for (const ack of record.documentAcknowledgments) {
        const key = ack.documentId as string;
        counts[key] = (counts[key] ?? 0) + 1;
      }
    }
    return counts;
  },
});

// Run once via Convex dashboard to seed initial org documents
export const seedDocuments = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const docs = [
      {
        title: "Code of Conduct",
        content: `# Staff Code of Conduct

As a staff member of our youth lacrosse organization, you agree to uphold the following standards:

1. **Safety First** — The physical and emotional safety of every athlete is the top priority.
2. **Respect** — Treat all players, parents, officials, and fellow staff with dignity and respect.
3. **Positive Environment** — Foster a supportive, inclusive, and encouraging environment.
4. **Zero Tolerance** — Harassment, bullying, or discrimination of any kind will not be tolerated.
5. **Professionalism** — Maintain appropriate boundaries with all athletes at all times.
6. **Reporting** — Report any safety concerns or violations to the organization director immediately.

By acknowledging this document, you confirm you have read, understood, and agree to abide by this Code of Conduct.`,
        version: 1,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        title: "Volunteer Liability Waiver",
        content: `# Volunteer Liability Waiver

By volunteering with our youth lacrosse organization, you acknowledge and agree to the following:

1. **Assumption of Risk** — Participation in lacrosse activities involves inherent physical risks.
2. **Release of Liability** — You release the organization, its officers, directors, and other volunteers from any claims arising from your volunteer activities.
3. **Emergency Authorization** — In the event of an emergency during activities you supervise, you authorize reasonable first aid and medical treatment for participants.
4. **Background Check Consent** — You consent to a background check as required by our child safety policy.
5. **Photo/Media Release** — You consent to photographs and video taken during organization activities being used in promotional materials.

This waiver is valid for the current season and must be re-acknowledged each season.`,
        version: 1,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const inserted = [];
    for (const doc of docs) {
      const id = await ctx.db.insert("documents", doc);
      inserted.push({ id, title: doc.title });
    }

    return { inserted: inserted.length, documents: inserted };
  },
});
