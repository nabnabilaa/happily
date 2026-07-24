"use client";

import React from "react";
import Modal from "@/components/ui/Modal";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import { useHP } from "@/lib/HPContext";

interface SystemGuideModalProps {
  onClose: () => void;
}

export default function SystemGuideModal({ onClose }: SystemGuideModalProps) {
  const { updateState } = useHP();
  return (
    <Modal onClose={onClose} title="Sistem Guide & Rank Milestones 📖">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '4px 0 12px' }}>
        
        {/* Point Guide */}
        <section>
          <div style={{ ...HP_TEXT.h, fontSize: 16, marginBottom: 12, color: HP_TOKENS.sage }}>Cara Mendapatkan Poin</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Daily Quest', pts: '+30', icon: '🎯', desc: 'Selesaikan prioritas harian' },
              { label: 'Tutup Hari', pts: '+20', icon: '🌙', desc: 'Refleksi Harian' },
              { label: 'Absensi', pts: '+10', icon: '📍', desc: 'Check-in / Check-out tepat waktu' },
              { label: 'Training Quest', pts: '+15', icon: '🌿', desc: 'Selesaikan latihan habit' },
              { label: 'Apresiasi', pts: '+20', icon: '👏', desc: 'Dapat kudos dari tim' },
              { label: 'Survey HR', pts: '+20', icon: '📋', desc: 'Isi survei berkala' },
              { label: 'Box Breathing', pts: '+5', icon: '🧘‍♂️', desc: 'Latihan jeda tenang 1m' },
              { label: 'Isi Mood', pts: '+5', icon: '😊', desc: 'Check-in mood harian' },
            ].map(item => (
              <div key={item.label} style={{ 
                padding: 12, borderRadius: 16, background: HP_TOKENS.card, 
                border: `1px solid ${HP_TOKENS.line}`, textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
              }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{item.icon}</div>
                <div style={{ ...HP_TEXT.h, fontSize: 12, color: HP_TOKENS.ink }}>{item.label}</div>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontSize: 9, marginTop: 2, marginBottom: 6 }}>{item.desc}</div>
                <div style={{ ...HP_TEXT.small, color: HP_TOKENS.sage, fontWeight: 900, fontSize: 13, marginTop: 'auto' }}>{item.pts} Poin</div>
              </div>
            ))}
          </div>
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.coral, marginTop: 16, textAlign: 'center', fontWeight: 800 }}>
            💡 Maksimal 300 Poin per hari dari seluruh aktivitas.
          </div>
        </section>

        {/* Level Guide */}
        <section>
          <div style={{ ...HP_TEXT.h, fontSize: 16, marginBottom: 12, color: HP_TOKENS.blue }}>Threshold Level Up</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={milestoneStyle}>
              <span>Level 1 - 10</span>
              <span style={{ fontWeight: 800 }}>100 Poin / Level</span>
            </div>
            <div style={milestoneStyle}>
              <span>Level 11 - 20</span>
              <span style={{ fontWeight: 800 }}>300 Poin / Level</span>
            </div>
            <div style={milestoneStyle}>
              <span>Level 21+</span>
              <span style={{ fontWeight: 800 }}>1,000 Poin / Level</span>
            </div>
          </div>
        </section>

        {/* Rank Guide */}
        <section>
          <div style={{ ...HP_TEXT.h, fontSize: 16, marginBottom: 12, color: HP_TOKENS.yellow }}>Rank Milestones</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { rank: 'E', lv: 'Lv. 1-10', color: '#888' },
              { rank: 'D', lv: 'Lv. 11-20', color: '#4A7C59' },
              { rank: 'C', lv: 'Lv. 21-35', color: '#234A72' },
              { rank: 'B', lv: 'Lv. 36-50', color: '#7A5F10' },
              { rank: 'A', lv: 'Lv. 51-70', color: '#8B3A2F' },
              { rank: 'S', lv: 'Lv. 71+', color: '#4A3A6E' },
            ].map(r => (
              <div key={r.rank} style={{ 
                padding: '12px 8px', borderRadius: 14, background: HP_TOKENS.card, 
                border: `1.5px solid ${HP_TOKENS.line}`, textAlign: 'center' 
              }}>
                <div style={{ 
                  fontSize: 18, fontWeight: 900, color: r.color, fontFamily: HP_FONT,
                  background: `${r.color}15`, width: 36, height: 36, borderRadius: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px'
                }}>
                  {r.rank}
                </div>
                <div style={{ ...HP_TEXT.small, fontWeight: 800, fontSize: 10 }}>{r.lv}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Skill Guide */}
        <section style={{ 
          marginTop: 8, padding: 16, borderRadius: 20, 
          background: `${HP_TOKENS.sageWash}`,
          border: `1.5px solid ${HP_TOKENS.sageSoft}`
        }}>
          <div style={{ ...HP_TEXT.h, fontSize: 14, color: HP_TOKENS.sage }}>Otomatisasi Progress Skill</div>
          <div style={{ ...HP_TEXT.body, fontSize: 12, marginTop: 4 }}>
            Sistem kami menganalisis aktivitas penyelesaian prioritas kerjamu.
            <ul style={{ paddingLeft: 16, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>Selesaikan Daily Quest (Task): <b>+2% Progress Skill</b></li>
              <li>Apresiasi & Evaluasi Kerja: <b>Mendorong perkembangan soft-skill</b></li>
            </ul>
          </div>
        </section>
        
        {/* Re-play Onboarding */}
        <div style={{ marginTop: 8 }}>
           <button 
             onClick={() => {
               updateState({ onboarded: false });
               onClose();
             }}
             style={{
               width: '100%', padding: '14px', borderRadius: 16,
               background: HP_TOKENS.ink, color: '#F4F7F9', border: 'none',
               fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer',
               display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
               boxShadow: '0 4px 12px rgba(26,29,35,0.1)'
             }}
           >
             <span style={{ fontSize: 18 }}>🐝</span>
             Lihat Onboarding Lagi
           </button>
        </div>

      </div>
    </Modal>
  );
}

const milestoneStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', padding: '10px 14px',
  background: HP_TOKENS.lineSoft, borderRadius: 12, fontFamily: HP_FONT, fontSize: 13
};
