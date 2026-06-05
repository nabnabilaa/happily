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

interface ManageProgramsModalProps {
  onClose: () => void;
}

export default function ManageProgramsModal({ onClose }: ManageProgramsModalProps) {
  const { state, updateState } = useHP();
  const [newTitle, setNewTitle] = useState("");

  const addProgram = () => {
    if (!newTitle) return;
    const newItem = {
      id: Date.now(),
      title: newTitle,
      progress: 0,
      joined: 1,
      tone: 'sage',
      day: 'Hari 1'
    };
    updateState((s: any) => ({
      ...s,
      wellbeing: {
        ...s.wellbeing,
        programs: [...(s.wellbeing.programs || []), newItem]
      }
    }));
    setNewTitle("");
  };

  const deleteProgram = (id: number) => {
    updateState((s: any) => ({
      ...s,
      wellbeing: {
        ...s.wellbeing,
        programs: s.wellbeing.programs.filter((p: any) => p.id !== id)
      }
    }));
  };

  if (!state || !state.wellbeing) return null;

  return (
    <Modal onClose={onClose} title="Kelola Program">
      <div style={{ marginTop: 4 }}>
        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700, marginBottom: 12 }}>PROGRAM AKTIF</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {state.wellbeing.programs.map((p: any) => (
            <div 
              key={p.id} 
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16,
                background: HP_TOKENS.card, border: `1.5px solid ${HP_TOKENS.line}`,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ ...HP_TEXT.h, fontSize: 13 }}>{p.title}</div>
                <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 2 }}>{p.day} · {p.joined} orang</div>
              </div>
              <button 
                onClick={() => deleteProgram(p.id)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <HPGlyph name="close" size={16} color={HP_TOKENS.coral}/>
              </button>
            </div>
          ))}
        </div>

        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700, marginBottom: 12 }}>IKUT TANTANGAN BARU</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input 
            type="text" 
            value={newTitle} 
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Misal: Tantangan Plank 30 Hari"
            style={{
              flex: 1, padding: 12, borderRadius: 12, border: `1.5px solid ${HP_TOKENS.line}`,
              fontFamily: HP_FONT, fontSize: 13, outline: 'none',
            }}
          />
          <button 
            onClick={addProgram}
            style={{
              padding: '0 20px', borderRadius: 12, border: 'none',
              background: HP_TOKENS.sage, color: '#F4F7F9', fontFamily: HP_FONT, fontWeight: 800, cursor: 'pointer'
            }}
          >
            Ikut
          </button>
        </div>
      </div>
    </Modal>
  );
}
