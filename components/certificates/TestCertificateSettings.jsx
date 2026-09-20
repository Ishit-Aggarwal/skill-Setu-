"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CertificatePreview from "./CertificatePreview";
import BrandingEditor from "./BrandingEditor";
import { api } from "../../convex/_generated/api";
import { backendErrorMessage, backendMutation, backendQuery, isBackendConfigured } from "../../lib/convexBrowser";
import { PAGE_PATHS } from "../../lib/nav";
import { Button, Field, Modal, TextInput } from "../ui/Kit";

/**
 * Per-test certificate settings (Section 4.3) inside the "Host a test" form:
 * the issue toggle, the optional minimum score, a live preview of the
 * branding that will actually be used (a one-off override in full, else the
 * saved default), and the two ways to change it.
 */
export default function TestCertificateSettings({ user, testId, issueCertificate, minCertificateScore, onChange }) {
  const [resolved, setResolved] = useState(undefined); // { source, branding }
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    if (!isBackendConfigured() || !testId) {
      setResolved({ source: "none", branding: null });
      return;
    }
    try {
      setResolved(await backendQuery(api.certificates.brandingForTest, { testId }));
    } catch (err) {
      setResolved({ source: "none", branding: null });
      setError(backendErrorMessage(err, "Could not load certificate branding."));
    }
  }

  useEffect(() => {
    if (issueCertificate) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueCertificate, testId]);

  async function saveOverride(fields) {
    setSaving(true);
    setError(null);
    try {
      await backendMutation(api.certificates.saveOverride, { testId, ...fields });
      setEditing(false);
      await load();
    } catch (err) {
      setError(backendErrorMessage(err, "Could not save the override."));
    } finally {
      setSaving(false);
    }
  }

  async function clearOverride() {
    setSaving(true);
    try {
      await backendMutation(api.certificates.clearOverride, { testId });
      await load();
    } catch (err) {
      setError(backendErrorMessage(err, "Could not remove the override."));
    } finally {
      setSaving(false);
    }
  }

  const minInvalid = minCertificateScore !== "" && (!Number.isFinite(Number(minCertificateScore)) || Number(minCertificateScore) < 0 || Number(minCertificateScore) > 100);

  return (
    <div className="rounded-xl border border-border p-3.5 space-y-3">
      <div className="text-xs font-semibold text-primary uppercase tracking-wider">Certificate</div>
      <label className="flex items-start gap-2 text-xs text-foreground">
        <input type="checkbox" checked={Boolean(issueCertificate)} onChange={(e) => onChange({ issueCertificate: e.target.checked })} className="mt-0.5" />
        <span>
          Issue certificate on completion
          <span className="block text-[11px] text-muted-foreground">Generated automatically the moment a candidate's attempt is graded. Off by default.</span>
        </span>
      </label>

      {issueCertificate && (
        <>
          <Field label="Minimum score to receive certificate" hint="Percentage, 0–100. Leave blank to certify every candidate who completes the test.">
            <TextInput type="number" min="0" max="100" step="1" value={minCertificateScore} onChange={(e) => onChange({ minCertificateScore: e.target.value })} placeholder="e.g. 60" className="max-w-[160px]" />
            {minInvalid && <p className="text-[11px] text-red-600 mt-1">Enter a percentage between 0 and 100.</p>}
          </Field>

          <div className="space-y-2">
            {resolved === undefined && <p className="text-[11px] text-muted-foreground">Loading your certificate branding…</p>}
            {resolved && resolved.branding && (
              <>
                <CertificatePreview branding={resolved.branding} design={resolved.branding.design} compact />
                <p className="text-[11px] text-muted-foreground">
                  {resolved.source === "override"
                    ? "This test has its own branding. It is used in full for this test only; your saved default is untouched."
                    : "This is your saved certificate branding. You can change it for this test only, or update it permanently in Certificate Settings."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)} disabled={saving}>
                    {resolved.source === "override" ? "Edit this test's branding" : "Edit for this test only"}
                  </Button>
                  <Link href={PAGE_PATHS["certificate-settings"]} className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-secondary">
                    Go to Certificate Settings
                  </Link>
                  {resolved.source === "override" && (
                    <button type="button" onClick={clearOverride} className="text-[11px] text-muted-foreground hover:text-red-600 px-2" disabled={saving}>
                      Remove override, use my default
                    </button>
                  )}
                </div>
              </>
            )}
            {resolved && !resolved.branding && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 space-y-2">
                <p>You have no saved certificate branding yet, so certificates for this test would print with your profile name only. Set your default once, or brand this test on its own.</p>
                <div className="flex flex-wrap gap-2">
                  <Link href={PAGE_PATHS["certificate-settings"]} className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-xl bg-primary text-white">
                    Go to Certificate Settings
                  </Link>
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
                    Edit for this test only
                  </Button>
                </div>
              </div>
            )}
            {error && <p className="text-[11px] text-red-600">⚠️ {error}</p>}
          </div>
        </>
      )}

      {editing && (
        <Modal title="Certificate branding for this test only" description="A complete, self-contained set of branding for this one test. Your saved default in Certificate Settings is not changed." onClose={() => !saving && setEditing(false)} size="lg">
          <BrandingEditor
            user={user}
            initial={resolved?.branding || null}
            prefilledFromProfile={!resolved?.branding}
            saveLabel="Save for this test only"
            onSave={saveOverride}
            onCancel={() => setEditing(false)}
            saving={saving}
          />
        </Modal>
      )}
    </div>
  );
}
