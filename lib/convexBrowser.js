"use client";

import { ConvexHttpClient } from "convex/browser";
import { getSessionToken } from "./session";

/**
 * Direct Convex access from the browser, for the parts of the product that are
 * genuinely two-sided and therefore cannot live in this device's localStorage:
 * graded skill tests and mentorship scheduling.
 *
 * Every call passes the session token; the server decides what that token is
 * allowed to do. Nothing here is trusted to be an authorization check — it is
 * a transport.
 */

let client = null;

export function isBackendConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
}

export function convexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return null;
  if (!client) client = new ConvexHttpClient(url);
  return client;
}

/** Human-readable message from a Convex error, with the marker stripped. */
export function backendErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const raw = String(error?.message || error || "");
  if (!raw) return fallback;
  // Convex wraps handler errors in a request header and a stack trace; find the
  // line that carries the actual message, never a stack frame ("at handler (…)").
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines) {
    const match = /UNAUTHORIZED:\s*(.*)$/.exec(line);
    if (match) return match[1];
  }
  for (const line of lines) {
    const uncaught = /Uncaught (?:Convex)?Error:\s*(.*?)(?:\s+at\s|$)/.exec(line);
    if (uncaught && uncaught[1]) return uncaught[1];
  }
  const message = lines.find((l) => !/^at\s/.test(l) && !/^\[CONVEX /.test(l) && !/^Called by client$/i.test(l));
  return message || fallback;
}

function requireClient() {
  const c = convexClient();
  if (!c) {
    // Deliberately says nothing about deployment configuration: this string
    // can surface to a student, and an environment variable name is not a
    // thing they can act on.
    throw new Error("That isn't available right now. Please try again in a moment.");
  }
  return c;
}

function requireToken() {
  const token = getSessionToken();
  if (!token) throw new Error("Please sign in again to continue.");
  return token;
}

/** Runs a Convex query with the current session token injected. */
export async function backendQuery(reference, args = {}) {
  return await requireClient().query(reference, { sessionToken: requireToken(), ...args });
}

/** Runs a Convex mutation with the current session token injected. */
export async function backendMutation(reference, args = {}) {
  return await requireClient().mutation(reference, { sessionToken: requireToken(), ...args });
}

/** Query that tolerates being signed out — returns `fallback` instead of throwing. */
export async function backendQuerySafe(reference, args = {}, fallback = null) {
  try {
    return await backendQuery(reference, args);
  } catch {
    return fallback;
  }
}
