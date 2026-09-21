import { requireHost } from "../../../lib/apiHost";
import { AI_NOT_CONFIGURED, AYUSH_CONTEXT, GeminiError, aiConfigured, generateJson } from "../../../lib/gemini";
import { CERTIFICATES, FILES } from "../../../lib/settings";
import { normaliseDesign } from "../../../lib/certificateDesign";
import { DESIGN_SCHEMA, DESIGN_VOCABULARY } from "../../../lib/certificateDesignPrompt";

/**
 * "Upload an existing certificate" on the Certificate Settings page.
 *
 * The host's own certificate — a photo, a scan, a PNG export or a PDF — is
 * read by the model, which describes it in the design vocabulary of
 * lib/certificateDesign.js (frame, pattern, palette, layout, ornament, name
 * treatment, seal, tagline) and reads the text off it (institution, title,
 * signatory and their designation, programme). The result lands in the
 * editor as a starting template: every field stays editable, the logo and
 * signature are uploaded separately, and nothing is saved until the host
 * submits the form. It is a recreation in the platform's own renderer, not
 * a copy of the file — that is what makes it reusable for every candidate.
 */

export const config = { api: { bodyParser: { sizeLimit: "12mb" } } };

const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    design: DESIGN_SCHEMA,
    text: {
      type: "OBJECT",
      properties: {
        institutionName: { type: "STRING" },
        programName: { type: "STRING" },
        title: { type: "STRING" },
        professorName: { type: "STRING" },
        professorTitle: { type: "STRING" },
      },
      required: ["institutionName", "programName", "title", "professorName", "professorTitle"],
    },
    notes: { type: "STRING" },
  },
  required: ["design", "text", "notes"],
};

function buildPrompt() {
  return [
    AYUSH_CONTEXT,
    "The attached file is a certificate a professor already uses. Recreate it as a design spec for the platform's own certificate renderer, and read the fixed text off it.",
    "design — describe what you see in the vocabulary below: choose the frame that is closest to the certificate's border or layout; the closest background pattern (\"none\" if plain); the four palette colours as the hex values actually used (sample the dominant heading colour for primary, the decorative/seal colour for accent, the body text colour for ink, the page colour for paper — paper must be very light and ink very dark); serif or sans for the headings; centred or left layout; the closest ornament; how the recipient's name is set; whether there is a round seal or medallion; and the tagline — the phrase printed immediately BEFORE the course or test name (e.g. \"for outstanding performance in\", \"has successfully completed\"), at most 8 words. The tagline is never the line that introduces the recipient's name (\"This certificate is awarded to\" is not a tagline). Give the design a short name.",
    "text — the institution or company name; the department / programme line if there is one (else empty); the certificate's own title (e.g. \"Certificate of Completion\"); the signatory's name and their designation. Leave a field empty when it is not on the certificate. Never invent names.",
    "notes — one sentence on anything the renderer cannot reproduce (a photograph, a QR code, a second signature), or an empty string.",
    DESIGN_VOCABULARY,
    "Return only JSON matching the schema.",
  ].join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed. Please use POST." });
  if (!aiConfigured()) return res.status(AI_NOT_CONFIGURED.status).json(AI_NOT_CONFIGURED.body);

  const host = await requireHost(req, res);
  if (!host) return undefined;

  const body = req.body || {};
  const data = String(body.file || "");
  const mimeType = String(body.mimeType || "").split(";")[0].trim().toLowerCase();
  if (!data) return res.status(400).json({ success: false, error: "Attach the certificate as an image or PDF." });
  if (!ACCEPTED.includes(mimeType)) return res.status(400).json({ success: false, error: "Please upload a PNG, JPG, WebP or PDF of the certificate." });
  const limit = mimeType === "application/pdf" ? FILES.MAX_DOCUMENT_BYTES : CERTIFICATES.IMAGE_MAX_BYTES;
  if (data.length > (limit * 4) / 3 + 1024) return res.status(413).json({ success: false, error: `File is too large — please upload a file under ${Math.round(limit / 1048576)}MB` });

  try {
    const raw = await generateJson({ prompt: buildPrompt(), schema: RESPONSE_SCHEMA, temperature: 0.2, attachments: [{ mimeType, data }] });
    const design = normaliseDesign({ ...(raw?.design || {}), id: `upload_${Date.now().toString(36)}`, name: raw?.design?.name || "Recreated from upload" });
    const text = raw?.text || {};
    const clean = (v, n) => String(v || "").trim().slice(0, n);
    return res.status(200).json({
      success: true,
      design,
      text: {
        institutionName: clean(text.institutionName, 120),
        programName: clean(text.programName, 120),
        title: clean(text.title, 80),
        professorName: clean(text.professorName, 80),
        professorTitle: clean(text.professorTitle, 80),
      },
      notes: clean(raw?.notes, 300),
    });
  } catch (error) {
    const status = error instanceof GeminiError ? error.status : 502;
    return res.status(status).json({ success: false, code: error.code, error: error.message || "The certificate could not be read. Please try again." });
  }
}
