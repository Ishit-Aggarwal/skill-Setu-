"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { subscribeToMutations } from "./sync";

/**
 * Reactive data hook that re-evaluates queryFn whenever watched collections change.
 * @param {string[] | "*"} collections - Collections to monitor (e.g. ["internships", "applications"]).
 * @param {Function} queryFn - Synchronous data retrieval function.
 * @param {any[]} deps - Standard dependency array.
 */
export function useLiveStore(collections, queryFn, deps = []) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState(() => []);
  const [lastUpdated, setLastUpdated] = useState(() => Date.now());

  const queryRef = useRef(queryFn);
  queryRef.current = queryFn;

  const refresh = useCallback(() => {
    try {
      const result = queryRef.current();
      setData(result);
      setLastUpdated(Date.now());
    } catch (err) {
      console.error("[useLiveStore] Error querying data:", err);
    }
  }, []);

  useEffect(() => {
    setReady(true);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!ready) return;
    const unsubscribe = subscribeToMutations(collections, (_event) => {
      // Debounce with requestAnimationFrame to prevent multiple renders on rapid writes
      if (typeof window !== "undefined") {
        window.requestAnimationFrame(() => {
          refresh();
        });
      }
    });
    return unsubscribe;
  }, [ready, JSON.stringify(collections), refresh]);

  return { data, ready, refresh, lastUpdated };
}
