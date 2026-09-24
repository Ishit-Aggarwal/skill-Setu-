/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _lib_assessment from "../_lib/assessment.js";
import type * as _lib_authz from "../_lib/authz.js";
import type * as _lib_certificates from "../_lib/certificates.js";
import type * as _lib_communityAccess from "../_lib/communityAccess.js";
import type * as _lib_communityCore from "../_lib/communityCore.js";
import type * as _lib_demoSeed from "../_lib/demoSeed.js";
import type * as _lib_questionBank from "../_lib/questionBank.js";
import type * as _lib_rows from "../_lib/rows.js";
import type * as _lib_tests from "../_lib/tests.js";
import type * as _lib_verification from "../_lib/verification.js";
import type * as aiUsage from "../aiUsage.js";
import type * as applications from "../applications.js";
import type * as auth from "../auth.js";
import type * as authNode from "../authNode.js";
import type * as certificates from "../certificates.js";
import type * as collabs from "../collabs.js";
import type * as communities from "../communities.js";
import type * as crons from "../crons.js";
import type * as demo from "../demo.js";
import type * as exams from "../exams.js";
import type * as files from "../files.js";
import type * as institution from "../institution.js";
import type * as internships from "../internships.js";
import type * as mentoring from "../mentoring.js";
import type * as mentorship from "../mentorship.js";
import type * as migrations from "../migrations.js";
import type * as notifications from "../notifications.js";
import type * as portfolios from "../portfolios.js";
import type * as programs from "../programs.js";
import type * as recruiters from "../recruiters.js";
import type * as research from "../research.js";
import type * as resume from "../resume.js";
import type * as reviews from "../reviews.js";
import type * as saved from "../saved.js";
import type * as seed from "../seed.js";
import type * as skillTests from "../skillTests.js";
import type * as testReminders from "../testReminders.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "_lib/assessment": typeof _lib_assessment;
  "_lib/authz": typeof _lib_authz;
  "_lib/certificates": typeof _lib_certificates;
  "_lib/communityAccess": typeof _lib_communityAccess;
  "_lib/communityCore": typeof _lib_communityCore;
  "_lib/demoSeed": typeof _lib_demoSeed;
  "_lib/questionBank": typeof _lib_questionBank;
  "_lib/rows": typeof _lib_rows;
  "_lib/tests": typeof _lib_tests;
  "_lib/verification": typeof _lib_verification;
  aiUsage: typeof aiUsage;
  applications: typeof applications;
  auth: typeof auth;
  authNode: typeof authNode;
  certificates: typeof certificates;
  collabs: typeof collabs;
  communities: typeof communities;
  crons: typeof crons;
  demo: typeof demo;
  exams: typeof exams;
  files: typeof files;
  institution: typeof institution;
  internships: typeof internships;
  mentoring: typeof mentoring;
  mentorship: typeof mentorship;
  migrations: typeof migrations;
  notifications: typeof notifications;
  portfolios: typeof portfolios;
  programs: typeof programs;
  recruiters: typeof recruiters;
  research: typeof research;
  resume: typeof resume;
  reviews: typeof reviews;
  saved: typeof saved;
  seed: typeof seed;
  skillTests: typeof skillTests;
  testReminders: typeof testReminders;
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
