"use client";

import React, { useState, useEffect } from "react";

interface CreateTaskModalProps {
  onClose: () => void;
  onDone: () => void;
  userId: string;
  userRole: string;
  keyResultId?: string;
}

export default function CreateTaskModal({ onClose, onDone, userId, userRole, keyResultId }: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState(userId);
  const [dueDate, setDueDate] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Fetch employees if manager
  useEffect(() => {
    if (userRole === "manager" || userRole === "hr") {
      fetch(`/api/users`)
        .then(r => r.json())
        .then(data => {
          if (data.users) {
            // For managers, filter to same division employees
            setEmployees(data.users.filter((u: any) => u.role === "employee" || u.id === userId));
          }
        })
        .catch(() => {});
    }
  }, [userRole, userId]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/okr/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          key_result_id: keyResultId || null,
          assignee_id: assigneeId,
          title: title.trim(),
          description: description.trim() || null,
          due_date: dueDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal membuat task");
        setSaving(false);
        return;
      }
      onDone();
    } catch (e) {
      alert("Gagal membuat task");
      setSaving(false);
    }
  };

  return (
    <div className="okr-modal-overlay" onClick={onClose}>
      <div className="okr-modal" onClick={e => e.stopPropagation()}>
        <div className="okr-modal-title">📋 Buat Task Baru</div>

        <div className="okr-form-group">
          <label className="okr-form-label">Judul Task *</label>
          <input
            className="okr-form-input"
            placeholder="Apa yang harus dikerjakan?"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        <div className="okr-form-group">
          <label className="okr-form-label">Deskripsi</label>
          <textarea
            className="okr-form-textarea"
            placeholder="Detail pekerjaan (opsional)..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        {(userRole === "manager" || userRole === "hr") && employees.length > 0 && (
          <div className="okr-form-group">
            <label className="okr-form-label">Assign ke</label>
            <select
              className="okr-form-select"
              value={assigneeId}
              onChange={e => setAssigneeId(e.target.value)}
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.role}){emp.id === userId ? " — Saya" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="okr-form-group">
          <label className="okr-form-label">Deadline (opsional)</label>
          <input
            type="date"
            className="okr-form-input"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          <button className="okr-btn ghost" onClick={onClose}>Batal</button>
          <button
            className="okr-btn primary"
            disabled={!title.trim() || saving}
            onClick={handleSubmit}
          >
            {saving ? "Menyimpan..." : "Buat Task"}
          </button>
        </div>
      </div>
    </div>
  );
}
