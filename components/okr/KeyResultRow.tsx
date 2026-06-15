"use client";

import React from "react";
import HPGlyph from "@/components/ui/HPGlyph";
import { HP_TOKENS } from "@/lib/constants";

interface KeyResultRowProps {
  kr: any;
  userRole: string;
  userId: string;
  onCreateTask?: (krId: string) => void;
  onRefresh?: () => void;
}

export default function KeyResultRow({ kr, userRole, userId, onCreateTask, onRefresh }: KeyResultRowProps) {
  const progress = kr.target_value > 0 ? Math.min(100, Math.round((kr.current_value / kr.target_value) * 100)) : 0;
  const progressClass = progress >= 70 ? "high" : progress >= 40 ? "mid" : "low";
  const taskCount = kr.tasks?.length || 0;
  const doneCount = kr.tasks?.filter((t: any) => t.status === "done").length || 0;

  return (
    <div className="kr-row">
      <div className="kr-row-header">
        <HPGlyph name="target" size={14} color={HP_TOKENS.primary} />
        <div className="kr-row-title">{kr.title}</div>
        <div className="kr-row-value">
          {kr.current_value}/{kr.target_value} {kr.unit}
        </div>
      </div>

      {/* Progress */}
      <div className="okr-progress-bar" style={{ height: 6 }}>
        <div
          className={`okr-progress-fill ${progressClass}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Tasks summary + Add Task button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--hp-ink-mute)" }}>
          {taskCount > 0 ? (
            <>
              <HPGlyph name="check" size={11} color={HP_TOKENS.sage} /> {doneCount}/{taskCount} task selesai
            </>
          ) : (
            "Belum ada task"
          )}
        </div>
        {(userRole === "manager" || userRole === "hr") && (
          <button
            className="okr-btn ghost sm"
            onClick={() => onCreateTask?.(kr.id)}
          >
            <HPGlyph name="plus" size={11} color={HP_TOKENS.inkMute} />
            Task
          </button>
        )}
      </div>

      {/* Inline task list */}
      {kr.tasks && kr.tasks.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          {kr.tasks.map((task: any) => (
            <div key={task.id} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 10px", borderRadius: 8,
              background: "var(--hp-paper)", fontSize: 12, fontWeight: 600,
            }}>
              <span className={`status-badge ${task.status}`}>
                {task.status === "todo" ? "📋" : task.status === "in_progress" ? "🔄" : task.status === "review" ? "👀" : "✅"}
              </span>
              <span style={{ flex: 1, color: "var(--hp-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {task.title}
              </span>
              {task.assignee_name && (
                <span style={{ color: "var(--hp-ink-mute)", fontSize: 11 }}>
                  {task.assignee_name}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
