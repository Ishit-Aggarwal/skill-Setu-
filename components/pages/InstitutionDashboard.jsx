"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import { useAuth } from "../../lib/auth";
import { listUsersByRole, listInternships, listApplications } from "../../lib/store";

/**
 * A dedicated institution home page — previously this route just rendered the
 * same generic analytics component every other role sees, with no
 * institution-specific content at all (no student scoping, no partnership
 * view). This surfaces what a Training & Placement Officer actually needs:
 * how THEIR students are doing, and which companies actually engage with them.
 */
export default function InstitutionDashboard() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [internships, setInternships] = useState([]);
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    setStudents(listUsersByRole("student").filter((s) => s.institution === user.instituteName));
    setInternships(listInternships());
    setApplications(listApplications());
  }, [user]);

  const studentIds = useMemo(() => new Set(students.map((s) => s.id)), [students]);
  const myApplications = useMemo(() => applications.filter((a) => studentIds.has(a.studentId)), [applications, studentIds]);

  const kpis = useMemo(() => {
    const hired = myApplications.filter((a) => a.status === "Hired").length;
    const placementRate = myApplications.length ? Math.round((hired / myApplications.length) * 100) : 0;
    const partnerCompanies = new Set(myApplications.map((a) => a.company));
    return [
      { label: "Students", value: String(students.length) },
      { label: "Partner Companies", value: String(partnerCompanies.size) },
      { label: "Applications Sent", value: String(myApplications.length) },
      { label: "Placement Rate", value: `${placementRate}%` },
    ];
  }, [students, myApplications]);

  const partnerships = useMemo(() => {
    const byCompany = {};
    myApplications.forEach((a) => {
      if (!byCompany[a.company]) byCompany[a.company] = { company: a.company, applications: 0, hired: 0 };
      byCompany[a.company].applications++;
      if (a.status === "Hired") byCompany[a.company].hired++;
    });
    return Object.values(byCompany)
      .map((p) => ({
        ...p,
        status: p.hired > 0 ? "Active partner" : p.applications > 0 ? "Engaged" : "No activity yet",
      }))
      .sort((a, b) => b.hired - a.hired || b.applications - a.applications);
  }, [myApplications]);

  const statusColor = {
    "Active partner": "text-green-600 bg-green-50",
    Engaged: "text-blue-600 bg-blue-50",
    "No activity yet": "text-muted-foreground bg-muted",
  };

  return (
    <DashboardLayout activePage="institution-dashboard" title="Institution Dashboard">
      <div className="animate-fade-slide space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">{user.instituteName || "Your Institution"}</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Placement oversight across your registered students</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="bg-card border border-border rounded-2xl p-4 hover:shadow-sm transition-shadow">
              <div className="text-xs text-muted-foreground mb-1">{kpi.label}</div>
              <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
            </div>
          ))}
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-1 text-sm">Industry Partnerships</h3>
          <p className="text-xs text-muted-foreground mb-4">Derived from real activity — companies your students have actually applied to or been hired by, not a static directory.</p>
          {partnerships.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center text-sm text-muted-foreground">
              No applications from your students yet — partnerships will appear here as they apply and get hired.
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Company</th>
                    <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Applications</th>
                    <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Hired</th>
                    <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {partnerships.map((p, i) => (
                    <tr key={p.company} className={`border-b border-border last:border-0 ${i % 2 ? "bg-secondary/10" : ""}`}>
                      <td className="px-4 py-3 font-medium text-foreground">{p.company}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{p.applications}</td>
                      <td className="px-4 py-3 text-center text-foreground font-medium">{p.hired}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[p.status]}`}>{p.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
