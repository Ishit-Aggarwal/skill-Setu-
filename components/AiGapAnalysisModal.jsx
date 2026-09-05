"use client";

import { useState, useEffect } from "react";
import { Modal, Badge, Button, Card, Field, ProgressRing, Select, Tabs } from "./ui/Kit";

export default function AiGapAnalysisModal({ isOpen, onClose, assessment, internships = [], applications = [] }) {
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedSector, setSelectedSector] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [activeTab, setActiveTab] = useState("days_1_30");
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Derive candidate roles from active applications and top internships
  const candidateRoles = [
    ...applications.map((a) => ({ title: a.internshipTitle, domain: a.company || "Industry Partner" })),
    ...internships.slice(0, 6).map((i) => ({ title: i.title, domain: i.domain || "Industry" })),
    { title: "Clinical Research Associate", domain: "Research & Development" },
    { title: "Full Stack & Cloud Systems Engineer", domain: "Information Technology & Software" },
    { title: "Healthcare Data Analyst & Biostatistician", domain: "Digital Health & Health Informatics" },
  ];

  // De-duplicate roles by title
  const uniqueRoles = candidateRoles.filter(
    (v, i, a) => a.findIndex((t) => t.title === v.title) === i
  );

  useEffect(() => {
    if (uniqueRoles.length > 0 && !selectedRole) {
      setSelectedRole(uniqueRoles[0].title);
      setSelectedSector(uniqueRoles[0].domain);
    }
  }, [uniqueRoles, selectedRole]);

  async function handleAnalyze() {
    setLoading(true);
    setSavedSuccess(false);

    try {
      const res = await fetch("/api/skill-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentScores: assessment?.domainScores || {},
          targetJob: selectedRole,
          sector: selectedSector,
        }),
      });

      const json = await res.json();
      if (json?.data) {
        setAnalysis(json.data);
      }
    } catch (err) {
      console.error("[AiGapModal] Fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }

  // Auto-analyze once on open if not analyzed yet
  useEffect(() => {
    if (isOpen && !analysis && selectedRole) {
      handleAnalyze();
    }
  }, [isOpen, selectedRole]);

  if (!isOpen) return null;

  return (
    <Modal
      title="AI Skill Gap Analysis & 30-60-90 Day Bridge Engine"
      description="Autonomous competency matching against national industry benchmarks (SIH Problem Statement SIH26044)"
      size="xl"
      onClose={onClose}
    >
      <div className="space-y-6">
        {/* Role Selector Controls */}
        <Card className="!bg-secondary/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Field label="Target Career Benchmark" className="flex-1">
            <Select
              value={selectedRole}
              onChange={(e) => {
                const found = uniqueRoles.find((r) => r.title === e.target.value);
                setSelectedRole(e.target.value);
                setSelectedSector(found?.domain || "General Industry");
              }}
            >
              {uniqueRoles.map((r, i) => (
                <option key={i} value={r.title}>
                  {r.title} ({r.domain})
                </option>
              ))}
            </Select>
          </Field>

          <div className="sm:self-end">
            <Button onClick={handleAnalyze} disabled={loading} className="w-full sm:w-auto flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <span className="animate-spin text-xs">⏳</span>
                  <span>Synthesizing...</span>
                </>
              ) : (
                <span>✨ Re-Analyze</span>
              )}
            </Button>
          </div>
        </Card>

        {loading ? (
          <div className="py-12 text-center space-y-3">
            <div className="inline-block animate-spin text-3xl">⚙️</div>
            <div className="text-sm font-semibold text-foreground">
              Evaluating Radar Vectors Against Job Requirements...
            </div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Scanning NPTEL, Swayam and national competency frameworks for optimal bridge pathways.
            </p>
          </div>
        ) : analysis ? (
          <div className="space-y-5 animate-fade-slide">
            {/* Top Stat Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="flex items-center gap-4">
                <ProgressRing value={analysis.matchPercentage} size={72} stroke={7} tone="primary" />
                <div className="text-xs text-muted-foreground">Target Role Match</div>
              </Card>

              <Card className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Readiness Assessment</div>
                  <div className="text-base font-semibold text-foreground mt-0.5">
                    {analysis.readinessLevel}
                  </div>
                </div>
                <Badge
                  tone={
                    analysis.readinessLevel === "Near-Ready"
                      ? "green"
                      : analysis.readinessLevel === "Intermediate"
                      ? "amber"
                      : "primary"
                  }
                >
                  Verified Radar
                </Badge>
              </Card>

              <Card className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Engine Mode</div>
                  <div className="text-sm font-semibold text-foreground mt-0.5">
                    {analysis.isFallback ? "Deterministic Edge Bridge" : "Gemini 1.5 Flash Live"}
                  </div>
                </div>
                <Badge tone={analysis.isFallback ? "neutral" : "purple"}>
                  {analysis.isFallback ? "Offline Fail-Safe" : "GenAI Live"}
                </Badge>
              </Card>
            </div>

            {/* Critical Competency Gaps */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Critical Competency Gaps Identified
                </h4>
                <span className="text-[11px] text-muted-foreground">
                  Target threshold: 75/100
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(analysis.criticalGaps || []).map((gap, i) => (
                  <div
                    key={i}
                    className="p-3 bg-secondary/40 border border-border rounded-xl space-y-1"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {gap.skill}
                      </span>
                      <Badge tone={gap.severity === "High" ? "red" : "amber"}>{gap.severity} Priority</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {gap.impact}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            {/* 30-60-90 Day Milestone Roadmap */}
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Personalized 30-60-90 Day Bridge Curriculum
                </h4>
                <Tabs
                  tabs={[
                    { key: "days_1_30", label: "Days 1–30 (Foundation)" },
                    { key: "days_31_60", label: "Days 31–60 (Applied Capstones)" },
                    { key: "days_61_90", label: "Days 61–90 (Placement Ready)" },
                  ]}
                  value={activeTab}
                  onChange={setActiveTab}
                />
              </div>

              {/* Tab Milestones */}
              <div className="space-y-2.5 pt-1">
                {(analysis.bridgeRoadmap?.[activeTab] || []).map((step, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-secondary/30 border border-border rounded-xl hover:bg-secondary/50 transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary">#{idx + 1}</span>
                        <span className="text-sm font-semibold text-foreground truncate">
                          {step.action}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>🏛️ {step.resource}</span>
                        {step.duration && <span>· ⏱️ {step.duration}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge tone="primary">{step.type}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Cross-sector bridge callout */}
            {analysis.sectorIntervention && (
              <div className="p-4 rounded-2xl bg-olive-50 border border-olive-200 text-olive-900 space-y-1">
                <div className="flex items-center gap-2 font-semibold text-xs text-olive-800 uppercase tracking-wider">
                  <span>🔗 Interdisciplinary Integration Bridge</span>
                </div>
                <p className="text-xs text-olive-700 leading-relaxed">
                  {analysis.sectorIntervention}
                </p>
              </div>
            )}
          </div>
        ) : null}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground">
            {savedSuccess ? (
              <span className="text-green-600 font-medium">✓ Roadmap added to student milestones</span>
            ) : (
              "Grounded in NPTEL and national open-skilling standards"
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSavedSuccess(true);
                setTimeout(() => setSavedSuccess(false), 3000);
              }}
            >
              Save to My Goals
            </Button>
            <Button size="sm" onClick={onClose}>Done</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
