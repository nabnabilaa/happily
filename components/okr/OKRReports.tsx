"use client";

import React, { useState, useEffect } from "react";
import HPGlyph from "@/components/ui/HPGlyph";
import { HP_TOKENS } from "@/lib/constants";

interface OKRReportsProps {
  period: string;
}

export default function OKRReports({ period }: OKRReportsProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterApproval, setFilterApproval] = useState("");
  const [filterDivision, setFilterDivision] = useState("");
  const [divisions, setDivisions] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ period });
        if (filterApproval) params.set("approvalType", filterApproval);
        if (filterDivision) params.set("divisionId", filterDivision);

        const [reportRes, divRes] = await Promise.all([
          fetch(`/api/okr/reports?${params}`),
          fetch("/api/okr/divisions"),
        ]);
        const reportData = await reportRes.json();
        const divData = await divRes.json();
        setData(reportData);
        if (divData.divisions) setDivisions(divData.divisions);
      } catch (e) {
        console.error("Failed to load reports:", e);
      }
      setLoading(false);
    };
    load();
  }, [period, filterApproval, filterDivision]);

  const exportCSV = () => {
    if (!data?.tasks) return;
    const headers = ["Task", "Assignee", "Status", "Approval Type", "Division", "Key Result"];
    const rows = data.tasks.map((t: any) => [
      t.title, t.assignee_name || "", t.status, t.approval_type || "-", t.division_name || "-", t.kr_title || "-"
    ]);
    const csv = [headers, ...rows].map(r => r.map((c: string) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `okr-report-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "var(--hp-ink-mute)" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
        <div style={{ fontWeight: 700 }}>Memuat laporan...</div>
      </div>
    );
  }

  const stats = data?.stats || {};

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <select
          className="okr-form-select"
          style={{ flex: 1, minWidth: 140 }}
          value={filterDivision}
          onChange={e => setFilterDivision(e.target.value)}
        >
          <option value="">Semua Divisi</option>
          {divisions.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select
          className="okr-form-select"
          style={{ flex: 1, minWidth: 140 }}
          value={filterApproval}
          onChange={e => setFilterApproval(e.target.value)}
        >
          <option value="">Semua Approval</option>
          <option value="reviewed">✓ Reviewed</option>
          <option value="self_approved">⚡ Self-Approved</option>
        </select>
        <button className="okr-btn primary" onClick={exportCSV}>
          <HPGlyph name="download" size={14} color="#fff" />
          Export CSV
        </button>
      </div>

      {/* Stats Grid */}
      <div className="okr-stats-grid" style={{ marginBottom: 20 }}>
        <div className="okr-stat-card">
          <div className="okr-stat-value">{stats.total_tasks || 0}</div>
          <div className="okr-stat-label">Total Task</div>
        </div>
        <div className="okr-stat-card">
          <div className="okr-stat-value" style={{ color: "#4A7C59" }}>{stats.done_tasks || 0}</div>
          <div className="okr-stat-label">Selesai</div>
        </div>
        <div className="okr-stat-card">
          <div className="okr-stat-value" style={{ color: "#C79600" }}>{stats.review_tasks || 0}</div>
          <div className="okr-stat-label">Review</div>
        </div>
        <div className="okr-stat-card">
          <div className="okr-stat-value" style={{ color: "#3B6FA0" }}>{stats.in_progress_tasks || 0}</div>
          <div className="okr-stat-label">In Progress</div>
        </div>
        <div className="okr-stat-card">
          <div className="okr-stat-value" style={{ color: "#1D3557" }}>{stats.reviewed_count || 0}</div>
          <div className="okr-stat-label">Reviewed</div>
        </div>
        <div className="okr-stat-card">
          <div className="okr-stat-value" style={{ color: "#7B6BB5" }}>{stats.self_approved_count || 0}</div>
          <div className="okr-stat-label">Self-Approved</div>
        </div>
      </div>

      {/* OKR Overview */}
      <div className="okr-section-head">
        <div className="okr-section-title">OKR Overview ({data?.okrs?.length || 0})</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {(data?.okrs || []).map((okr: any) => (
          <div key={okr.id} style={{
            padding: "12px 16px", background: "var(--hp-card)",
            border: "1.5px solid var(--hp-line)", borderRadius: 12,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <span className={`okr-type-badge ${okr.type}`} style={{ fontSize: 9 }}>
              {okr.type === "company" ? "🏢" : okr.type === "team" ? "👥" : "👤"} {okr.type}
            </span>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "var(--hp-ink)" }}>
              {okr.objective_title}
            </div>
            {okr.division_name && (
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--hp-ink-mute)" }}>
                {okr.division_name}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Tasks Table */}
      <div className="okr-section-head">
        <div className="okr-section-title">Task Details ({data?.tasks?.length || 0})</div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{
          width: "100%", borderCollapse: "collapse",
          fontSize: 12, fontFamily: "var(--hp-font)",
        }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--hp-line)" }}>
              {["Task", "Assignee", "Status", "Approval", "Divisi", "Key Result"].map(h => (
                <th key={h} style={{
                  padding: "10px 12px", textAlign: "left",
                  fontWeight: 800, fontSize: 11, color: "var(--hp-ink-mute)",
                  textTransform: "uppercase", letterSpacing: 0.5,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.tasks || []).map((t: any) => (
              <tr key={t.id} style={{ borderBottom: "1px solid var(--hp-line-soft)" }}>
                <td style={{ padding: "10px 12px", fontWeight: 700, color: "var(--hp-ink)" }}>{t.title}</td>
                <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--hp-ink-soft)" }}>{t.assignee_name || "-"}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span className={`status-badge ${t.status}`}>
                    {t.status === "todo" ? "To Do" : t.status === "in_progress" ? "In Progress" : t.status === "review" ? "Review" : "Done"}
                  </span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  {t.approval_type ? (
                    <span className={`status-badge ${t.approval_type}`}>
                      {t.approval_type === "reviewed" ? "Reviewed" : "Self-Approved"}
                    </span>
                  ) : "-"}
                </td>
                <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--hp-ink-mute)" }}>{t.division_name || "-"}</td>
                <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--hp-ink-mute)", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis" }}>{t.kr_title || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
