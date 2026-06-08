import React from 'react';
import { HP_TOKENS, HP_FONT, HP_TEXT } from '@/lib/constants';
import BeeMascot from '@/components/ui/BeeMascot';

interface MascotGuideModalProps {
  onClose: () => void;
}

export default function MascotGuideModal({ onClose }: MascotGuideModalProps) {
  const guides = [
    { mood: 'happy', title: 'Happy (Bahagia)', desc: 'Buddy dalam kondisi optimal! Terus update task, tambah logbook, atau elus Buddy dengan kursor agar ia gembira.' },
    { mood: 'sad', title: 'Sad (Sedih)', desc: 'Buddy merasa diabaikan jika kamu tidak login atau tidak ada progres lebih dari 4 jam.' },
    { mood: 'sleepy', title: 'Sleepy (Ngantuk)', desc: 'Buddy ikut lelah kalau kamu mencatat state mood "burnout" atau melewati jam kerja (overtime).' },
    { mood: 'focus', title: 'Focus (Fokus)', desc: 'Buddy memakai kacamata laser saat fitur Timer Fokus aktif.' },
    { mood: 'eating', title: 'Eating (Makan)', desc: 'Waktunya istirahat! Buddy sedang makan saat jam istirahat siang tiba.' },
    { mood: 'stretching', title: 'Stretching (Olahraga)', desc: 'Buddy meregangkan badan agar tetap sehat. (Muncul sesekali untuk mengingatkanmu stretching)' },
    { mood: 'excited', title: 'Excited (Semangat)', desc: 'Yeay! Buddy sangat semangat saat kamu mendapatkan poin, XP, atau ada pencapaian baru.' },
    { mood: 'idle', title: 'Idle (Tenang)', desc: 'Buddy sedang santai menemani harimu bekerja, tidak ada event khusus.' },
    { mood: 'waiting', title: 'Waiting (Menunggu)', desc: 'Ada alarm atau pengingat yang akan segera berbunyi dalam waktu dekat.' },
    { mood: 'annoyed', title: 'Annoyed (Marah)', desc: 'Terjadi jika kamu mengeklik si Buddy berkali-kali secara cepat. Jangan diganggu terus ya!' }
  ];

  return (
    <div 
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(5,5,16,0.6)', backdropFilter: 'blur(4px)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, fontFamily: HP_FONT
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: HP_TOKENS.paper, borderRadius: 24,
          padding: 24, width: '100%', maxWidth: 480,
          border: `1px solid ${HP_TOKENS.line}`,
          boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column', gap: 20,
          maxHeight: '85vh', overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ ...HP_TEXT.h, fontSize: 22, color: HP_TOKENS.ink }}>Panduan Emosi Buddy</div>
          <div style={{ ...HP_TEXT.body, color: HP_TOKENS.inkMute, marginTop: 4 }}>
            Pelajari apa arti ekspresinya dan bagaimana cara merubahnya!
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {guides.map(g => (
            <div key={g.mood} style={{ 
              display: 'flex', gap: 16, alignItems: 'center', 
              padding: 12, borderRadius: 16, background: '#F8F9FA'
            }}>
              <div style={{ flexShrink: 0, width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <BeeMascot mood={g.mood} size={50} />
              </div>
              <div>
                <div style={{ ...HP_TEXT.h, fontSize: 15, color: HP_TOKENS.ink }}>{g.title}</div>
                <div style={{ ...HP_TEXT.body, fontSize: 13, color: HP_TOKENS.inkMute, marginTop: 2, lineHeight: 1.4 }}>
                  {g.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
          <button onClick={onClose} className="hp-btn-primary" style={{ padding: '12px 32px' }}>
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
