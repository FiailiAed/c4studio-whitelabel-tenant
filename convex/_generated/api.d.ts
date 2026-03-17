/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as assignments from "../assignments.js";
import type * as documents from "../documents.js";
import type * as drills from "../drills.js";
import type * as eventRsvp from "../eventRsvp.js";
import type * as events from "../events.js";
import type * as gameDayChecklists from "../gameDayChecklists.js";
import type * as migrations from "../migrations.js";
import type * as onboarding from "../onboarding.js";
import type * as plans from "../plans.js";
import type * as players from "../players.js";
import type * as repsLog from "../repsLog.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  assignments: typeof assignments;
  documents: typeof documents;
  drills: typeof drills;
  eventRsvp: typeof eventRsvp;
  events: typeof events;
  gameDayChecklists: typeof gameDayChecklists;
  migrations: typeof migrations;
  onboarding: typeof onboarding;
  plans: typeof plans;
  players: typeof players;
  repsLog: typeof repsLog;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
