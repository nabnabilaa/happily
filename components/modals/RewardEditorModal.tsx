"use client";

import React, { useState } from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import Modal from "@/components/ui/Modal";
import HPGlyph from "@/components/ui/HPGlyph";

interface RewardEditorModalProps {
  onClose: () => void;
  reward?: any;
  onSave: (reward: any) => void;
}

export default function RewardEditorModal({ onClose, reward, onSave }: RewardEditorModalProps) {
  const [form, setForm] = useState({
    title: reward?.title || "",
    points: reward?.points || "",
    stock: reward?.stock || "",
    category: reward?.category || "General",
    tone: reward?.tone || "blue",
    description: reward?.description || "",
    glyph: reward?.glyph || "gift",
  });

  const handleSave = () => {
    if (!form.title || !form.points || !form.stock) return;
    onSave({
      ...reward,
      title: form.title,
      points: parseInt(form.points as string),
      stock: parseInt(form.stock as string),
      category: form.category,
      tone: form.tone,
      description: form.description,
      glyph: form.glyph,
      id: reward?.id || Date.now()
    });
    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px', borderRadius: 16, border: `1.5px solid ${HP_TOKENS.line}`,
    fontFamily: HP_FONT, fontSize: 14, fontWeight: 700, outline: 'none', background: '#fff', boxSizing: 'border-box'
  };

  return (
    <Modal onClose={onClose} title={reward ? "Edit Reward 🎁" : "Tambah Reward Baru 🎁"}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 10 }}>
        <div>
          <label style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 900, marginBottom: 8, display: 'block' }}>NAMA REWARD</label>
          <input 
            placeholder="e.g. Voucher Kopi" 
            value={form.title} 
            onChange={e => setForm({...form, title: e.target.value})} 
            style={inputStyle} 
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 900, marginBottom: 8, display: 'block' }}>HARGA (POIN)</label>
            <input 
              type="number"
              placeholder="0" 
              value={form.points} 
              onChange={e => setForm({...form, points: e.target.value})} 
              style={inputStyle} 
            />
          </div>
          <div>
            <label style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 900, marginBottom: 8, display: 'block' }}>STOK</label>
            <input 
              type="number"
              placeholder="0" 
              value={form.stock} 
              onChange={e => setForm({...form, stock: e.target.value})} 
              style={inputStyle} 
            />
          </div>
        </div>

        <div>
          <label style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 900, marginBottom: 8, display: 'block' }}>KATEGORI</label>
          <input 
            placeholder="e.g. Wellness, Lifestyle, Growth" 
            value={form.category} 
            onChange={e => setForm({...form, category: e.target.value})} 
            style={inputStyle} 
          />
        </div>

        <div>
          <label style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 900, marginBottom: 8, display: 'block' }}>DESKRIPSI REWARD</label>
          <textarea 
            placeholder="Tulis penjelasan singkat tentang reward ini..." 
            value={form.description} 
            onChange={e => setForm({...form, description: e.target.value})} 
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} 
          />
        </div>

        <div>
          <label style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 900, marginBottom: 8, display: 'block' }}>IKON REWARD</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { key: 'gift', label: '🎁' },
              { key: 'trophy', label: '🏆' },
              { key: 'star', label: '⭐' },
              { key: 'heart', label: '❤️' },
              { key: 'zap', label: '⚡' },
              { key: 'tree', label: '🌳' },
              { key: 'book', label: '📚' },
              { key: 'leaf', label: '🌿' },
            ].map(item => (
              <button 
                key={item.key}
                type="button"
                onClick={() => setForm({...form, glyph: item.key})}
                style={{
                  width: 40, height: 40, borderRadius: 12, border: form.glyph === item.key ? `2.5px solid ${HP_TOKENS.ink}` : `1px solid ${HP_TOKENS.line}`,
                  background: form.glyph === item.key ? HP_TOKENS.yellowSoft : '#fff', cursor: 'pointer',
                  fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 900, marginBottom: 8, display: 'block' }}>WARNA TEMA TAMPILAN</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {['blue', 'sage', 'yellow', 'coral', 'lavender'].map(t => (
              <button 
                key={t}
                onClick={() => setForm({...form, tone: t})}
                style={{
                  width: 36, height: 36, borderRadius: 12,
                  background: HP_TOKENS[t as keyof typeof HP_TOKENS] || t,
                  border: form.tone === t ? `3px solid ${HP_TOKENS.ink}` : 'none',
                  cursor: 'pointer'
                }}
              />
            ))}
          </div>
        </div>

        <button 
          onClick={handleSave}
          className="hp-tap"
          style={{
            marginTop: 10, width: '100%', padding: '18px', borderRadius: 20, 
            background: HP_TOKENS.ink, color: '#fff',
            border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
          }}
        >
          <HPGlyph name="check" size={20} color="#fff" />
          <span>Simpan Reward</span>
        </button>
      </div>
    </Modal>
  );
}
