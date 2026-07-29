"use client";

import React from "react";
import Modal from "@/components/ui/Modal";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import { useHP } from "@/lib/HPContext";
// Nilai poin dan ambang level dibaca dari sumbernya, tidak ditulis ulang di UI.
// Guide yang menyimpan salinan angkanya sendiri pasti melenceng begitu
// ekonominya berubah — dan itulah yang terjadi: setiap angka di layar ini
// berbeda dari yang benar-benar dibayar sistem.
import { POINTS_ACTIONS } from "@/lib/pointsConfig";
import { getXpRequirementForLevel } from "@/lib/xp";
import HPGlyph from "@/components/ui/HPGlyph";

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
          <div style={{ ...HP_TEXT.h, fontSize: 16, marginBottom: 12, color: HP_TOKENS.sageInk }}>Cara Mendapatkan Poin</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Daily Quest', pts: `+${POINTS_ACTIONS.task_complete.value}`, icon: 'target', desc: 'Selesaikan prioritas harian' },
              { label: 'Task di-ACC', pts: `+${POINTS_ACTIONS.task_approved.value}`, icon: 'check', desc: 'Manajer menyetujui taskmu' },
              { label: 'Tutup Hari', pts: `+${POINTS_ACTIONS.tutup_hari.value}`, icon: 'moon', desc: 'Refleksi & clock-out' },
              { label: 'Absensi', pts: `+${POINTS_ACTIONS.check_in_ontime.value}`, icon: 'compass', desc: 'Check-in tepat waktu' },
              { label: 'Training Quest', pts: `+${POINTS_ACTIONS.habit_complete.value}`, icon: 'leaf', desc: 'Selesaikan latihan habit' },
              { label: 'Apresiasi', pts: `+${POINTS_ACTIONS.apresiasi_received.value}`, icon: 'heart', desc: 'Dapat kudos dari rekan' },
              { label: 'Survey HR', pts: `+${POINTS_ACTIONS.survey_complete.value}`, icon: 'note', desc: 'Isi survei berkala' },
              { label: 'Nudge Harian', pts: `+${POINTS_ACTIONS.nudge_daily.value}`, icon: 'sparkle', desc: 'Selesaikan misi harianmu' },
              { label: 'Box Breathing', pts: `+${POINTS_ACTIONS.breathing.value}`, icon: '🧘‍♂️', desc: 'Latihan jeda tenang 1m' },
              { label: 'Isi Mood', pts: `+${POINTS_ACTIONS.mood_checkin.value}`, icon: 'user', desc: 'Check-in mood harian' },
            ].map(item => (
              <div key={item.label} style={{ 
                padding: 12, borderRadius: HP_TOKENS.radiusMd, background: HP_TOKENS.card, 
                border: `1px solid ${HP_TOKENS.line}`, textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
              }}>
                <div style={{ display: 'flex', marginBottom: 4 }}><HPGlyph name={item.icon} size={20} color="currentColor" /></div>
                <div style={{ ...HP_TEXT.h, fontSize: 12, color: HP_TOKENS.ink }}>{item.label}</div>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontSize: 9, marginTop: 2, marginBottom: 6 }}>{item.desc}</div>
                <div style={{ ...HP_TEXT.small, color: HP_TOKENS.sageInk, fontWeight: 700, fontSize: 13, marginTop: 'auto' }}>{item.pts} Poin</div>
              </div>
            ))}
          </div>
          {/*
            Plafon harian sengaja TIDAK ditulis di sini.

            Tiap aksi punya kuota sendiri, dan kuotanya ditampilkan sebagai
            penghitung hidup di widget masing-masing ("Task hari ini 3/5") —
            di tempat aksinya dikerjakan, saat angkanya berguna. Menuliskan
            plafonnya di sini hanya mengundang orang menjumlahkan dan mencari
            cara memerahnya.
          */}
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 16, textAlign: 'center' }}>
            💡 Tiap aktivitas punya jatah poin harian. Kalau jatahnya sudah penuh,
            progresmu tetap tercatat dan tetap dilihat manajer.
          </div>
        </section>

        {/* Level Guide */}
        <section>
          <div style={{ ...HP_TEXT.h, fontSize: 16, marginBottom: 12, color: HP_TOKENS.blue }}>Threshold Level Up</div>
          {/*
            Angka diambil dari rumus asli di lib/xp.ts (100 × (level−1)^1.5),
            bukan ditulis tangan. Versi lama mengklaim "100 / 300 / 1.000 poin
            per level" — tidak satu pun cocok dengan perhitungan sebenarnya, jadi
            progres yang dilihat user tidak pernah sesuai janji guide-nya.
          */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[2, 5, 11, 21, 36, 51, 71].map(lv => (
              <div key={lv} style={milestoneStyle}>
                <span>Level {lv}</span>
                <span style={{ fontWeight: 700 }}>
                  {getXpRequirementForLevel(lv).toLocaleString('id-ID')} Poin
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Rank Guide */}
        <section>
          <div style={{ ...HP_TEXT.h, fontSize: 16, marginBottom: 12, color: HP_TOKENS.yellowInk }}>Rank Milestones</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { rank: 'E', lv: 'Lv. 1-10', color: HP_TOKENS.inkMute },
              { rank: 'D', lv: 'Lv. 11-20', color: HP_TOKENS.successInk },
              { rank: 'C', lv: 'Lv. 21-35', color: HP_TOKENS.blue },
              { rank: 'B', lv: 'Lv. 36-50', color: HP_TOKENS.yellowInk },
              { rank: 'A', lv: 'Lv. 51-70', color: HP_TOKENS.dangerInk },
              { rank: 'S', lv: 'Lv. 71+', color: HP_TOKENS.primaryInk },
            ].map(r => (
              <div key={r.rank} style={{ 
                padding: '12px 8px', borderRadius: HP_TOKENS.radiusMd, background: HP_TOKENS.card, 
                border: `1.5px solid ${HP_TOKENS.line}`, textAlign: 'center' 
              }}>
                <div style={{ 
                  fontSize: 18, fontWeight: 700, color: r.color, fontFamily: HP_FONT,
                  background: `${r.color}15`, width: 36, height: 36, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px'
                }}>
                  {r.rank}
                </div>
                <div style={{ ...HP_TEXT.small, fontWeight: 700, fontSize: 10 }}>{r.lv}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Skill Guide */}
        <section style={{ 
          marginTop: 8, padding: 16, borderRadius: HP_TOKENS.radius, 
          background: `${HP_TOKENS.sageWash}`,
          border: `1.5px solid ${HP_TOKENS.sageSoft}`
        }}>
          <div style={{ ...HP_TEXT.h, fontSize: 14, color: HP_TOKENS.sageInk }}>Otomatisasi Progress Skill</div>
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
               width: '100%', padding: '14px', borderRadius: HP_TOKENS.radiusMd,
               background: HP_TOKENS.ink, color: HP_TOKENS.onPrimary, border: 'none',
               fontFamily: HP_FONT, fontWeight: 700, fontSize: 13, cursor: 'pointer',
               display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
             }}
           >
             <span style={{ fontSize: 18 }}><HPGlyph name="bee" size={15} color="currentColor" /></span>
             Lihat Onboarding Lagi
           </button>
        </div>

      </div>
    </Modal>
  );
}

const milestoneStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', padding: '10px 14px',
  background: HP_TOKENS.lineSoft, borderRadius: HP_TOKENS.radiusSm, fontFamily: HP_FONT, fontSize: 13
};
