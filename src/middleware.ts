import { clerkMiddleware } from "@clerk/astro/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

const IMPERSONATION_COOKIE = "impersonating_tenant_id";

async function verifyImpersonationCookie(
  cookieValue: string,
  secret: string,
): Promise<string | null> {
  try {
    const [encodedPayload, encodedSig] = cookieValue.split(".");
    if (!encodedPayload || !encodedSig) return null;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const sigBuffer = Uint8Array.from(atob(encodedSig.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    const payloadBuffer = new TextEncoder().encode(encodedPayload);
    const valid = await crypto.subtle.verify("HMAC", key, sigBuffer, payloadBuffer);
    if (!valid) return null;

    const payload = atob(encodedPayload.replace(/-/g, "+").replace(/_/g, "/"));
    const [tenantId] = payload.split(".");
    return tenantId ?? null;
  } catch {
    return null;
  }
}

export const onRequest = clerkMiddleware(async (auth, context, next) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  const isSuperAdminRoute = pathname.startsWith("/super-admin");
  const isTenantRoute = pathname.match(/^\/t\/([^/]+)/);
  const isProfileRoute = pathname === "/profile";
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/api/webhooks/");

  if (isPublic) return next();

  const { userId } = auth();
  if (!userId) {
    return Response.redirect(new URL("/", context.request.url));
  }

  const client = new ConvexHttpClient(import.meta.env.PUBLIC_CONVEX_URL);
  let platformUser = await client.query(api.users.getUserByClerkId, { clerkId: userId });

  // Fallback: if the Clerk webhook hasn't fired yet (common in local dev),
  // create the Convex user record on first authenticated request.
  if (!platformUser) {
    const clerkUser = await context.locals.currentUser();
    const email = clerkUser?.emailAddresses?.find(
      (e) => e.id === clerkUser?.primaryEmailAddressId,
    )?.emailAddress ?? "";
    await client.mutation(api.users.upsertUser, {
      clerkId: userId,
      email,
      firstName: clerkUser?.firstName ?? undefined,
      lastName: clerkUser?.lastName ?? undefined,
    });
    platformUser = await client.query(api.users.getUserByClerkId, { clerkId: userId });
  }

  context.locals.platformUser = platformUser;

  // ─── /profile: auth only ─────────────────────────────────────────────────────
  if (isProfileRoute) return next();

  // ─── /super-admin/*: require super_admin ─────────────────────────────────────
  if (isSuperAdminRoute) {
    if (!platformUser || platformUser.platformRole !== "super_admin") {
      return Response.redirect(new URL("/", context.request.url));
    }
    return next();
  }

  // ─── /t/[slug]/*: require active membership (or super_admin impersonating) ───
  if (isTenantRoute) {
    const slug = isTenantRoute[1];

    const tenant = await client.query(api.tenants.getTenantBySlug, { slug });
    if (!tenant || tenant.status !== "active") {
      return Response.redirect(new URL("/", context.request.url));
    }

    context.locals.tenant = tenant;
    context.locals.tenantId = tenant._id;

    // Check impersonation cookie (super_admin only)
    const impersonationSecret = import.meta.env.IMPERSONATION_SECRET;
    const cookies = context.request.headers.get("cookie") ?? "";
    const cookieMap = Object.fromEntries(
      cookies.split(";").map((c) => {
        const [k, ...v] = c.trim().split("=");
        return [k?.trim() ?? "", v.join("=")];
      }),
    );
    const cookieVal = cookieMap[IMPERSONATION_COOKIE];

    if (cookieVal && impersonationSecret && platformUser?.platformRole === "super_admin") {
      const cookieTenantId = await verifyImpersonationCookie(cookieVal, impersonationSecret);
      if (cookieTenantId === tenant._id) {
        context.locals.isImpersonating = true;
        return next();
      }
    }

    // Regular membership check
    const membership = await client.query(api.tenantMembers.getMembership, {
      tenantId: tenant._id as Id<"tenants">,
      clerkId: userId,
    });

    if (!membership || membership.status !== "active") {
      return Response.redirect(new URL("/", context.request.url));
    }

    context.locals.membership = membership;
    return next();
  }

  return next();
});
