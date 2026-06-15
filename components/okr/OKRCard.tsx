"use client";

import React, { useState } from "react";
import KeyResultRow from "./KeyResultRow";
import HPGlyph from "@/components/ui/HPGlyph";
import { HP_TOKENS } from "@/lib/constants";

interface OKRCardProps {
  okr: any;
  userRole: string;
  userId: string;
  onCreateTask?: (krId: string) => void;
  onRefresh?: () => void;
}

export default function OKRCard({ okr, userRole, userId, onCreateTask, onRefresh }: OKRCardProps) {
  const [expanded, setExpanded] = useState(false);

  const progressClass = okr.progress >= 70 ? "high" : okr.progress >= 40 ? "mid" : "low";

  return (
    <div className="okr-card">
      <div className="okr-card-header">
        <span className={`okr-type-badge ${okr.type}`}>
          {okr.type === "company" ? "🏢 Company" : okr.type === "team" ? "👥 Team" : "👤 Individual"}
        </span>
        <div style={{ flex: 1 }}>
          <div className="okr-card-title">{okr.objective_title}</div>
        </div>
        <button
          className="okr-btn ghost sm"
          onClick={() => setExpanded(!expanded)}
          style={{ flexShrink: 0 }}
        >
          <HPGlyph name={expanded ? "chevron-up" : "chevron-down"} size={14} color={HP_TOKENS.inkMute} />
        </button>
      </div>

      {/* Meta info */}
      <div className="okr-card-meta">
        {okr.owner_name && (
          <>
            <HPGlyph name="user" size={12} color={HP_TOKENS.inkMute} />
            <span>{okr.owner_name}</span>
          </>
        )}
        {okr.division_name && (
          <>
            <span style={{ color: "var(--hp-line)" }}>·</span>
            <HPGlyph name="people" size={12} color={HP_TOKENS.inkMute} />
            <span>{okr.division_name}</span>
          </>
        )}
        <span style={{ color: "var(--hp-line)" }}>·</span>
        <span>{okr.period}</span>
      </div>

      {/* Progress */}
      <div className="okr-progress-bar">
        <div
          className={`okr-progress-fill ${progressClass}`}
          style={{ width: `${Math.min(100, okr.progress || 0)}%` }}
        />
      </div>
      <div className="okr-progress-label">{okr.progress || 0}% selesai</div>

      {/* Expanded: Key Results */}
      {expanded && (
        <div style={{ marginTop: 16 }}>
          <div className="okr-section-head">
            <div className="okr-section-title" style={{ fontSize: 14 }}>
              Key Results ({okr.key_results?.length || 0})
            </div>
            {(userRole === "manager" || userRole === "hr" || okr.owner_id === userId) && (
              <button className="okr-btn ghost sm" onClick={() => {/* TODO: Add KR modal */}}>
                <HPGlyph name="plus" size={12} color={HP_TOKENS.inkMute} />
                Tambah KR
              </button>
            )}
          </div>
          <div className="kr-list">
            {(okr.key_results || []).map((kr: any) => (
              <KeyResultRow
                key={kr.id}
                kr={kr}
                userRole={userRole}
                userId={userId}
                onCreateTask={onCreateTask}
                onRefresh={onRefresh}
              />
            ))}
            {(!okr.key_results || okr.key_results.length === 0) && (
              <div style={{ padding: 16, textAlign: "center", color: "var(--hp-ink-mute)", fontSize: 13 }}>
                Belum ada Key Result
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
