"use client";

import React, { useRef, useState } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import Modal from "@/components/ui/Modal";
import HPGlyph from "@/components/ui/HPGlyph";
import { getMascotAnimated, toggleMascotAnimation } from "@/components/ui/BeeMascot";

interface ProfileEditorModalProps {
  onClose: () => void;
}

export default function ProfileEditorModal({ onClose }: ProfileEditorModalProps) {
  const { user, updateUser, state, updateState } = useHP();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(user?.avatarImage || null);
  const [name, setName] = useState(user?.name || "");
  const [midDayTime, setMidDayTime] = useState(state?.workSchedule?.midDayCheckInTime || "12:00");
  const [mascotAnimated, setMascotAnimated] = useState(() => {
    if (typeof window !== "undefined") {
      return getMascotAnimated();
    }
    return true;
  });

  const compressImage = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Compress to JPEG with 0.7 quality
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Basic check to avoid massive files before even reading
      if (file.size > 5 * 1024 * 1024) {
        alert("File terlalu besar. Maksimal 5MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64);
        setPreview(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    updateUser({ 
      name,
      ...(preview !== undefined ? { avatarImage: preview ?? undefined } : {})
    });
    if (state?.workSchedule) {
      updateState({ 
        workSchedule: { ...state.workSchedule, midDayCheckInTime: midDayTime } 
      });
    }
    onClose();
  };

  const handleRemove = () => {
    setPreview(null);
    updateUser({ avatarImage: undefined });
    onClose();
  };


  return (
    <Modal onClose={onClose} title="Profil & Pengaturan ⚙️">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, marginTop: 20 }}>
        
        {/* Preview Area */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: 160, height: 160, borderRadius: 80,
            background: HP_TOKENS.lineSoft,
            border: `2px dashed ${HP_TOKENS.line}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', overflow: 'hidden', position: 'relative',
            transition: 'all 0.2s'
          }}
          className="hp-tap"
        >
          {preview ? (
            <img src={preview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <HPGlyph name="refresh" size={32} color={HP_TOKENS.inkMute} />
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700 }}>UPLOAD IMAGE</div>
            </div>
          )}
          
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 40,
            background: 'rgba(26,29,35,0.4)', color: '#F4F7F9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: HP_FONT, fontSize: 10, fontWeight: 800,
          }}>
            CLICK TO CHANGE
          </div>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          style={{ display: 'none' }} 
        />

        <div style={{ width: '100%' }}>
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 700, marginBottom: 6 }}>NAMA LENGKAP</div>
          <input 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ketik nama Anda"
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 12, border: `1px solid ${HP_TOKENS.line}`,
              fontFamily: HP_FONT, fontSize: 14, fontWeight: 600, outline: 'none', background: HP_TOKENS.card
            }}
          />
        </div>

        <div style={{ width: '100%' }}>
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 700, marginBottom: 6 }}>JAM PENGINGAT REALISASI (MID-DAY CHECK-IN)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: HP_TOKENS.yellowSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HPGlyph name="target" size={20} color={HP_TOKENS.ink} />
            </div>
            <input 
              type="time"
              value={midDayTime}
              onChange={(e) => setMidDayTime(e.target.value)}
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 12, border: `1px solid ${HP_TOKENS.line}`,
                fontFamily: HP_FONT, fontSize: 16, fontWeight: 700, outline: 'none', background: HP_TOKENS.card
              }}
            />
          </div>
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 6, fontWeight: 600 }}>
            Popup "Cek Target Kerja" akan muncul otomatis pada jam ini.
          </div>
        </div>

        {/* 🐝 Mascot Animation Mode Control */}
        <div style={{ width: '100%' }}>
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 700, marginBottom: 8 }}>MODE MASKOT (FLOWBUDDY)</div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: 10,
            background: HP_TOKENS.lineSoft,
            padding: 4,
            borderRadius: 14,
            border: `1.5px solid ${HP_TOKENS.line}`
          }}>
            <button
              onClick={() => {
                if (!mascotAnimated) {
                  const next = toggleMascotAnimation();
                  setMascotAnimated(next);
                }
              }}
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                border: 'none',
                fontFamily: HP_FONT,
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                background: mascotAnimated ? HP_TOKENS.yellow : 'transparent',
                color: mascotAnimated ? HP_TOKENS.ink : HP_TOKENS.inkMute,
                boxShadow: mascotAnimated ? '0 4px 12px rgba(244,164,41,0.2)' : 'none',
              }}
              className="hp-tap"
            >
              <span>✨</span> Mode Animasi
            </button>
            <button
              onClick={() => {
                if (mascotAnimated) {
                  const next = toggleMascotAnimation();
                  setMascotAnimated(next);
                }
              }}
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                border: 'none',
                fontFamily: HP_FONT,
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                background: !mascotAnimated ? HP_TOKENS.card : 'transparent',
                color: !mascotAnimated ? HP_TOKENS.ink : HP_TOKENS.inkMute,
                boxShadow: !mascotAnimated ? '0 4px 12px rgba(26,29,35,0.05)' : 'none',
              }}
              className="hp-tap"
            >
              <span>💤</span> Mode Diam
            </button>
          </div>
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 6, fontWeight: 600, lineHeight: 1.4 }}>
            {mascotAnimated 
              ? "Maskot akan melayang lembut, berkedip acak, dan memantul gemas saat disentuh."
              : "Maskot akan tetap tenang dan diam untuk menjaga konsentrasi belajar & kerja Anda."
            }
          </div>
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button 
            onClick={handleSave}
            style={{
              width: '100%', padding: '16px', borderRadius: 16,
              background: HP_TOKENS.yellow, color: HP_TOKENS.ink,
              border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 15,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
            }}
            className="hp-tap"
          >
            <HPGlyph name="check" size={18} color={HP_TOKENS.ink} />
            <span>Simpan Perubahan</span>
          </button>

          {user?.avatarImage && (
            <button 
              onClick={handleRemove}
              style={{
                width: '100%', padding: '14px', borderRadius: 16,
                background: 'transparent', color: HP_TOKENS.coral,
                border: `1.5px solid ${HP_TOKENS.coral}40`, 
                fontFamily: HP_FONT, fontWeight: 700, fontSize: 14,
                cursor: 'pointer'
              }}
              className="hp-tap"
            >
              Hapus Foto & Reset ke Avatar
            </button>
          )}
        </div>

        <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, textAlign: 'center', lineHeight: 1.5 }}>
          Foto profil dan nama akan muncul di Dashboard, Goals, dan leaderboard tim.
        </div>


      </div>
    </Modal>
  );
}
