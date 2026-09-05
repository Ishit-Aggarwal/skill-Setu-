"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import { useAuth } from "../../lib/auth";
import { useNav } from "../../lib/nav";
import {
  getInstitutionProfile,
  listInternships,
  listMentorshipRequestsForStudent,
  listPlacementHistory,
  listPrograms,
  listResearchOutputs,
  listSkillTests,
  listUsersByRole,
  requestMentorship,
} from "../../lib/store";
import { subscribeToMutations } from "../../lib/sync";
import { formatDate } from "../../lib/match";
import { formatStipendShort } from "../../lib/money";
import { programmeDates } from "../../lib/dates";
import { hasFile, openStoredFile } from "../../lib/files";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Flash,
  Modal,
  PageHeader,
  ProgressBar,
  SearchInput,
  Section,
  StatGrid,
  Tabs,
  TextArea,
  useFlash,
} from "../ui/Kit";

/**
 * Who else is on the platform.
 *
 * Until now a student could only encounter an institution, a mentor or a
 * company through something that organisation had already published at them —
 * a posting, a notice, a slot. There was no way to go the other direction and
 * ask "who is here, and what are they like?", which is the question you need
 * answered before choosing where to apply or who to ask for mentorship.
 */

const TABS = [
  { key: "institutes", label: "Institutes" },
  { key: "mentors", label: "Mentors" },
  { key: "companies", label: "Companies" },
];

