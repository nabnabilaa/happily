"use client";

import React, { useState } from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import Modal from "@/components/ui/Modal";
import HPGlyph from "@/components/ui/HPGlyph";

interface ContactEditorModalProps {
  onClose: () => void;
  contact?: any;
  onSave: (contact: any) => void;
}

export default function ContactEditorModal({ onClose, contact, onSave }: ContactEditorModalProps) {
  const [form, setForm] = useState({
    name: contact?.name || "",
    role: contact?.role || "",
    email: contact?.email || "",
    phone: contact?.phone || "",
  });

  const handleSave = () => {
    if (!form.name || !form.phone) return;
    onSave({
      ...contact,
      ...form,
      id: contact?.id || Date.now().toString()
    });
    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px', borderRadius: 16, border: `1.5px solid ${HP_TOKENS.line}`,
    fontFamily: HP_FONT, fontSize: 14, fontWeight: 700, outline: 'none', background: HP_TOKENS.card, boxSizing: 'border-box'
  };

  return (
    <Modal onClose={onClose} title={contact ? "Edit Kontak 📞" : "Tambah Kontak Baru 📞"}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 10 }}>
        <div>
          <label style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 900, marginBottom: 8, display: 'block' }}>NAMA KONTAK</label>
          <input 
            placeholder="e.g. Maya Sari" 
            value={form.name} 
            onChange={e => setForm({...form, name: e.target.value})} 
            style={inputStyle} 
          />
        </div>

        <div>
          <label style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 900, marginBottom: 8, display: 'block' }}>DIVISI / PERAN</label>
          <input 
            placeholder="e.g. IT Support" 
            value={form.role} 
            onChange={e => setForm({...form, role: e.target.value})} 
            style={inputStyle} 
          />
        </div>

        <div>
          <label style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 900, marginBottom: 8, display: 'block' }}>NOMOR TELEPON</label>
          <input 
            placeholder="0812-xxxx-xxxx" 
            value={form.phone} 
            onChange={e => setForm({...form, phone: e.target.value})} 
            style={inputStyle} 
          />
        </div>

        <div>
          <label style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 900, marginBottom: 8, display: 'block' }}>EMAIL (OPSIONAL)</label>
          <input 
            placeholder="name@company.com" 
            value={form.email} 
            onChange={e => setForm({...form, email: e.target.value})} 
            style={inputStyle} 
          />
        </div>

        <button 
          onClick={handleSave}
          className="hp-tap"
          style={{
            marginTop: 10, width: '100%', padding: '18px', borderRadius: 20, 
            background: HP_TOKENS.ink, color: '#F4F7F9',
            border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
          }}
        >
          <HPGlyph name="check" size={20} color="#F4F7F9" />
          <span>Simpan Kontak</span>
        </button>
      </div>
    </Modal>
  );
}
