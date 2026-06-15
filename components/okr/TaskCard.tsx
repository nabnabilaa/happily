"use client";

import React, { useState } from "react";
import HPGlyph from "@/components/ui/HPGlyph";
import { HP_TOKENS } from "@/lib/constants";
import RevisionModal from "./RevisionModal";

interface TaskCardProps {
  task: any;
  userRole: string;
  userId: string;
  onAction: (taskId: string, action: string, revisionNote?: string) => Promise<void>;
  showAssignee?: boolean;
}

const STATUS_LABELS: Record<string, { label: string; emoji: string }> = {
  todo: { label: "To Do", emoji: "📋" },
  in_progress: { label: "In Progress", emoji: "🔄" },
  review: { label: "Review", emoji: "👀" },
  done: { label: "Done", emoji: "✅" },
};

export default function TaskCard({ task, userRole, userId, onAction, showAssignee }: TaskCardProps) {
  const [busy, setBusy] = useState(false);
  const [showRevise, setShowRevise] = useState(false);
  const statusInfo = STATUS_LABELS[task.status] || { label: task.status, emoji: "📋" };

  const isAssignee = task.assignee_id === userId;
  const isSelfTask = task.created_by === task.assignee_id;

  const handleAction = async (action: string, note?: string) => {
    setBusy(true);
    await onAction(task.id, action, note);
    setBusy(false);
  };

  return (
    <>
      <div className="task-card" style={{ opacity: busy ? 0.6 : 1 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--hp-line-soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 18 }}>{statusInfo.emoji}</span>
        </div>

        <div className="task-card-body">
          <div className="task-card-title">{task.title}</div>
          <div className="task-card-sub">
            <span className={`status-badge ${task.status}`}>{statusInfo.label}</span>
            {showAssignee && task.assignee_name && (
              <>
                <span style={{ color: "var(--hp-line)" }}>·</span>
                <HPGlyph name="user" size={11} color={HP_TOKENS.inkMute} />
                <span>{task.assignee_name}</span>
              </>
            )}
            {task.kr_title && (
              <>
                <span style={{ color: "var(--hp-line)" }}>·</span>
                <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  KR: {task.kr_title}
                </span>
              </>
            )}
            {task.approval_type && (
              <>
                <span style={{ color: "var(--hp-line)" }}>·</span>
                <span className={`status-badge ${task.approval_type}`}>
                  {task.approval_type === "reviewed" ? "✓ Reviewed" : "⚡ Self-Approved"}
                </span>
              </>
            )}
          </div>

          {/* Revision note */}
          {task.revision_note && task.status === "in_progress" && (
            <div className="revision-note">
              <HPGlyph name="alert" size={14} color="#C79600" />
              <span>Revisi: {task.revision_note}</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="okr-actions" style={{ flexDirection: "column" }}>
          {/* Employee: Start task */}
          {task.status === "todo" && isAssignee && (
            <button className="okr-btn primary sm" onClick={() => handleAction("start")} disabled={busy}>
              ▶ Start
            </button>
          )}

          {/* Employee: Submit for Review */}
          {task.status === "in_progress" && isAssignee && userRole === "employee" && (
            <button className="okr-btn warning sm" onClick={() => handleAction("submit_review")} disabled={busy}>
              📤 Submit Review
            </button>
          )}

          {/* Manager/HR: Mark as Done (self-approve for own tasks) */}
          {(task.status === "in_progress" || task.status === "todo") && isAssignee && (userRole === "manager" || userRole === "hr") && isSelfTask && (
            <button className="okr-btn success sm" onClick={() => handleAction("mark_done")} disabled={busy}>
              ✅ Mark Done
            </button>
          )}

          {/* Manager: Accept reviewed task */}
          {task.status === "review" && userRole === "manager" && (
            <>
              <button className="okr-btn success sm" onClick={() => handleAction("accept")} disabled={busy}>
                ✅ Accept
              </button>
              <button className="okr-btn danger sm" onClick={() => setShowRevise(true)} disabled={busy}>
                ↩ Revise
              </button>
            </>
          )}
        </div>
      </div>

      {/* Revision Modal */}
      {showRevise && (
        <RevisionModal
          taskTitle={task.title}
          onClose={() => setShowRevise(false)}
          onSubmit={(note) => {
            setShowRevise(false);
            handleAction("revise", note);
          }}
        />
      )}
    </>
  );
}
