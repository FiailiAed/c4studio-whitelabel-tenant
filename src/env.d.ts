/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    platformUser?: import("../convex/_generated/dataModel").Doc<"users"> | null;
    tenant?: import("../convex/_generated/dataModel").Doc<"tenants"> | null;
    tenantId?: string;
    membership?: import("../convex/_generated/dataModel").Doc<"tenant_members"> | null;
    isImpersonating?: boolean;
  }
}
