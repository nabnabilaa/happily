"use client";

import React, { useState, useEffect } from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import Modal from "@/components/ui/Modal";
import HPGlyph from "@/components/ui/HPGlyph";
import HPAvatar from "@/components/ui/HPAvatar";

interface EditUserModalProps {
  onClose: () => void;
  user: any;
  managers: any[];
  onSave: (updates: any) => void;
  onDelete: () => void;
}

export default function EditUserModal({ onClose, user, managers, onSave, onDelete }: EditUserModalProps) {
  const [form, setForm] = useState({
    name: user.name || "",
    role: user.role || "employee",
    managerId: user.manager_id || "",
    jobTitle: user.job_title || "",
    department: user.department || ""
  });

  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/hr/departments").then(r => r.json()).then(data => {
      if (data.departments) setDepartments(data.departments);
    });
  }, []);

  const handleSave = () => {
    onSave({
      managerId: form.managerId,
      jobTitle: form.jobTitle,
      department: form.department
    });
    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px', borderRadius: 16, border: `1.5px solid ${HP_TOKENS.line}`,
    fontFamily: HP_FONT, fontSize: 14, fontWeight: 700, outline: 'none', background: HP_TOKENS.card, boxSizing: 'border-box'
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: 'none',
    background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 12px center`,
    backgroundSize: '16px'
  };

  return (
    <Modal onClose={onClose} title="Kelola Karyawan 👤">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 10 }}>
        
        {/* User Identity Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, background: HP_TOKENS.paper, borderRadius: 20 }}>
          <HPAvatar name={user.name} size={60} image={user.avatar_image} />
          <div>
            <div style={{ ...HP_TEXT.h, fontSize: 18 }}>{user.name}</div>
            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700 }}>{user.email}</div>
          </div>
        </div>

        <div>
          <label style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 900, marginBottom: 8, display: 'block' }}>MANAGER</label>
          <select 
            value={form.managerId} 
            onChange={e => setForm({...form, managerId: e.target.value})} 
            style={selectStyle}
          >
            <option value="">No Manager</option>
            {managers.filter(m => m.id !== user.id).map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 900, marginBottom: 8, display: 'block' }}>DEPARTMENT</label>
          <select 
            value={form.department} 
            onChange={e => setForm({...form, department: e.target.value})} 
            style={selectStyle}
          >
            <option value="">Pilih Departemen...</option>
            {departments.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 900, marginBottom: 8, display: 'block' }}>JOB TITLE</label>
          <input 
            placeholder="e.g. Senior Developer" 
            value={form.jobTitle} 
            onChange={e => setForm({...form, jobTitle: e.target.value})} 
            style={inputStyle} 
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
          <button 
            onClick={() => { if(confirm("Hapus user ini selamanya?")) { onDelete(); onClose(); } }}
            className="hp-tap"
            style={{
              padding: '16px', borderRadius: 16, background: HP_TOKENS.coralSoft,
              color: HP_TOKENS.coral, border: 'none', fontFamily: HP_FONT, fontWeight: 800, cursor: 'pointer'
            }}
          >
            <HPGlyph name="trash" size={20} color={HP_TOKENS.coral} />
          </button>
          
          <button 
            onClick={handleSave}
            className="hp-tap"
            style={{
              flex: 1, padding: '16px', borderRadius: 20, 
              background: HP_TOKENS.ink, color: '#F4F7F9',
              border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
            }}
          >
            <HPGlyph name="check" size={20} color="#F4F7F9" />
            <span>Simpan Perubahan</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
