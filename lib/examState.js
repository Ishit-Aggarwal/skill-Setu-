/**
 * The exam attempt state machine.
 *
 * The current state is stored on the attempt record and every transition is
 * appended to `transitions` with a timestamp, so the full timeline can be
 * replayed for the proctoring report. The server validates every move
 * against this table; the browser only proposes them.
 */

export const EXAM_STATES = [
  "NOT_STARTED",
  "CONSENT_PENDING",
  "PERMISSIONS_PENDING",
  "PERMISSIONS_DENIED",
  "DEVICE_CHECK",
  "FULLSCREEN_PENDING",
  "IN_PROGRESS",
  "PAUSED_VIOLATION",
  "SUBMITTED",
  "AUTO_SUBMITTED",
  "GRADED",
];

export const TRANSITIONS = {
  NOT_STARTED: ["CONSENT_PENDING"],
  CONSENT_PENDING: ["PERMISSIONS_PENDING", "NOT_STARTED"],
  PERMISSIONS_PENDING: ["PERMISSIONS_DENIED", "DEVICE_CHECK"],
  PERMISSIONS_DENIED: ["PERMISSIONS_PENDING"],
  DEVICE_CHECK: ["FULLSCREEN_PENDING", "PERMISSIONS_PENDING"],
  FULLSCREEN_PENDING: ["IN_PROGRESS"],
  IN_PROGRESS: ["PAUSED_VIOLATION", "SUBMITTED", "AUTO_SUBMITTED"],
  PAUSED_VIOLATION: ["IN_PROGRESS", "AUTO_SUBMITTED"],
  SUBMITTED: ["GRADED"],
  AUTO_SUBMITTED: ["GRADED"],
  GRADED: [],
};

/** States in which the paper has been handed in and answers can no longer change. */
export const CLOSED_STATES = ["SUBMITTED", "AUTO_SUBMITTED", "GRADED"];

/** States in which the recording indicator is shown and monitoring is live. */
export const LIVE_STATES = ["IN_PROGRESS", "PAUSED_VIOLATION"];

export function canTransition(from, to) {
  return Array.isArray(TRANSITIONS[from]) && TRANSITIONS[from].includes(to);
}

export function isClosed(state) {
  return CLOSED_STATES.includes(state);
}

export const AUTO_SUBMIT_REASONS = {
  time_up: "the time allowed for the test ran out",
  fullscreen_timeout: "you exited fullscreen and did not return in time",
  violation_limit_reached: "too many violations were detected",
  penalty_limit_reached: "violation penalties used up every point on this paper",
  device_timeout: "your camera or microphone was disconnected and not reconnected in time",
  device_lost: "your camera or microphone was switched off during the test",
};

/** Reasons that mean the attempt failed outright, whatever was answered. */
export const FAILING_REASONS = ["penalty_limit_reached", "device_lost"];

/** The factual sentence a candidate sees after an automatic submission. */
export function autoSubmitMessage(reason) {
  const why = AUTO_SUBMIT_REASONS[reason] || "the monitoring rules for this test were triggered";
  return `Your test was automatically submitted because ${why}.`;
}

export const EVENT_LABEL = {
  FULLSCREEN_EXIT: "Left fullscreen",
  TAB_SWITCH: "Switched tab or window",
  BLOCKED_ACTION: "Blocked shortcut / action",
  AUDIO_FLAG: "Sustained background noise",
  DEVICE_DISCONNECTED: "Camera or microphone disconnected",
  NO_FACE: "No face in front of the camera",
  MULTIPLE_FACES: "More than one person in front of the camera",
  LOOKING_AWAY: "Looking away from the screen",
  FACE_MONITOR_UNAVAILABLE: "Face monitoring could not start on this device",
  RECORDING_UPLOAD_FAILURE: "Recording chunk failed to upload",
  AUTO_SUBMIT_TRIGGERED: "Automatic submission",
};
