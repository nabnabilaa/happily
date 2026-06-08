"use client";

import React, { useState } from "react";
import { useHP } from "@/lib/HPContext";
import { 
  HP_TOKENS, 
  HP_FONT, 
  HP_TEXT 
} from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import Modal from "@/components/ui/Modal";

interface ManageLearningModalProps {
  onClose: () => void;
}

export default function ManageLearningModal({ onClose }: ManageLearningModalProps) {
  const { state, updateState, notify } = useHP();
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("Leadership");

  const addLearning = () => {
    if (!title) return;
    
    // Validasi duplikat
    const isDuplicate = state.learning?.some((l: any) => l.title.toLowerCase().trim() === title.toLowerCase().trim());
    if (isDuplicate) {
      notify("Gagal Menambah", "Judul materi ini sudah ada. Harap gunakan nama lain.", "error");
      return;
    }

    const newItem = {
      id: Date.now(),
      title,
      meta: "5 menit · Reading",
      tag,
      tone: tag === 'Leadership' ? 'coral' : tag === 'Design Systems' ? 'blue' : 'yellow',
      status: 'new'
    };
    updateState((s: any) => ({
      ...s,
      learning: [...(s.learning || []), newItem]
    }));
    notify("Berhasil Dibuat 🎉", `Materi "${title}" telah ditambahkan.`, "success");
    setTitle("");
  };

  const deleteLearning = (id: number) => {
    updateState((s: any) => ({
      ...s,
      learning: s.learning.filter((l: any) => l.id !== id)
    }));
  };

  if (!state || !state.learning) return null;

  return (
    <Modal onClose={onClose} title="Manage Learning">
      <div style={{ marginTop: 4 }}>
        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700, marginBottom: 12 }}>DAFTAR REKOMENDASI</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {state.learning.map((l: any) => (
            <div 
              key={l.id} 
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16,
                background: HP_TOKENS.card, border: `1.5px solid ${HP_TOKENS.line}`,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ ...HP_TEXT.h, fontSize: 13 }}>{l.title}</div>
                <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 2 }}>{l.tag} · {l.meta}</div>
              </div>
              <button 
                onClick={() => deleteLearning(l.id)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <HPGlyph name="close" size={16} color={HP_TOKENS.coral}/>
              </button>
            </div>
          ))}
        </div>

        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700, marginBottom: 12 }}>TAMBAH PEMBELAJARAN</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderRadius: 20, background: HP_TOKENS.blueWash }}>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul pembelajaran baru"
            style={{
              padding: 14, borderRadius: 12, border: `1.5px solid ${HP_TOKENS.line}`,
              fontFamily: HP_FONT, fontSize: 14, background: HP_TOKENS.card, outline: 'none'
            }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['Leadership', 'Design Systems', 'Storytelling'].map(t => (
              <button
                key={t}
                onClick={() => setTag(t)}
                style={{
                  flex: 1, padding: 8, borderRadius: 8, border: 'none',
                  background: tag === t ? HP_TOKENS.ink : '#fff',
                  color: tag === t ? '#fff' : HP_TOKENS.ink,
                  fontFamily: HP_FONT, fontSize: 11, fontWeight: 700, cursor: 'pointer'
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <button 
            onClick={addLearning}
            disabled={!title}
            style={{
              marginTop: 4, padding: 14, borderRadius: 12, border: 'none',
              background: HP_TOKENS.ink, color: '#F4F7F9',
              fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer',
              opacity: !title ? 0.5 : 1
            }}
          >
            Tambah Rekomendasi
          </button>
        </div>
      </div>
    </Modal>
  );
}
