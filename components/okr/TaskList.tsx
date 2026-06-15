"use client";

import React, { useState } from "react";
import TaskCard from "./TaskCard";

interface TaskListProps {
  tasks: any[];
  userRole: string;
  userId: string;
  onAction: (taskId: string, action: string, revisionNote?: string) => Promise<void>;
  showAssignee?: boolean;
  filter?: string;
}

export default function TaskList({ tasks, userRole, userId, onAction, showAssignee, filter }: TaskListProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredTasks = statusFilter === "all" ? tasks : tasks.filter(t => t.status === statusFilter);

  const statusCounts = {
    all: tasks.length,
    todo: tasks.filter(t => t.status === "todo").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    review: tasks.filter(t => t.status === "review").length,
    done: tasks.filter(t => t.status === "done").length,
  };

  return (
    <div>
      {/* Status filter pills */}
      {!filter && (
        <div style={{
          display: "flex", gap: 6, marginBottom: 14,
          overflowX: "auto", scrollbarWidth: "none", paddingBottom: 4,
        }}>
          {(["all", "todo", "in_progress", "review", "done"] as const).map(s => (
            <button
              key={s}
              className={`okr-btn sm ${statusFilter === s ? "primary" : "ghost"}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === "all" ? "Semua" : s === "todo" ? "To Do" : s === "in_progress" ? "Proses" : s === "review" ? "Review" : "Selesai"}
              {statusCounts[s] > 0 && (
                <span style={{
                  marginLeft: 4, fontSize: 10, fontWeight: 800,
                  background: statusFilter === s ? "rgba(255,255,255,0.3)" : "var(--hp-line-soft)",
                  padding: "1px 6px", borderRadius: 99,
                }}>
                  {statusCounts[s]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <div className="okr-empty">
          <div className="okr-empty-icon">📋</div>
          <div className="okr-empty-title">
            {filter === "review" ? "Tidak ada task yang perlu di-review" : "Tidak ada task"}
          </div>
          <div className="okr-empty-desc">
            {filter === "review"
              ? "Semua task sudah di-review atau belum ada yang submit."
              : "Task akan muncul setelah dibuat dari Key Result."}
          </div>
        </div>
      ) : (
        <div className="task-list">
          {filteredTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              userRole={userRole}
              userId={userId}
              onAction={onAction}
              showAssignee={showAssignee}
            />
          ))}
        </div>
      )}
    </div>
  );
}
