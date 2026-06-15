"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useHP } from "@/lib/HPContext";
import "./okr.css";
import OKRCard from "./OKRCard";
import TaskList from "./TaskList";
import CreateOKRModal from "./CreateOKRModal";
import CreateTaskModal from "./CreateTaskModal";
import OKRReports from "./OKRReports";
import HPGlyph from "@/components/ui/HPGlyph";
import { HP_TOKENS } from "@/lib/constants";

interface OKRDashboardProps {
  openModal?: (name: string, props?: any) => void;
}

export default function OKRDashboard({ openModal }: OKRDashboardProps) {
  const { user, notify } = useHP();
  const [okrs, setOkrs] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("okrs");
  const [period, setPeriod] = useState("2026-Q3");
  const [showCreateOKR, setShowCreateOKR] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState<{ krId?: string } | null>(null);

  const role = user?.role || "employee";
  const userId = user?.id;

  const fetchOKRs = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/okr?userId=${userId}&period=${period}`);
      const data = await res.json();
      if (data.okrs) setOkrs(data.okrs);
    } catch (e) {
      console.error("Failed to fetch OKRs:", e);
    }
  }, [userId, period]);

  const fetchTasks = useCallback(async (filter?: string) => {
    if (!userId) return;
    try {
      const f = filter || (role === "manager" ? "team" : "my");
      const res = await fetch(`/api/okr/tasks?userId=${userId}&filter=${f}`);
      const data = await res.json();
      if (data.tasks) setTasks(data.tasks);
    } catch (e) {
      console.error("Failed to fetch tasks:", e);
    }
  }, [userId, role]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchOKRs(), fetchTasks()]);
      setLoading(false);
    };
    load();
  }, [fetchOKRs, fetchTasks]);

  const handleTaskAction = async (taskId: string, action: string, revisionNote?: string) => {
    try {
      const res = await fetch(`/api/okr/tasks/${taskId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, revision_note: revisionNote }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data.error || "Gagal update task", undefined, "error");
        return;
      }
      notify("Task berhasil diupdate!", undefined, "success");
      await Promise.all([fetchOKRs(), fetchTasks()]);
    } catch (e) {
      notify("Gagal update task", undefined, "error");
    }
  };

  const handleCreateOKRDone = () => {
    setShowCreateOKR(false);
    fetchOKRs();
    notify("OKR berhasil dibuat!", undefined, "success");
  };

  const handleCreateTaskDone = () => {
    setShowCreateTask(null);
    fetchTasks();
    notify("Task berhasil dibuat!", undefined, "success");
  };

  // Tab configuration by role
  const tabs = (() => {
    const base = [
      { key: "okrs", label: "OKR", icon: "target" },
      { key: "tasks", label: "Tasks", icon: "check" },
    ];
    if (role === "manager") {
      base.push({ key: "review", label: "Review", icon: "search" });
      base.push({ key: "mywork", label: "My Work", icon: "sparkle" });
    }
    if (role === "hr") {
      base.splice(1, 0, { key: "company", label: "Company", icon: "globe" });
      base.push({ key: "reports", label: "Reports", icon: "medal" });
      base.push({ key: "mywork", label: "My Work", icon: "sparkle" });
    }
    return base;
  })();

  // Filter OKRs by tab
  const filteredOKRs = (() => {
    if (activeTab === "company") return okrs.filter(o => o.type === "company");
    if (activeTab === "mywork") return okrs.filter(o => o.type === "individual" && o.owner_id === userId);
    return okrs;
  })();

  // Count review tasks for badge
  const reviewCount = tasks.filter(t => t.status === "review").length;

  if (loading) {
    return (
      <div className="okr-dashboard">
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--hp-ink-mute)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎯</div>
          <div style={{ fontWeight: 700 }}>Memuat OKR...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="okr-dashboard">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{
            fontFamily: "var(--hp-font-display)", fontWeight: 800,
            fontSize: "clamp(22px, 5.5vw, 28px)", color: "var(--hp-ink)",
            letterSpacing: -0.5, lineHeight: 1.15,
          }}>
            OKR & Tasks 🎯
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--hp-ink-mute)", marginTop: 4 }}>
            {role === "hr" ? "Kelola OKR seluruh organisasi" :
             role === "manager" ? "Kelola OKR tim & pekerjaan" :
             "Objectives & Key Results"}
          </div>
        </div>
        <button className="okr-btn primary" onClick={() => setShowCreateOKR(true)}>
          <HPGlyph name="plus" size={14} color="#fff" />
          <span>OKR Baru</span>
        </button>
      </div>

      {/* Period Selector */}
      <div className="okr-period-bar">
        <HPGlyph name="calendar" size={16} color={HP_TOKENS.inkMute} />
        <select
          className="okr-period-select"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="2026-Q1">Q1 2026</option>
          <option value="2026-Q2">Q2 2026</option>
          <option value="2026-Q3">Q3 2026</option>
          <option value="2026-Q4">Q4 2026</option>
        </select>
      </div>

      {/* Tab Navigation */}
      <div className="okr-tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`okr-tab${activeTab === t.key ? " active" : ""}`}
            onClick={() => {
              setActiveTab(t.key);
              if (t.key === "review") fetchTasks("review");
              else if (t.key === "mywork") fetchTasks("my");
              else if (t.key === "tasks") fetchTasks();
            }}
          >
            <HPGlyph name={t.icon} size={14} color={activeTab === t.key ? HP_TOKENS.primary : HP_TOKENS.inkMute} />
            {t.label}
            {t.key === "review" && reviewCount > 0 && (
              <span className="okr-tab-badge">{reviewCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content by Tab */}
      {(activeTab === "okrs" || activeTab === "company" || activeTab === "mywork") && (
        <div>
          {filteredOKRs.length === 0 ? (
            <div className="okr-empty">
              <div className="okr-empty-icon">🎯</div>
              <div className="okr-empty-title">Belum ada OKR</div>
              <div className="okr-empty-desc">
                {activeTab === "company" ? "Buat Company OKR untuk memulai." :
                 activeTab === "mywork" ? "Buat Individual OKR untuk pekerjaan pribadi." :
                 "Klik tombol \"OKR Baru\" untuk memulai."}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filteredOKRs.map(okr => (
                <OKRCard
                  key={okr.id}
                  okr={okr}
                  userRole={role}
                  userId={userId || ""}
                  onCreateTask={(krId) => setShowCreateTask({ krId })}
                  onRefresh={() => Promise.all([fetchOKRs(), fetchTasks()])}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {(activeTab === "tasks" || activeTab === "review") && (
        <TaskList
          tasks={tasks}
          userRole={role}
          userId={userId || ""}
          onAction={handleTaskAction}
          showAssignee={role !== "employee"}
          filter={activeTab === "review" ? "review" : undefined}
        />
      )}

      {activeTab === "reports" && role === "hr" && (
        <OKRReports period={period} />
      )}

      {/* Create OKR Modal */}
      {showCreateOKR && (
        <CreateOKRModal
          onClose={() => setShowCreateOKR(false)}
          onDone={handleCreateOKRDone}
          userRole={role}
          userId={userId || ""}
          period={period}
          parentOKRs={okrs.filter(o => o.type === "company" || o.type === "team")}
        />
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <CreateTaskModal
          onClose={() => setShowCreateTask(null)}
          onDone={handleCreateTaskDone}
          userId={userId || ""}
          userRole={role}
          keyResultId={showCreateTask.krId}
        />
      )}
    </div>
  );
}
