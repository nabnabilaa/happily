"use client";

import React, { useState, useEffect } from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import Modal from "@/components/ui/Modal";
import HPGlyph from "@/components/ui/HPGlyph";

interface CreateUserModalProps {
  onClose: () => void;
  onSave: (newUser: any) => Promise<void>;
}

export default function CreateUserModal({ onClose, onSave }: CreateUserModalProps) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
    jobTitle: "",
    department: "",
    hrAccess: false
  });
  const [loading, setLoading] = useState(false);

  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/hr/departments").then(r => r.json()).then(data => {
      if (data.departments) setDepartments(data.departments);
    });
  }, []);

  const handleSave = async () => {
    if (!form.name || !form.email || !form.password) {
      alert("Nama, Email, dan Password wajib diisi!");
      return;
    }
    
    setLoading(true);
    try {
      await onSave(form);
      onClose();
    } catch (e) {
      console.error(e);
      alert("Gagal membuat user baru.");
    } finally {
      setLoading(false);
    }
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
    <Modal onClose={onClose} title="Tambah Akun Baru 👤">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 10 }}>
        
        <div>
          <label style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 900, marginBottom: 6, display: 'block' }}>NAMA LENGKAP</label>
          <input 
            placeholder="e.g. John Doe" 
            value={form.name} 
            onChange={e => setForm({...form, name: e.target.value})} 
            style={inputStyle} 
          />
        </div>

        <div>
          <label style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 900, marginBottom: 6, display: 'block' }}>EMAIL</label>
          <input 
            type="email"
            placeholder="name@company.com" 
            value={form.email} 
            onChange={e => setForm({...form, email: e.target.value})} 
            style={inputStyle} 
          />
        </div>

        <div>
          <label style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 900, marginBottom: 6, display: 'block' }}>PASSWORD</label>
          <input 
            type="password"
            placeholder="Min. 6 karakter" 
            value={form.password} 
            onChange={e => setForm({...form, password: e.target.value})} 
            style={inputStyle} 
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 900, marginBottom: 6, display: 'block' }}>ROLE</label>
            <select 
              value={form.role} 
              onChange={e => setForm({...form, role: e.target.value})} 
              style={selectStyle}
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="hr">HR Admin</option>
            </select>
          </div>
          <div>
            <label style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 900, marginBottom: 6, display: 'block' }}>DEPARTMENT</label>
            <select 
              value={form.department} 
              onChange={e => setForm({...form, department: e.target.value})} 
              style={selectStyle}
            >
              <option value="">Pilih...</option>
              {departments.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 900, marginBottom: 6, display: 'block' }}>JOB TITLE</label>
          <input
            placeholder="e.g. Account Executive"
            value={form.jobTitle}
            onChange={e => setForm({...form, jobTitle: e.target.value})}
            style={inputStyle}
          />
        </div>

        {/* Akses HR-Admin tambahan — hanya relevan untuk employee/manager (role hr sudah pasti HR) */}
        {form.role !== 'hr' && (
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
            padding: 14, borderRadius: 16, border: `1.5px solid ${form.hrAccess ? '#7B6BB5' : HP_TOKENS.line}`,
            background: form.hrAccess ? '#EDE8F5' : HP_TOKENS.card,
          }}>
            <input
              type="checkbox"
              checked={form.hrAccess}
              onChange={e => setForm({ ...form, hrAccess: e.target.checked })}
              style={{ marginTop: 2, width: 18, height: 18, accentColor: '#7B6BB5', cursor: 'pointer' }}
            />
            <div>
              <div style={{ fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, color: HP_TOKENS.ink }}>
                Beri akses HR-Admin
              </div>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2 }}>
                User tetap {form.role === 'manager' ? 'manager' : 'karyawan'} biasa, tapi bisa switch ke konsol HR (People, laporan, kelola akun).
              </div>
            </div>
          </label>
        )}

        <button 
          onClick={handleSave}
          disabled={loading}
          className="hp-tap"
          style={{
            marginTop: 10, width: '100%', padding: '18px', borderRadius: 20, 
            background: loading ? HP_TOKENS.line : HP_TOKENS.ink, color: '#F4F7F9',
            border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, cursor: loading ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
          }}
        >
          {loading ? 'Memproses...' : (
            <>
              <HPGlyph name="check" size={20} color="#F4F7F9" />
              <span>Buat Akun Sekarang</span>
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
