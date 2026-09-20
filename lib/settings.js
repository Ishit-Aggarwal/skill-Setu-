/**
 * Every tunable number in the exam room, the AI paper tools and the
 * certificate pipeline, in one place.
 *
 * Nothing below is repeated anywhere else: the browser, the Convex functions
 * and the API routes all import from here, so changing a limit is one edit.
 * The file is plain constants with no "use client" so it can be bundled into
 * both the Next.js client and the Convex runtime.
 */

export const EXAM = {
  /** Fullscreen exits, tab switches and blocked shortcuts share this budget. */
  VIOLATION_LIMIT: 3,
  /** Seconds a candidate has to return to fullscreen before auto-submit. */
  FULLSCREEN_GRACE_SECONDS: 15,
  /** Seconds a candidate has to reconnect a camera/mic before auto-submit. */
  DEVICE_GRACE_SECONDS: 15,
  /** Sustained microphone level (0–1 RMS) that counts as background noise… */
  AUDIO_FLAG_LEVEL: 0.18,
  /** …when it stays above the level for this many seconds. */
  AUDIO_FLAG_SECONDS: 5,
  /** Recordings and detailed event logs are deleted after this many days. */
  RETENTION_DAYS: 90,
  /** Each uploaded recording chunk covers this many seconds. */
  CHUNK_SECONDS: 20,
  /** How many times a failed chunk upload is retried before it is logged as a gap. */
  CHUNK_UPLOAD_RETRIES: 3,
  /** Proctoring footage only needs to identify a face and gross movement. */
  VIDEO: {
    width: 640,
    height: 480,
    frameRate: 12,
    videoBitsPerSecond: 250_000,
    audioBitsPerSecond: 32_000,
  },
  /** Event types that count against VIOLATION_LIMIT. */
  VIOLATION_TYPES: ["FULLSCREEN_EXIT", "TAB_SWITCH", "BLOCKED_ACTION"],
  /** Every event type the report knows how to describe. */
  EVENT_TYPES: [
    "FULLSCREEN_EXIT",
    "TAB_SWITCH",
    "BLOCKED_ACTION",
    "AUDIO_FLAG",
    "DEVICE_DISCONNECTED",
    "RECORDING_UPLOAD_FAILURE",
    "AUTO_SUBMIT_TRIGGERED",
  ],
  /** The line every consent screen and report footer uses. */
  MONITORING_NOTICE: "This test is recorded and monitored. Suspicious activity is flagged for your professor's review.",
};

export const AI = {
  /** Upper bound on one generation call — keeps a single Gemini response reliable. */
  MAX_QUESTIONS: 30,
  /** How often a failed or invalid generation is retried before the professor sees an error. */
  GENERATION_RETRIES: 1,
  /** Default single/multiple split when the professor picks "Mixed". */
  MIXED_SINGLE_RATIO: 0.7,
  /** Longest topic prompt accepted, in characters. */
  MAX_TOPIC_LENGTH: 600,
};

export const CERTIFICATES = {
  /** Logo and signature uploads. */
  IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  IMAGE_TYPES: ["image/png", "image/jpeg", "image/svg+xml"],
  /** Generated design variations kept while the professor flips between them. */
  VARIATIONS_KEPT: 3,
  /** Default title on a fresh template. */
  DEFAULT_TITLE: "Certificate of Achievement",
  /** Page size for the PDF, in PDF points (A4 landscape). */
  PAGE: { width: 841.89, height: 595.28 },
};

/** Background sync between this device's store and the shared database. */
export const SYNC = {
  /** Minimum gap between two pulls of the same collection on one device. */
  PULL_INTERVAL_MS: 20000,
  /** Back-off between retries of a mirror that failed for a transient reason. */
  MIRROR_RETRY_DELAYS_MS: [800, 1600, 3200],
};

/** Uploaded documents and images (Convex file storage, free tier: 1 GB). */
export const FILES = {
  MAX_DOCUMENT_BYTES: 10 * 1024 * 1024,
  MAX_IMAGE_BYTES: 5 * 1024 * 1024,
  DOCUMENT_TYPES: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  IMAGE_TYPES: ["image/png", "image/jpeg", "image/webp"],
  MAX_GALLERY_IMAGES: 12,
};
