"use client";

import React, { useState } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import { v4 as uuidv4 } from "uuid";

interface ManageContactsModalProps {
  onClose: () => void;
}

export default function ManageContactsModal({ onClose }: ManageContactsModalProps) {
  const { state, updateState } = useHP();
  const [form, setForm] = useState({ name: "", role: "", email: "", phone: "" });

  const privateContacts = (state?.contacts || []).filter(c => c.isPrivate);

  const handleAdd = () => {
    if (!form.name || !form.phone) return;
    
    const newContact = {
      id: uuidv4(),
      ...form,
      isPrivate: true
    };

    updateState((s: any) => ({
      ...s,
      contacts: [...(s.contacts || []), newContact]
    }));

    setForm({ name: "", role: "", email: "", phone: "" });
  };

  const handleDelete = (id: string) => {
    updateState((s: any) => ({
      ...s,
      contacts: (s.contacts || []).filter((c: any) => c.id !== id)
    }));
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(26,29,35,0.4)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div 
        className="hp-pop"
        style={{
          width: '100%', maxWidth: 400, background: HP_TOKENS.paper,
          borderRadius: 32, overflow: 'hidden', boxShadow: '0 20px 40px rgba(26,29,35,0.1)'
        }}
      >
        <div style={{ padding: 24, borderBottom: `1px solid ${HP_TOKENS.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ ...HP_TEXT.h, fontSize: 20 }}>Kontak Privat</div>
            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute }}>Kelola kontak pribadi kamu</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <HPGlyph name="close" size={24} color={HP_TOKENS.ink} />
          </button>
        </div>

        <div style={{ padding: 24, maxHeight: '60vh', overflowY: 'auto' }}>
          {/* Add Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            <input 
              placeholder="Nama Kontak" 
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              style={inputStyle}
            />
            <input 
              placeholder="Peran (e.g. Keluarga, Teman)" 
              value={form.role}
              onChange={e => setForm({...form, role: e.target.value})}
              style={inputStyle}
            />
            <input 
              placeholder="Nomor Telepon" 
              value={form.phone}
              onChange={e => setForm({...form, phone: e.target.value})}
              style={inputStyle}
            />
            <input 
              placeholder="Email (Opsional)" 
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              style={inputStyle}
            />
            <button 
              onClick={handleAdd}
              className="hp-tap"
              style={{
                width: '100%', padding: '14px', borderRadius: 16, background: HP_TOKENS.ink,
                color: '#F4F7F9', border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, cursor: 'pointer'
              }}
            >
              + Tambah Kontak
            </button>
          </div>

          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {privateContacts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: HP_TOKENS.inkMute, fontSize: 13 }}>
                Belum ada kontak privat.
              </div>
            ) : (
              privateContacts.map(c => (
                <HPCard key={c.id} padding={12} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ ...HP_TEXT.h, fontSize: 14 }}>{c.name}</div>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>{c.role || 'Personal'} • {c.phone}</div>
                  </div>
                  <button 
                    onClick={() => handleDelete(c.id)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 8 }}
                  >
                    <HPGlyph name="trash" size={18} color={HP_TOKENS.coral} />
                  </button>
                </HPCard>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px', borderRadius: 14, border: `1.5px solid ${HP_TOKENS.line}`,
  fontFamily: HP_FONT, fontSize: 14, outline: 'none', background: HP_TOKENS.card, boxSizing: 'border-box'
};