export default function Directory() {
  const { user } = useAuth();
  const navigate = useNav();
  const [tab, setTab] = useState("institutes");
  const [search, setSearch] = useState("");
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const [open, setOpen] = useState(null); // { kind, record }
  const [requesting, setRequesting] = useState(null);
  const [flash, setFlash] = useFlash();

  useEffect(() => setReady(true), []);
  useEffect(
    () => subscribeToMutations(["users", "internships", "mentorshipRequests", "programs"], () => setVersion((v) => v + 1)),
    []
  );

  const data = useMemo(() => {
    if (!ready) return { institutes: [], mentors: [], companies: [] };

    const postings = listInternships().filter((i) => i.status !== "Closed");
    const tests = listSkillTests();
    const programmes = listPrograms();

    const institutionNames = new Set(
      listUsersByRole("institution")
        .map((u) => u.instituteName || u.institution)
        .filter(Boolean)
    );
    listUsersByRole("academician").forEach((a) => a.institution && institutionNames.add(a.institution));

    const institutes = [...institutionNames].map((name) => {
      const history = listPlacementHistory(name);
      const students = history.reduce((n, r) => n + (r.students || 0), 0);
      const placed = history.reduce((n, r) => n + (r.placed || 0), 0);
      const latestBatch = history.length ? Math.max(...history.map((r) => Number(r.batch) || 0)) : null;
      const latest = history.filter((r) => Number(r.batch) === latestBatch);
      return {
        name,
        profile: getInstitutionProfile(name) || {},
        history,
        latestBatch,
        latestRate: latest.length
          ? Math.round((latest.reduce((n, r) => n + r.placed, 0) / Math.max(1, latest.reduce((n, r) => n + r.students, 0))) * 100)
          : null,
        overallRate: students ? Math.round((placed / students) * 100) : null,
        faculty: listUsersByRole("academician").filter((a) => a.institution === name).length,
        programmes: programmes.filter((p) => p.organiser === name),
      };
    });

    const mentors = listUsersByRole("academician").map((mentor) => ({
      ...mentor,
      outputs: listResearchOutputs(mentor.id),
      expertise: [...(mentor.researchInterests || []), ...(mentor.subjectsTaught || [])],
    }));

    const companyNames = new Set(listUsersByRole("industry").map((u) => u.companyName).filter(Boolean));
    postings.forEach((p) => p.company && companyNames.add(p.company));

    const companies = [...companyNames].map((name) => {
      const account = listUsersByRole("industry").find((u) => u.companyName === name) || null;
      return {
        name,
        account,
        postings: postings.filter((p) => p.company === name),
        tests: tests.filter((t) => t.hostName === name),
      };
    });

    return {
      institutes: institutes.sort((a, b) => a.name.localeCompare(b.name)),
      mentors: mentors.sort((a, b) => (a.name || "").localeCompare(b.name || "")),
      companies: companies.sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [ready, version]);

  const myRequests = useMemo(
    () => (ready && user ? listMentorshipRequestsForStudent(user.id) : []),
    [user, ready, version]
  );
  const requestedIds = useMemo(() => new Set(myRequests.map((r) => r.facultyId)), [myRequests]);

  const q = search.trim().toLowerCase();
  const rows = useMemo(() => {
    const source = data[tab] || [];
    if (!q) return source;
    return source.filter((row) => {
      const haystack =
        tab === "mentors"
          ? `${row.name} ${row.department || ""} ${row.institution || ""} ${(row.expertise || []).join(" ")}`
          : tab === "companies"
          ? `${row.name} ${(row.postings || []).map((p) => p.domain).join(" ")}`
          : `${row.name} ${row.profile?.city || ""} ${row.profile?.instituteType || ""}`;
      return haystack.toLowerCase().includes(q);
    });
  }, [data, tab, q]);

  function submitRequest(message) {
    requestMentorship(user, requesting, message);
    setRequesting(null);
    setVersion((v) => v + 1);
    setFlash(`Request sent to ${requesting.name}. They will see it in their notifications.`);
  }

  return (
    <DashboardLayout activePage="directory" title="Directory">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          eyebrow="Explore"
          title="Directory"
          subtitle="Institutes, mentors and companies on Skill Setu — their record, their expertise, and what they have open."
        />

        <Flash message={flash} />

        <Tabs tabs={TABS.map((t) => ({ ...t, label: `${t.label} (${(data[t.key] || []).length})` }))} value={tab} onChange={setTab} />

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={tab === "mentors" ? "Search by name, department or expertise…" : "Search by name, city or sector…"}
        />

        {rows.length === 0 ? (
          <EmptyState icon="🔍" title="Nothing matches that search">
            Try a shorter search, or switch to another tab.
          </EmptyState>
        ) : tab === "institutes" ? (
          <div className="grid md:grid-cols-2 gap-4">
            {rows.map((institute) => (
              <Card key={institute.name} hover className="flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold flex-shrink-0 overflow-hidden">
                    {institute.profile.logoDataUrl ? (
                      <img src={institute.profile.logoDataUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      institute.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground leading-snug">{institute.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {[institute.profile.instituteType, institute.profile.city].filter(Boolean).join(" · ") || "Institution"}
                    </div>
                  </div>
                </div>

                {institute.latestRate != null ? (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Placement rate, batch {institute.latestBatch}</span>
                      <span className="font-semibold text-primary">{institute.latestRate}%</span>
                    </div>
                    <ProgressBar value={institute.latestRate} />
                    <div className="text-[11px] text-muted-foreground mt-1.5">
                      {institute.history.length} year{institute.history.length === 1 ? "" : "s"} on record ·{" "}
                      {institute.overallRate}% across all of them
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground mb-3">
                    This institution hasn&apos;t published placement statistics yet.
                  </p>
                )}

                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Badge tone="neutral">{institute.faculty} mentor{institute.faculty === 1 ? "" : "s"}</Badge>
                  <Badge tone="neutral">{institute.programmes.length} programme{institute.programmes.length === 1 ? "" : "s"}</Badge>
                  {(institute.profile.accreditations || []).slice(0, 2).map((a) => (
                    <Badge key={a.body} tone="green">{a.body} {a.grade}</Badge>
                  ))}
                </div>

                <Button size="sm" variant="outline" className="mt-auto self-start" onClick={() => setOpen({ kind: "institute", record: institute })}>
                  View profile
                </Button>
              </Card>
            ))}
          </div>
        ) : tab === "mentors" ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((mentor) => (
              <Card key={mentor.id} hover className="flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <Avatar name={mentor.name} size={42} src={mentor.avatarDataUrl} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{mentor.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {mentor.designation || "Faculty"}{mentor.department ? ` · ${mentor.department}` : ""}
                    </div>
                    <div className="text-[11px] text-primary truncate">{mentor.institution}</div>
                  </div>
                </div>

                {mentor.bio && <p className="text-xs text-muted-foreground line-clamp-3 mb-3 leading-relaxed">{mentor.bio}</p>}

                <div className="flex flex-wrap gap-1 mb-3">
                  {mentor.expertise.slice(0, 3).map((e) => (
                    <Badge key={e} tone="primary">{e}</Badge>
                  ))}
                  {mentor.expertise.length > 3 && (
                    <span className="text-[10px] text-muted-foreground self-center">+{mentor.expertise.length - 3}</span>
                  )}
                </div>

                <div className="text-[11px] text-muted-foreground mb-3">
                  📄 {mentor.outputs.length} publication{mentor.outputs.length === 1 ? "" : "s"} & patent
                  {mentor.outputs.length === 1 ? "" : "s"}
                </div>

                <div className="mt-auto flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setOpen({ kind: "mentor", record: mentor })}>
                    View profile
                  </Button>
                  {requestedIds.has(mentor.id) ? (
                    <Badge tone="green">Requested</Badge>
                  ) : (
                    <Button size="sm" onClick={() => setRequesting(mentor)}>
                      Request mentorship
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((company) => (
              <Card key={company.name} hover className="flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold flex-shrink-0 overflow-hidden">
                    {company.account?.logoDataUrl ? (
                      <img src={company.account.logoDataUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      company.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground leading-snug">{company.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {company.account?.companyDomain || company.postings[0]?.domain || "Industry partner"}
                    </div>
                  </div>
                </div>

                {company.account?.companyDescription && (
                  <p className="text-xs text-muted-foreground line-clamp-3 mb-3 leading-relaxed">
                    {company.account.companyDescription}
                  </p>
                )}

                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Badge tone={company.postings.length ? "primary" : "muted"}>
                    {company.postings.length} open role{company.postings.length === 1 ? "" : "s"}
                  </Badge>
                  <Badge tone={company.tests.length ? "blue" : "muted"}>
                    {company.tests.length} skill test{company.tests.length === 1 ? "" : "s"}
                  </Badge>
                </div>

                <Button size="sm" variant="outline" className="mt-auto self-start" onClick={() => setOpen({ kind: "company", record: company })}>
                  View profile
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {open?.kind === "institute" && (
        <InstituteModal institute={open.record} onClose={() => setOpen(null)} />
      )}

      {open?.kind === "mentor" && (
        <MentorModal
          mentor={open.record}
          alreadyRequested={requestedIds.has(open.record.id)}
          onRequest={() => {
            setRequesting(open.record);
            setOpen(null);
          }}
          onClose={() => setOpen(null)}
        />
      )}

      {open?.kind === "company" && (
        <CompanyModal company={open.record} onClose={() => setOpen(null)} onGoToRoles={() => navigate("internship-listings")} />
      )}

      {requesting && (
        <RequestModal mentor={requesting} onSubmit={submitRequest} onClose={() => setRequesting(null)} />
      )}
    </DashboardLayout>
  );
}

/* ---------------- detail views ---------------- */

function InstituteModal({ institute, onClose }) {
  const byBatch = useMemo(() => {
    const groups = new Map();
    institute.history.forEach((row) => {
      const key = String(row.batch);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });
    return [...groups.entries()].sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [institute.history]);

  return (
    <Modal title={institute.name} description={[institute.profile.instituteType, institute.profile.city].filter(Boolean).join(" · ")} onClose={onClose} size="lg">
      <div className="space-y-5">
        {institute.profile.about && (
          <p className="text-sm text-muted-foreground leading-relaxed">{institute.profile.about}</p>
        )}

        <StatGrid
          columns={3}
          stats={[
            { label: "Placement rate", value: institute.overallRate != null ? `${institute.overallRate}%` : "—", icon: "📈", tone: "primary" },
            { label: "Mentors on Setu", value: String(institute.faculty), icon: "🎓" },
            { label: "Programmes hosted", value: String(institute.programmes.length), icon: "📘" },
          ]}
        />

        <Section title="Placement record" description="Current and historical, by batch and department.">
          {byBatch.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not published yet.</p>
          ) : (
            <div className="space-y-3">
              {byBatch.map(([batch, rows]) => {
                const students = rows.reduce((n, r) => n + (r.students || 0), 0);
                const placed = rows.reduce((n, r) => n + (r.placed || 0), 0);
                const rate = students ? Math.round((placed / students) * 100) : 0;
                return (
                  <div key={batch} className="rounded-xl border border-border px-3.5 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-foreground">Batch {batch}</span>
                      <Badge tone={rate >= 80 ? "green" : rate >= 60 ? "amber" : "muted"}>{rate}% placed</Badge>
                    </div>
                    <ProgressBar value={rate} />
                    <div className="mt-2 space-y-1">
                      {rows.map((row) => (
                        <div key={row.id} className="flex items-center justify-between text-[11px] text-muted-foreground gap-3">
                          <span className="truncate">{row.department}</span>
                          <span className="flex-shrink-0">
                            {row.placed}/{row.students}
                            {row.medianStipend ? ` · median ₹${row.medianStipend.toLocaleString("en-IN")}` : ""}
                            {row.topRecruiter ? ` · ${row.topRecruiter}` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                    {/* Proof is optional by design — see the note on the
                        institution's own placement-stats editor. */}
                    {rows.some((r) => hasFile({ dataUrl: r.document })) && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {rows
                          .filter((r) => hasFile({ dataUrl: r.document }))
                          .map((r) => (
                            <button
                              key={`${r.id}-doc`}
                              onClick={() => openStoredFile({ dataUrl: r.document, fileName: r.documentName })}
                              className="text-[11px] text-primary hover:underline"
                            >
                              📎 {r.department} verification
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {institute.programmes.length > 0 && (
          <Section title="Programmes they host">
            <div className="space-y-2">
              {institute.programmes.slice(0, 6).map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-2.5">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">{p.title}</div>
                    <div className="text-[11px] text-muted-foreground">{programmeDates(p)}</div>
                  </div>
                  <Badge tone="neutral">{p.mode}</Badge>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </Modal>
  );
}

function MentorModal({ mentor, alreadyRequested, onRequest, onClose }) {
  return (
    <Modal
      title={mentor.name}
      description={`${mentor.designation || "Faculty"}${mentor.department ? ` · ${mentor.department}` : ""}`}
      onClose={onClose}
      size="lg"
      footer={
        alreadyRequested ? (
          <p className="text-xs text-muted-foreground text-center">
            You have already asked {mentor.name.split(" ")[0]} to mentor you. They will respond in their own time.
          </p>
        ) : (
          <Button className="w-full" onClick={onRequest}>
            Request mentorship
          </Button>
        )
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3.5">
          <Avatar name={mentor.name} size={52} src={mentor.avatarDataUrl} />
          <div className="min-w-0">
            <div className="text-sm text-primary font-medium truncate">{mentor.institution}</div>
            {mentor.experienceYears && (
              <div className="text-xs text-muted-foreground">{mentor.experienceYears} years of experience</div>
            )}
          </div>
        </div>

        {mentor.bio && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">About</div>
            <p className="text-sm text-muted-foreground leading-relaxed">{mentor.bio}</p>
          </div>
        )}

        {mentor.expertise.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Expertise</div>
            <div className="flex flex-wrap gap-1.5">
              {mentor.expertise.map((e) => (
                <Badge key={e} tone="primary">{e}</Badge>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Publications & patents ({mentor.outputs.length})
          </div>
          {mentor.outputs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing published on Skill Setu yet.</p>
          ) : (
            <div className="space-y-2">
              {mentor.outputs.map((o) => (
                <div key={o.id} className="flex items-start gap-3 rounded-xl border border-border px-3.5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-foreground">{o.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {o.venue || o.journalOrConference}
                      {o.year ? ` · ${o.year}` : ""}
                    </div>
                    {(o.url || hasFile({ dataUrl: o.fileDataUrl })) && (
                      <button
                        onClick={() => openStoredFile({ dataUrl: o.fileDataUrl, url: o.url, fileName: o.fileName })}
                        className="text-[11px] text-primary hover:underline mt-1"
                      >
                        {o.fileDataUrl ? `📄 ${o.fileName || "Open PDF"}` : "🔗 Open publication"}
                      </button>
                    )}
                  </div>
                  <Badge tone={o.type === "Patent" ? "purple" : "primary"}>{o.type}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {(mentor.scholarUrl || mentor.orcid || mentor.linkedIn) && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Academic profiles</div>
            <div className="flex flex-wrap gap-3 text-xs">
              {mentor.scholarUrl && (
                <a href={mentor.scholarUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  Google Scholar
                </a>
              )}
              {mentor.orcid && <span className="text-muted-foreground">ORCID {mentor.orcid}</span>}
              {mentor.linkedIn && (
                <a href={mentor.linkedIn} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  LinkedIn
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function CompanyModal({ company, onClose, onGoToRoles }) {
  return (
    <Modal
      title={company.name}
      description={company.account?.companyDomain || "Industry partner"}
      onClose={onClose}
      size="lg"
      footer={
        company.postings.length > 0 ? (
          <Button className="w-full" onClick={onGoToRoles}>
            Apply on the listings page
          </Button>
        ) : null
      }
    >
      <div className="space-y-5">
        {company.account?.companyDescription && (
          <p className="text-sm text-muted-foreground leading-relaxed">{company.account.companyDescription}</p>
        )}

        <StatGrid
          columns={3}
          stats={[
            { label: "Open roles", value: String(company.postings.length), icon: "💼", tone: "primary" },
            { label: "Skill tests", value: String(company.tests.length), icon: "🎯" },
            { label: "Head office", value: company.account?.hqLocation || company.postings[0]?.location || "—", icon: "📍" },
          ]}
        />

        <Section title={`Open roles (${company.postings.length})`}>
          {company.postings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing open right now.</p>
          ) : (
            <div className="space-y-2">
              {company.postings.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-3.5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-foreground truncate">{p.title}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {p.location} · {p.type} · {formatStipendShort(p)} · closes {formatDate(p.deadline)}
                    </div>
                  </div>
                  <Badge tone="neutral">{p.domain}</Badge>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title={`Skill tests they host (${company.tests.length})`} description="Sitting one of these puts a verified score on your profile.">
          {company.tests.length === 0 ? (
            <p className="text-sm text-muted-foreground">None published.</p>
          ) : (
            <div className="space-y-2">
              {company.tests.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-3.5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-foreground truncate">{t.title}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {t.domain} · {t.mode} · {t.duration}
                    </div>
                  </div>
                  {t.price > 0 ? <Badge tone="amber">₹{t.price}</Badge> : <Badge tone="green">Free</Badge>}
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </Modal>
  );
}

function RequestModal({ mentor, onSubmit, onClose }) {
  const [message, setMessage] = useState("");
  return (
    <Modal
      title={`Ask ${mentor.name} to mentor you`}
      description="They see your name, department and this message in their notifications."
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" className="flex-1" onClick={() => onSubmit(message)}>
            Send request
          </Button>
        </div>
      }
    >
      <Field
        label="Why them?"
        hint="A specific ask gets a faster answer than a general one — name the area you want help with."
      >
        <TextArea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="I'd like guidance on choosing a capstone project in distributed systems."
          maxLength={400}
        />
      </Field>
    </Modal>
  );
}
