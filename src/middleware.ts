import { clerkMiddleware } from "@clerk/astro/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

export const onRequest = clerkMiddleware(async (auth, context, next) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  const isAdminRoute = pathname.startsWith("/admin");
  const isGetStartedRoute = pathname.startsWith("/get-started");
  const isCoachRoute = pathname.startsWith("/coach");
  const isProfileRoute = pathname === "/profile";

  // ─── /coach/* guard: require auth + onboardStatus "done" or "submitted" ─────
  if (isCoachRoute) {
    const { userId } = auth();
    if (!userId) {
      return Response.redirect(new URL("/", context.request.url));
    }
    const client = new ConvexHttpClient(import.meta.env.PUBLIC_CONVEX_URL);
    const user = await client.query(api.users.getUserByClerkId, { clerkId: userId });
    if (!user || (user.onboardStatus !== "done" && user.onboardStatus !== "submitted")) {
      return Response.redirect(new URL("/get-started", context.request.url));
    }
    context.locals.coachIsReadOnly = user.onboardStatus === "submitted";
  }

  // ─── /profile guard: require auth ────────────────────────────────────────────
  if (isProfileRoute) {
    const { userId } = auth();
    if (!userId) {
      return Response.redirect(new URL("/", context.request.url));
    }
  }

  // ─── /admin/* and /get-started/* guards ──────────────────────────────────────
  if (isAdminRoute || isGetStartedRoute) {
    const { userId } = auth();

    if (!userId) {
      return Response.redirect(new URL("/", context.request.url));
    }

    if (isAdminRoute) {
      const client = new ConvexHttpClient(import.meta.env.PUBLIC_CONVEX_URL);
      const user = await client.query(api.users.getUserByClerkId, { clerkId: userId });
      if (!user || user.role !== "admin") {
        return Response.redirect(new URL("/", context.request.url));
      }
    }
  }

  return next();
});
