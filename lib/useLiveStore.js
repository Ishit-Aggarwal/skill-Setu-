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
    // Coalesced with a zero timeout rather than requestAnimationFrame: rapid
    // writes still cause one re-read, and a background tab (which never
    // paints) still picks up rows that a pull merged while it was hidden.
    let timer = null;
    const unsubscribe = subscribeToMutations(collections, (_event) => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        refresh();
      }, 0);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [ready, JSON.stringify(collections), refresh]);

  return { data, ready, refresh, lastUpdated };
}

/**
 * A counter that bumps whenever one of `collections` changes — including
 * when a background pull merges rows from the shared database. Screens that
 * read the store inside a useMemo/useEffect add it to their dependency list
 * so a row that arrived from another device is drawn without a reload.
 */
export function useStoreVersion(collections) {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    // A timeout rather than requestAnimationFrame: a background tab never
    // paints, and a pull that lands while the tab is hidden must still be
    // drawn the moment the person comes back to it.
    let timer = null;
    const unsubscribe = subscribeToMutations(collections, () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        setVersion((v) => v + 1);
      }, 0);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(collections)]);
  return version;
}
