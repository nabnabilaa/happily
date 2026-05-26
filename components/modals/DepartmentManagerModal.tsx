"use client";

import React, { useState, useEffect } from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import Modal from "@/components/ui/Modal";
import HPGlyph from "@/components/ui/HPGlyph";
import { useHP } from "@/lib/HPContext";

interface DepartmentManagerModalProps {
  onClose: () => void;
}

export default function DepartmentManagerModal({ onClose }: DepartmentManagerModalProps) {
  const { user } = useHP();
  const [departments, setDepartments] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const fetchDepts = async () => {
    const res = await fetch("/api/hr/departments");
    const data = await res.json();
    if (data.departments) setDepartments(data.departments);
  };

  useEffect(() => { fetchDepts(); }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/hr/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), requesterId: user?.id })
      });
      if (res.ok) { setNewName(""); fetchDepts(); }
      else alert("Gagal menambah departemen (mungkin sudah ada).");
    } finally { setLoading(false); }
  };

  const handleEdit = async (id: number) => {
    if (!editName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/departments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: editName.trim(), requesterId: user?.id })
      });
      if (res.ok) { setEditingId(null); setEditName(""); fetchDepts(); }
      else alert("Gagal mengubah nama departemen.");
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus departemen ini? Karyawan di departemen ini tidak akan terhapus.")) return;
    try {
      const res = await fetch(`/api/hr/departments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, requesterId: user?.id })
      });
      if (res.ok) fetchDepts();
    } catch (e) { console.error(e); }
  };

  const inputStyle: React.CSSProperties = {
    flex: 1, padding: '12px 14px', borderRadius: 14,
    border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT,
    fontSize: 14, fontWeight: 700, outline: 'none', background: '#fff',
  };

  return (
    <Modal onClose={onClose} title="🏢 Kelola Departemen">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
        
        {/* Add Form */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Nama Departemen Baru..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            style={inputStyle}
          />
          <button
            onClick={handleAdd} disabled={loading || !newName.trim()}
            className="hp-tap"
            style={{
              padding: '0 18px', borderRadius: 14, background: HP_TOKENS.ink, color: '#fff',
              border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer',
              opacity: !newName.trim() ? 0.4 : 1,
            }}
          >
            {loading ? "..." : "+ Tambah"}
          </button>
        </div>

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 360, overflowY: 'auto' }}>
          {departments.length === 0 && (
            <div style={{ textAlign: 'center', padding: 30, color: HP_TOKENS.inkMute }}>Belum ada departemen.</div>
          )}
          {departments.map(d => (
            <div key={d.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px', borderRadius: 14,
              background: editingId === d.id ? HP_TOKENS.blueWash : HP_TOKENS.paper,
              border: `1.5px solid ${editingId === d.id ? `${HP_TOKENS.blue}40` : HP_TOKENS.lineSoft}`,
              transition: 'all 0.15s',
            }}>
              {editingId === d.id ? (
                <>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleEdit(d.id)}
                    autoFocus
                    style={{ ...inputStyle, fontSize: 13 }}
                  />
                  <button onClick={() => handleEdit(d.id)} className="hp-tap" style={{
                    padding: '6px 12px', borderRadius: 8, border: 'none',
                    background: HP_TOKENS.blue, color: '#fff',
                    fontFamily: HP_FONT, fontWeight: 800, fontSize: 11, cursor: 'pointer',
                  }}>Simpan</button>
                  <button onClick={() => setEditingId(null)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  }}>
                    <HPGlyph name="close" size={14} color={HP_TOKENS.inkMute} />
                  </button>
                </>
              ) : (
                <>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: HP_TOKENS.blueSoft, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
                  }}>🏢</div>
                  <span style={{ ...HP_TEXT.small, fontWeight: 800, color: HP_TOKENS.ink, flex: 1 }}>{d.name}</span>
                  <button
                    onClick={() => { setEditingId(d.id); setEditName(d.name); }}
                    className="hp-tap"
                    style={{
                      padding: '5px 10px', borderRadius: 8,
                      border: `1px solid ${HP_TOKENS.line}`, background: '#fff',
                      fontFamily: HP_FONT, fontWeight: 800, fontSize: 10, cursor: 'pointer',
                      color: HP_TOKENS.blue,
                    }}
                  >✏️ Edit</button>
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="hp-tap"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                  >
                    <HPGlyph name="trash" size={14} color={HP_TOKENS.coral} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
