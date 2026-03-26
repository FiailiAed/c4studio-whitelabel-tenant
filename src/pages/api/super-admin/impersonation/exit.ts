import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ locals }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return new Response(null, { status: 302, headers: { Location: "/" } });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/super-admin/tenants",
      "Set-Cookie": `impersonating_tenant_id=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    },
  });
};
