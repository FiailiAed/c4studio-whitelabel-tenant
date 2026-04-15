import { ConvexReactClient } from "convex/react";

export const convex = new ConvexReactClient(
  import.meta.env.PUBLIC_CONVEX_URL as string,
);
