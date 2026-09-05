/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _lib_authz from "../_lib/authz.js";
import type * as _lib_questionBank from "../_lib/questionBank.js";
import type * as _lib_verification from "../_lib/verification.js";
import type * as applications from "../applications.js";
import type * as auth from "../auth.js";
import type * as authNode from "../authNode.js";
import type * as internships from "../internships.js";
import type * as mentorship from "../mentorship.js";
import type * as portfolios from "../portfolios.js";
import type * as programs from "../programs.js";
import type * as seed from "../seed.js";
import type * as skillTests from "../skillTests.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "_lib/authz": typeof _lib_authz;
  "_lib/questionBank": typeof _lib_questionBank;
  "_lib/verification": typeof _lib_verification;
  applications: typeof applications;
  auth: typeof auth;
  authNode: typeof authNode;
  internships: typeof internships;
  mentorship: typeof mentorship;
  portfolios: typeof portfolios;
  programs: typeof programs;
  seed: typeof seed;
  skillTests: typeof skillTests;
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
