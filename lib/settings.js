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
  /**
   * Every violation (leaving fullscreen, switching tabs, a blocked shortcut,
   * the camera losing the candidate) costs this many points off the paper
   * unless the host sets their own figure on the test. The moment the
   * penalties reach the paper's total the attempt fails and is handed in.
   * A host can never set a penalty higher than the paper's total points.
   */
  DEFAULT_VIOLATION_PENALTY: 2,
  /** Legacy: tests published before penalties existed still carry this count. */
  VIOLATION_LIMIT: 3,
  /**
   * Camera and microphone violations (no face, extra faces, looking away, a
   * different face, voices in the room) are counted separately: at this many
   * the attempt fails outright. A host can set their own figure on the test;
   * 0 turns the limit off (penalties still apply).
   */
  MONITOR_VIOLATION_LIMIT: 3,
  /**
   * Leaving the test window fails the attempt at once: a tab switch, Alt+Tab,
   * minimising, a three-finger touchpad swipe, closing the tab or window,
   * a reload. Nothing here can be blocked from a web page, so it is not
   * paused and charged — it is over.
   */
  INSTANT_FAIL_TYPES: ["TAB_SWITCH", "WINDOW_CLOSED"],
  /** Seconds between "still here" pings while the paper is open… */
  HEARTBEAT_SECONDS: 10,
  /** …and how long without one before the server treats the window as closed. */
  HEARTBEAT_TIMEOUT_SECONDS: 45,
  /** Seconds a candidate has to return to fullscreen before auto-submit. */
  FULLSCREEN_GRACE_SECONDS: 15,
  /** Seconds a camera/mic may be gone (a cable knocked, a driver hiccup) before the attempt fails. */
  DEVICE_GRACE_SECONDS: 3,
  /**
   * On-device face monitoring (MediaPipe Face Landmarker, nothing leaves the
   * browser). Seconds are how long a condition must hold before it is flagged;
   * angles are degrees of head turn; gaze is the blendshape score (0–1).
   */
  FACE: {
    INTERVAL_MS: 400,
    NO_FACE_SECONDS: 5,
    MULTIPLE_FACES_SECONDS: 2,
    LOOK_AWAY_SECONDS: 4,
    YAW_LIMIT_DEG: 35,
    PITCH_LIMIT_DEG: 30,
    GAZE_LIMIT: 0.6,
    /** After a flag, the same condition is not charged again for this long — even if it persists. */
    COOLDOWN_SECONDS: 15,
    /** Served from public/ by scripts/copy-mediapipe.js; the model is fetched once and cached. */
    WASM_PATH: "/mediapipe/wasm",
    MODEL_URL: "/models/face_landmarker.task",
    MODEL_FALLBACK_URL: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
  },
  /**
   * Identity check: the face in front of the camera is compared, on the
   * device, with the face that was there when the paper opened (MediaPipe
   * Image Embedder on the face crop; cosine similarity). A sustained
   * mismatch is flagged for the host's review and counted with the other
   * camera violations. Nothing on screen tells the candidate this runs.
   */
  IDENTITY: {
    /** Seconds after the paper opens during which reference samples are taken. */
    REFERENCE_WINDOW_SECONDS: 8,
    REFERENCE_SAMPLES: 5,
    INTERVAL_MS: 1500,
    /** Below this similarity (0–1) to every reference sample the face is treated as somebody else. */
    MATCH_THRESHOLD: 0.62,
    MISMATCH_SECONDS: 8,
    COOLDOWN_SECONDS: 30,
    EMBEDDER_MODEL_URL: "/models/mobilenet_v3_small.tflite",
    EMBEDDER_FALLBACK_URL: "https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite",
  },
  /**
   * Voices in the room: MediaPipe Audio Classifier (YAMNet) listens on the
   * device and scores each second for speech. Enough speech inside the
   * window is one VOICE_DETECTED violation; the same episode is not charged
   * again until the cooldown passes.
   */
  VOICE: {
    WASM_PATH: "/mediapipe/audio-wasm",
    MODEL_URL: "/models/yamnet.tflite",
    MODEL_FALLBACK_URL: "https://storage.googleapis.com/mediapipe-models/audio_classifier/yamnet/float32/1/yamnet.tflite",
    /** YAMNet categories that count as a voice. */
    CATEGORIES: ["Speech", "Conversation", "Narration, monologue", "Child speech, kid speaking", "Whispering", "Shout", "Chatter", "Speech synthesizer"],
    /** Minimum class score for a second to count as speech. */
    SCORE: 0.45,
    /** A rolling window of this many seconds… */
    WINDOW_SECONDS: 8,
    /** …with at least this many seconds of speech in it raises a flag. */
    SPEECH_SECONDS: 4,
    COOLDOWN_SECONDS: 20,
    SAMPLE_RATE: 16000,
  },
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
  /** Event types that cost a penalty. */
  VIOLATION_TYPES: ["FULLSCREEN_EXIT", "TAB_SWITCH", "BLOCKED_ACTION", "NO_FACE", "MULTIPLE_FACES", "LOOKING_AWAY", "FACE_MISMATCH", "VOICE_DETECTED"],
  /** The camera/microphone subset, counted against MONITOR_VIOLATION_LIMIT. */
  MONITOR_VIOLATION_TYPES: ["NO_FACE", "MULTIPLE_FACES", "LOOKING_AWAY", "FACE_MISMATCH", "VOICE_DETECTED"],
  /** Every event type the report knows how to describe. */
  EVENT_TYPES: [
    "FULLSCREEN_EXIT",
    "TAB_SWITCH",
    "BLOCKED_ACTION",
    "AUDIO_FLAG",
    "DEVICE_DISCONNECTED",
    "NO_FACE",
    "MULTIPLE_FACES",
    "LOOKING_AWAY",
    "FACE_MISMATCH",
    "VOICE_DETECTED",
    "WINDOW_CLOSED",
    "FACE_MONITOR_UNAVAILABLE",
    "VOICE_MONITOR_UNAVAILABLE",
    "RECORDING_UPLOAD_FAILURE",
    "AUTO_SUBMIT_TRIGGERED",
  ],
  /** Sample question papers a host may attach to a test, for candidates to download. */
  MAX_SAMPLE_PAPERS: 5,
  /**
   * Minutes after a test starts during which a registered candidate may still
   * open the paper. Once the window closes the sitting is in progress and
   * nobody new may join it; whoever is inside keeps writing until the end.
   */
  JOIN_WINDOW_MINUTES: 10,
  /**
   * An online test is monitored by the exam room itself; a live meeting is
   * optional. Whether there is one, and its link, may be changed until this
   * many hours before the start.
   */
  MEETING_LINK_LEAD_HOURS: 3,
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
  /** Most questions read out of one uploaded PDF paper. */
  MAX_IMPORT_QUESTIONS: 60,
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
