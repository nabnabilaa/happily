"use client";

import React, { useState } from "react";

interface RevisionModalProps {
  taskTitle: string;
  onClose: () => void;
  onSubmit: (note: string) => void;
}

export default function RevisionModal({ taskTitle, onClose, onSubmit }: RevisionModalProps) {
  const [note, setNote] = useState("");

  return (
    <div className="okr-modal-overlay" onClick={onClose}>
      <div className="okr-modal" onClick={e => e.stopPropagation()}>
        <div className="okr-modal-title">↩ Revise Task</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--hp-ink-mute)", marginBottom: 16 }}>
          Task: <strong style={{ color: "var(--hp-ink)" }}>{taskTitle}</strong>
        </div>

        <div className="okr-form-group">
          <label className="okr-form-label">Catatan Revisi *</label>
          <textarea
            className="okr-form-textarea"
            placeholder="Jelaskan apa yang perlu diperbaiki..."
            value={note}
            onChange={e => setNote(e.target.value)}
            autoFocus
          />
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="okr-btn ghost" onClick={onClose}>Batal</button>
          <button
            className="okr-btn danger"
            disabled={!note.trim()}
            onClick={() => onSubmit(note.trim())}
          >
            Kirim Revisi
          </button>
        </div>
      </div>
    </div>
  );
}
