"use client";

import React, { useState, useEffect } from "react";

interface CreateOKRModalProps {
  onClose: () => void;
  onDone: () => void;
  userRole: string;
  userId: string;
  period: string;
  parentOKRs: any[];
  members?: any[];
}

export default function CreateOKRModal({ onClose, onDone, userRole, userId, period, parentOKRs, members = [] }: CreateOKRModalProps) {
  const [type, setType] = useState<string>(
    userRole === "hr" ? "company" : userRole === "manager" ? "team" : "individual"
  );
  const [assignees, setAssignees] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [parentId, setParentId] = useState("");
  const [saving, setSaving] = useState(false);

  // Allowed types per role
  const typeOptions = (() => {
    const opts: { value: string; label: string }[] = [];
    if (userRole === "hr") {
      opts.push({ value: "company", label: "🏢 Company OKR" });
      opts.push({ value: "individual", label: "👤 Individual OKR (My Work)" });
    }
    if (userRole === "manager") {
      opts.push({ value: "team", label: "👥 Team OKR" });
      opts.push({ value: "assigned", label: "🧑‍🤝‍🧑 Assigned OKR (Tugaskan ke Anggota)" });
      opts.push({ value: "individual", label: "👤 Individual OKR (My Work)" });
    }
    if (userRole === "employee") {
      opts.push({ value: "individual", label: "👤 Individual OKR" });
    }
    return opts;
  })();

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/okr/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          type,
          objective_title: title.trim(),
          period,
          parent_okr_id: parentId || null,
          assignees: type === "assigned" ? assignees : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal membuat OKR");
        setSaving(false);
        return;
      }
      onDone();
    } catch (e) {
      alert("Gagal membuat OKR");
      setSaving(false);
    }
  };

  return (
    <div className="okr-modal-overlay" onClick={onClose}>
      <div className="okr-modal" onClick={e => e.stopPropagation()}>
        <div className="okr-modal-title">🎯 Buat OKR Baru</div>

        <div className="okr-form-group">
          <label className="okr-form-label">Tipe OKR</label>
          <select
            className="okr-form-select"
            value={type}
            onChange={e => { setType(e.target.value); setAssignees([]); }}
          >
            {typeOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {type === "assigned" && members.length > 0 && (
          <div className="okr-form-group">
            <label className="okr-form-label">Tugaskan ke (bisa pilih lebih dari 1)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 150, overflowY: 'auto', background: '#fff', border: '1px solid #e1e4e8', borderRadius: 8, padding: '12px' }}>
              {members.map(m => (
                <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--hp-font-body)' }}>
                  <input
                    type="checkbox"
                    checked={assignees.includes(m.id)}
                    onChange={(e) => {
                      if (e.target.checked) setAssignees([...assignees, m.id]);
                      else setAssignees(assignees.filter(id => id !== m.id));
                    }}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  {m.name} <span style={{ color: 'var(--hp-ink-mute)', fontSize: 11 }}>({m.role})</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="okr-form-group">
          <label className="okr-form-label">Objective</label>
          <textarea
            className="okr-form-textarea"
            placeholder="Tuliskan objective yang ingin dicapai..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        {(type === "team" || type === "individual" || type === "assigned") && parentOKRs.length > 0 && (
          <div className="okr-form-group">
            <label className="okr-form-label">Parent OKR (opsional)</label>
            <select
              className="okr-form-select"
              value={parentId}
              onChange={e => setParentId(e.target.value)}
            >
              <option value="">-- Tidak terhubung --</option>
              {parentOKRs.map(o => (
                <option key={o.id} value={o.id}>
                  {o.type === "company" ? "🏢" : "👥"} {o.objective_title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="okr-form-group">
          <label className="okr-form-label">Periode</label>
          <input
            className="okr-form-input"
            value={period}
            disabled
            style={{ opacity: 0.6 }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          <button className="okr-btn ghost" onClick={onClose}>Batal</button>
          <button
            className="okr-btn primary"
            disabled={!title.trim() || saving || (type === 'assigned' && assignees.length === 0)}
            onClick={handleSubmit}
          >
            {saving ? "Menyimpan..." : "Buat OKR"}
          </button>
        </div>
      </div>
    </div>
  );
}
