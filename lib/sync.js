"use client";

const CHANNEL_NAME = "skillsetu_mesh_v1";
const LOCAL_EVENT_NAME = "skillsetu:local_mutation";

let channel = null;

function getChannel() {
  if (typeof window === "undefined") return null;
  if (!channel && "BroadcastChannel" in window) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
  return channel;
}

/**
 * Broadcasts a change event to all tabs and local window listeners.
 * @param {string} collection - The database collection that changed.
 * @param {string} action - "INSERT" | "UPDATE" | "REMOVE" | "BATCH"
 * @param {any} payload - Document or identifier.
 */
export function broadcastMutation(collection, action, payload = null) {
  if (typeof window === "undefined") return;
  const eventPayload = {
    collection,
    action,
    payload,
    timestamp: Date.now(),
    tabId: window.name || "tab_" + Math.random().toString(36).slice(2, 7),
  };

  // 1. Broadcast to other tabs via BroadcastChannel
  try {
    const ch = getChannel();
    if (ch) ch.postMessage(eventPayload);
  } catch (err) {
    console.warn("[Sync] BroadcastChannel postMessage failed:", err);
  }

  // 2. Dispatch local custom event for listeners inside the same window
  window.dispatchEvent(new CustomEvent(LOCAL_EVENT_NAME, { detail: eventPayload }));

  // 3. Fallback for older browsers: write to a dedicated storage ping key
  try {
    window.localStorage.setItem("ayusetu:sync_ping", JSON.stringify(eventPayload));
  } catch {}
}

/**
 * Subscribes a callback to mutations across all tabs and the local tab.
 * @param {string[] | "*"} collections - Target collections to watch.
 * @param {Function} callback - Function invoked on change.
 * @returns {Function} Unsubscribe function.
 */
export function subscribeToMutations(collections, callback) {
  if (typeof window === "undefined") return () => {};

  const handleEvent = (eventData) => {
    if (!eventData || !eventData.collection) return;
    if (collections === "*" || collections.includes(eventData.collection)) {
      callback(eventData);
    }
  };

  // Listener for BroadcastChannel
  const ch = getChannel();
  const onMessage = (e) => handleEvent(e.data);
  if (ch) ch.addEventListener("message", onMessage);

  // Listener for same-tab CustomEvent
  const onLocal = (e) => handleEvent(e.detail);
  window.addEventListener(LOCAL_EVENT_NAME, onLocal);

  // Listener for cross-tab storage fallback
  const onStorage = (e) => {
    if (e.key === "ayusetu:sync_ping" && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        handleEvent(parsed);
      } catch {}
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    if (ch) ch.removeEventListener("message", onMessage);
    window.removeEventListener(LOCAL_EVENT_NAME, onLocal);
    window.removeEventListener("storage", onStorage);
  };
}
