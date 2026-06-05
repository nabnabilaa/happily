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

interface ManageHabitsModalProps {
  onClose: () => void;
}

export default function ManageHabitsModal({ onClose }: ManageHabitsModalProps) {
  const { state, updateState, notify } = useHP();
  const [newName, setNewName] = useState("");
  const [glyph, setGlyph] = useState("sparkle");

  const addHabit = () => {
    if (!state || !newName) return;
    const trimmedName = newName.trim();
    if (state.habits?.some((h: any) => h.name.toLowerCase() === trimmedName.toLowerCase())) {
      notify("Kebiasaan Sudah Ada", "Kebiasaan dengan nama tersebut sudah terdaftar.", "warning");
      return;
    }
    const newH = {
      name: trimmedName,
      streak: 0,
      target: 7,
      done: false,
      glyph: glyph,
    };
    updateState((s: any) => ({
      ...s,
      habits: [...(s.habits || []), newH]
    }));
    setNewName("");
  };

  const deleteHabit = (name: string) => {
    updateState((s: any) => ({
      ...s,
      habits: s.habits.filter((h: any) => h.name !== name)
    }));
  };

  if (!state) return null;

  return (
    <Modal onClose={onClose} title="Atur Kebiasaan">
      <div style={{ marginTop: 4 }}>
        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700, marginBottom: 12 }}>KEBIASAAN AKTIF</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          {state.habits.map((h: any, i: number) => (
            <div 
              key={`${h.name}-${i}`} 
              style={{
                padding: 12, borderRadius: 16, background: HP_TOKENS.card, border: `1.5px solid ${HP_TOKENS.line}`,
                position: 'relative'
              }}
            >
              <div style={{ marginBottom: 6 }}>
                <HPGlyph name={h.glyph || 'star'} size={20} color={HP_TOKENS.ink} />
              </div>
              <div style={{ ...HP_TEXT.h, fontSize: 13, marginBottom: 2 }}>{h.name}</div>
              <div style={{ ...HP_TEXT.small, color: HP_TOKENS.sage, fontWeight: 800 }}>🔥 {h.streak} hari</div>
              <button 
                onClick={() => deleteHabit(h.name)}
                style={{ 
                  position: 'absolute', top: 8, right: 8, background: 'none', 
                  border: 'none', cursor: 'pointer', padding: 4 
                }}
              >
                <HPGlyph name="close" size={14} color={HP_TOKENS.coral}/>
              </button>
            </div>
          ))}
        </div>

        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700, marginBottom: 12 }}>BANGUN KEBIASAAN BARU</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderRadius: 20, background: HP_TOKENS.blueWash }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ 
              width: 48, height: 48, borderRadius: 12, background: HP_TOKENS.card, 
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
              border: `1.5px solid ${HP_TOKENS.line}`
            }}>
              <HPGlyph name={glyph} size={24} color={HP_TOKENS.ink} />
            </div>
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nama kebiasaan..."
              style={{
                flex: 1, padding: 14, borderRadius: 12, border: `1.5px solid ${HP_TOKENS.line}`,
                fontFamily: HP_FONT, fontSize: 14, background: HP_TOKENS.card, outline: 'none'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['sparkle', 'leaf', 'heart', 'book', 'activity', 'moon', 'target', 'calendar'].map(g => (
              <button
                key={g}
                onClick={() => setGlyph(g)}
                style={{
                  width: 38, height: 38, borderRadius: 10, border: 'none',
                  background: glyph === g ? HP_TOKENS.ink : '#fff',
                  cursor: 'pointer', transition: '0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <HPGlyph name={g} size={18} color={glyph === g ? '#fff' : HP_TOKENS.ink} />
              </button>
            ))}
          </div>
          <button 
            onClick={addHabit}
            disabled={!newName}
            style={{
              marginTop: 4, padding: 14, borderRadius: 12, border: 'none',
              background: HP_TOKENS.blue, color: '#F4F7F9',
              fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer',
              opacity: !newName ? 0.5 : 1
            }}
          >
            Mulai Kebiasaan Baru
          </button>
        </div>
      </div>
    </Modal>
  );
}
