"use client";

import React from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import HPAvatar from "@/components/ui/HPAvatar";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/home/SectionHeader";
import ReadinessRing from "@/components/growth/ReadinessRing";
import DimensionCard from "@/components/wellbeing/DimensionCard";
import ProgramCardInteractive from "@/components/wellbeing/ProgramCardInteractive";
import HabitCell from "@/components/home/HabitCell";


interface WellbeingScreenProps {
  openModal: (name: string, props?: any) => void;
}

const softBtn: React.CSSProperties = {
  padding: '14px 12px', borderRadius: 14, background: HP_TOKENS.lineSoft, border: 'none',
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
  fontFamily: HP_FONT, fontWeight: 700, fontSize: 13, color: HP_TOKENS.ink, cursor: 'pointer',
};

export default function WellbeingScreen({ openModal }: WellbeingScreenProps) {
  const { state, user: ctxUser, updateState } = useHP();
  const [refreshing, setRefreshing] = React.useState(false);
  
  if (!state) return null;

  const { wellbeing } = state;
  const avg = Math.round((wellbeing.dims || []).reduce((a: number, b: any) => a + b.score, 0) / (wellbeing.dims?.length || 1));
  


  const user = ctxUser || { name: "User" };

  return (
    <div style={{ padding: '0 16px 120px', fontFamily: HP_FONT }}>
      <ScreenHeader title="Wellbeing" subtitle="Keseimbangan & energi kamu hari ini"/>

      {/* Wellness Avatar Hero */}
      <div style={{ 
        display: 'flex', flexDirection: 'column', alignItems: 'center', 
        padding: '24px 0', marginBottom: 12,
        background: `radial-gradient(circle at center, ${HP_TOKENS.sageWash} 0%, transparent 70%)`
      }}>
        <div style={{ position: 'relative' }}>
          <div style={{ 
            width: 140, height: 140, borderRadius: 70, 
            background: '#fff', border: `2px solid ${HP_TOKENS.sageSoft}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 12px 32px rgba(74,124,89,0.1)'
          }}>
              <HPAvatar name={user.name} size={60} />
          </div>
          <div style={{
            position: 'absolute', bottom: 10, right: -10,
            padding: '6px 14px', borderRadius: 20, background: '#fff',
            border: `1.5px solid ${HP_TOKENS.line}`, fontSize: 13, fontWeight: 800,
            color: HP_TOKENS.sage, boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}>
            Feeling {state.mood || 'Calm'}
          </div>
        </div>
      </div>

      <HPCard style={{ background: `linear-gradient(135deg, ${HP_TOKENS.sageWash}, ${HP_TOKENS.blueWash})`, border: 'none' }} padding={18}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative' }}>
            <ReadinessRing value={wellbeing.score || avg}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute }}>Wellbeing score</div>
            <div style={{ ...HP_TEXT.title, fontSize: 22, marginTop: 2 }}>Kamu sedang baik 🌱</div>
            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft, fontWeight: 600, marginTop: 4 }}>
              Naik 3 poin dari minggu lalu
            </div>
          </div>
        </div>
      </HPCard>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
        {wellbeing.dims.map((d: any) => <DimensionCard key={d.key} d={d}/>)}
      </div>

      <button 
        onClick={() => openModal('pause')} 
        style={{
          marginTop: 14, 
          width: '100%', 
          padding: '16px', 
          borderRadius: 20,
          background: HP_TOKENS.card, 
          border: `1px solid ${HP_TOKENS.line}`, 
          cursor: 'pointer',
          display: 'flex', 
          alignItems: 'center', 
          gap: 14, 
          fontFamily: HP_FONT, 
          textAlign: 'left',
        }}
        className="hp-tap"
      >
        <div style={{ 
          width: 48, 
          height: 48, 
          borderRadius: 16, 
          background: HP_TOKENS.sageSoft, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <HPGlyph name="pause" size={22} color={HP_TOKENS.sage}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ ...HP_TEXT.h, fontSize: 15 }}>Pause button</div>
          <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft, fontWeight: 600, marginTop: 2 }}>
            Reset mental 1–3 menit · guided breathing
          </div>
        </div>
        <HPGlyph name="arrow" size={18} color={HP_TOKENS.inkMute}/>
      </button>




      {/* NEW: Personal Wellbeing Goal & Routine */}
      <SectionHeader 
        icon="sparkle" 
        label="Personal Routine (AI)" 
        action={state.personalWellbeingGoal ? "Ubah Goal" : "+ Set Goal"}
        onAction={() => {
          const g = prompt("Apa goal wellbeing personal kamu? (misal: Ingin lebih bugar, Ingin tidur lebih teratur, Ingin mengurangi stress)");
          if (g) {
            // AI Simulation: Generate tasks based on goal
            let tasks = [];
            if (g.toLowerCase().includes("tidur")) {
              tasks = [
                { id: 't1', title: "Matikan gadget 30 menit sebelum tidur", done: false },
                { id: 't2', title: "Minum air putih hangat", done: false },
                { id: 't3', title: "Baca buku 10 menit", done: false }
              ];
            } else if (g.toLowerCase().includes("bugar") || g.toLowerCase().includes("sehat")) {
              tasks = [
                { id: 't1', title: "Peregangan 5 menit", done: false },
                { id: 't2', title: "Minum 2L air hari ini", done: false },
                { id: 't3', title: "Berjalan 2000 langkah", done: false }
              ];
            } else {
              tasks = [
                { id: 't1', title: "Ambil nafas dalam 5x", done: false },
                { id: 't2', title: "Tulis 1 hal yang disyukuri", done: false },
                { id: 't3', title: "Istirahat sejenak setiap 2 jam", done: false }
              ];
            }
            updateState({ personalWellbeingGoal: g, wellbeingRoutine: tasks });
          }
        }}
      />
      
      {state.personalWellbeingGoal ? (
        <div style={{ marginBottom: 24 }}>
          <HPCard padding={16} style={{ background: HP_TOKENS.blueWash, border: 'none', marginBottom: 12 }}>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.blue, fontWeight: 900, textTransform: 'uppercase', marginBottom: 4 }}>GOAL KAMU</div>
            <div style={{ ...HP_TEXT.h, fontSize: 16 }}>"{state.personalWellbeingGoal}"</div>
          </HPCard>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(state.wellbeingRoutine || []).map((t: any) => (
              <div 
                key={t.id} 
                onClick={() => {
                  updateState((s: any) => ({
                    ...s,
                    wellbeingRoutine: s.wellbeingRoutine.map((rt: any) => rt.id === t.id ? { ...rt, done: !rt.done } : rt)
                  }));
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 16,
                  background: t.done ? HP_TOKENS.blueSoft : '#fff',
                  border: `1px solid ${t.done ? HP_TOKENS.blue : HP_TOKENS.line}`,
                  cursor: 'pointer'
                }}
                className="hp-tap"
              >
                <div style={{ 
                  width: 22, height: 22, borderRadius: 6, border: `2.5px solid ${t.done ? HP_TOKENS.blue : HP_TOKENS.line}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: t.done ? HP_TOKENS.blue : 'transparent'
                }}>
                  {t.done && <HPGlyph name="check" size={14} color="#fff" />}
                </div>
                <div style={{ 
                  ...HP_TEXT.body, fontSize: 14, fontWeight: 700,
                  textDecoration: t.done ? 'line-through' : 'none',
                  color: t.done ? HP_TOKENS.inkMute : HP_TOKENS.ink
                }}>
                  {t.title}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <HPCard padding={20} style={{ textAlign: 'center', background: HP_TOKENS.paper, border: `1.5px dashed ${HP_TOKENS.line}`, marginBottom: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🤖</div>
          <div style={{ ...HP_TEXT.h, fontSize: 14, color: HP_TOKENS.inkSoft }}>Set goal wellbeing personal kamu dan AI akan membuatkan rutinitas harian untukmu!</div>
        </HPCard>
      )}

      {/* Moved Daily Training (Habits) */}
      <SectionHeader 
        icon="leaf" 
        label="Daily Training" 
        action="Settings"
        onAction={() => openModal('manage_habits')}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {(state.habits || []).map((h: any, i: number) => (
          <HabitCell key={i} h={h} onToggle={() => {
            updateState((s: any) => {
              const hIndex = s.habits.findIndex((hb: any) => hb.name === h.name);
              const newHabits = [...s.habits];
              newHabits[hIndex] = { ...newHabits[hIndex], done: !newHabits[hIndex].done };
              return { ...s, habits: newHabits };
            });
          }}/>
        ))}
      </div>


    </div>
  );
}

