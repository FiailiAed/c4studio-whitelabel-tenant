import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

export const sendPendingNotification = internalAction({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    const task = await ctx.runQuery(internal.tasks.getTask, { taskId });
    if (!task) return;

    const user = await ctx.runQuery(api.users.getUserByClerkId, {
      clerkId: task.createdBy,
    });
    if (!user) return;

    const resendApiKey = process.env.RESEND_API;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!resendApiKey || !fromEmail) {
      console.warn("Resend env vars not set — skipping email");
      return;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: user.email,
        subject: `Task pending review: "${task.title}"`,
        html: `
          <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto;">
            <p style="font-size: 14px; color: #64748b; margin-bottom: 16px;">Hi ${user.firstName ?? user.email},</p>
            <p style="font-size: 16px; color: #0f172a; margin-bottom: 8px;">
              A task you created is now <strong style="color: #f59e0b;">pending review</strong>:
            </p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="font-size: 15px; font-weight: 600; color: #0f172a; margin: 0;">${task.title}</p>
            </div>
            <p style="font-size: 13px; color: #94a3b8;">
              Log in to review and update this task's status.
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend API error:", error);
    }
  },
});
