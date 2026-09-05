"use client";

/**
 * Where the browser keeps its session token.
 *
 * The token is the only thing that proves who a request is from — the user id
 * cached alongside the profile proves nothing, because anything in localStorage
 * can be edited. Kept in localStorage rather than sessionStorage so a signed-in
 * account survives a tab close, which is what the multi-device sign-in
 * behaviour is for.
 */

const TOKEN_KEY = "ayusetu:session_token";

export function getSessionToken() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token) {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private browsing — the session simply won't persist */
  }
}

/** Authorization header for fetch(), or an empty object when signed out. */
export function authHeaders() {
  const token = getSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
