"use client";

import { useMemo, useState } from "react";
import { useQueries } from "convex/react";
import { getFunctionName } from "convex/server";
import { getSessionToken } from "./session";
import { backendErrorMessage } from "./convexBrowser";

/**
 * Live Convex reads with the session token injected.
 *
 * Communities (and the other shared, permission-checked screens) read
 * straight from the server rather than from this device's store: every read
 * is decided per caller, pages are cursors, and a post from another device
 * should appear without a refresh. `useQueries` is used rather than
 * `useQuery` because it hands back a refusal as a value instead of throwing
 * it into the page — a removed member sees a sentence, not a crash.
 *
 * Returns { data, error, loading }.
 */
export function useSessionQuery(reference, args = {}, { skip = false } = {}) {
  const token = typeof window !== "undefined" ? getSessionToken() : null;
  const key = JSON.stringify(args);
  // `api.x.y` is a proxy that hands back a new object on every access, so the
  // function's name (a stable string) is what the memo keys on.
  const name = reference ? getFunctionName(reference) : "";
  const queries = useMemo(
    () => (skip || !token || !reference ? {} : { q: { query: reference, args: { sessionToken: token, ...args } } }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [name, token, key, skip]
  );
  const result = useQueries(queries);
  const value = result.q;
  if (value instanceof Error) return { data: undefined, error: backendErrorMessage(value), loading: false };
  return { data: value, error: null, loading: !skip && Boolean(token) && value === undefined };
}

/**
 * A cursor-paginated live query (Convex `paginate`): the first page, then
 * `loadMore()` appends the next. Every loaded page stays live.
 *
 * Returns { items, loadMore, canLoadMore, loading, error }.
 */
export function useSessionPages(reference, args = {}, { pageSize = 20, skip = false } = {}) {
  const token = typeof window !== "undefined" ? getSessionToken() : null;
  const key = JSON.stringify(args);
  const name = reference ? getFunctionName(reference) : "";
  const [cursors, setCursors] = useState([null]);
  const [resetKey, setResetKey] = useState(key);
  if (resetKey !== key) {
    setResetKey(key);
    setCursors([null]);
  }
  const queries = useMemo(() => {
    if (skip || !token || !reference) return {};
    const out = {};
    cursors.forEach((cursor, i) => {
      out[`p${i}`] = { query: reference, args: { sessionToken: token, ...args, paginationOpts: { numItems: pageSize, cursor } } };
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, token, key, skip, cursors, pageSize]);
  const results = useQueries(queries);
  const items = [];
  let error = null;
  let loading = false;
  let last = null;
  cursors.forEach((_, i) => {
    const r = results[`p${i}`];
    if (r instanceof Error) error = backendErrorMessage(r);
    else if (r === undefined) loading = true;
    else {
      items.push(...(r.page || []));
      last = r;
    }
  });
  const canLoadMore = Boolean(last && !last.isDone && !loading && last.continueCursor && !cursors.includes(last.continueCursor));
  return {
    items,
    error,
    loading,
    canLoadMore,
    loadMore: () => {
      if (canLoadMore) setCursors((c) => [...c, last.continueCursor]);
    },
  };
}
