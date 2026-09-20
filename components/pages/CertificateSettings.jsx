"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import BrandingEditor, { brandingFromProfile } from "../certificates/BrandingEditor";
import { useAuth } from "../../lib/auth";
import { api } from "../../convex/_generated/api";
import { backendErrorMessage, backendMutation, backendQuery, isBackendConfigured } from "../../lib/convexBrowser";
import { EXAM } from "../../lib/settings";
import { Card, Flash, PageHeader, useFlash } from "../ui/Kit";

/**
 * Certificate Settings (Section 4.1): the host's reusable default branding.
 *
 * Saving here changes every certificate generated from now on for tests
 * without their own override; certificates already issued keep the snapshot
 * they were drawn from and never change.
 */
export default function CertificateSettings() {
  const { user } = useAuth();
  const [saved, setSaved] = useState(undefined); // undefined = loading, null = none yet
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useFlash();

  useEffect(() => {
    if (!user) return;
    if (!isBackendConfigured()) {
      setSaved(null);
      setError("Certificate settings need a connection to the shared database.");
      return;
    }
    backendQuery(api.certificates.mySettings, {})
      .then((row) => setSaved(row || null))
      .catch((err) => {
        setSaved(null);
        setError(backendErrorMessage(err, "Could not load your certificate settings."));
      });
  }, [user]);

  async function save(fields) {
    setSaving(true);
    setError(null);
    try {
      await backendMutation(api.certificates.saveSettings, fields);
      const row = await backendQuery(api.certificates.mySettings, {});
      setSaved(row || null);
      setFlash("Certificate settings saved. They apply to every future certificate without a per-test override.");
    } catch (err) {
      setError(backendErrorMessage(err, "Could not save. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  const initial = saved || (saved === null ? brandingFromProfile(user) : null);

  return (
    <DashboardLayout activePage="certificate-settings" title="Certificate Settings">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          eyebrow="Certificates"
          title="Certificate Settings"
          subtitle="Your default branding for every certificate a test issues automatically. A test can override it for itself without changing this."
        />
        <Flash message={flash} />
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">⚠️ {error}</div>}
        <Card>
          {saved === undefined ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : (
            <BrandingEditor
              key={saved?.savedAt || "new"}
              user={user}
              initial={initial}
              prefilledFromProfile={saved === null}
              saveLabel={saved ? "Save changes" : "Save as my certificate template"}
              onSave={save}
              saving={saving}
            />
          )}
        </Card>
        <p className="text-[11px] text-muted-foreground">
          Certificates are kept permanently and can be downloaded again from a student's test history at any time; they are not subject to the {EXAM.RETENTION_DAYS}-day proctoring recording retention.
        </p>
      </div>
    </DashboardLayout>
  );
}
