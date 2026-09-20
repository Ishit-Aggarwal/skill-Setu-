"use client";

/**
 * "Reset demo data" — the button on every demo persona's header.
 *
 * Two halves, in this order: the server drops every row the four personas
 * own (the same rows any other visitor would otherwise inherit), then this
 * browser drops its demo namespace and re-seeds it. If the server cannot be
 * reached the local half still runs, and the server rows are removed the
 * next time a reset succeeds.
 */

import { api } from "../convex/_generated/api";
import { backendMutation, isBackendConfigured } from "./convexBrowser";
import { getSessionToken } from "./session";
import { resetLocalDemoData } from "./store";

export async function resetDemoData() {
  let server = null;
  if (isBackendConfigured() && getSessionToken()) {
    try {
      server = await backendMutation(api.demo.reset, {});
    } catch (error) {
      console.warn("[demo] Could not reset the shared demo rows:", error?.message || error);
    }
  }
  resetLocalDemoData();
  return { ok: true, server };
}
