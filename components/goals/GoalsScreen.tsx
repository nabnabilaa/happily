"use client";

import React, { useState } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import ScreenHeader from "@/components/ui/ScreenHeader";
import TabBar from "@/components/ui/TabBar";
import SectionHeader from "@/components/home/SectionHeader";
import GoalCard from "@/components/goals/GoalCard";

interface GoalsScreenProps {
  openModal: (name: string, props?: any) => void;
}

export default function GoalsScreen({ openModal }: GoalsScreenProps) {
  const { state, updateState, user } = useHP();
  const [tab, setTab] = useState('personal');
  
  if (!state || !user) return null;

  // Filter goals by scope and visibility rules
  const filteredGoals = state.goals.filter((g: any) => {
    if (tab === 'personal') return g.scope === 'personal' && String(g.ownerId) === String(user.id);
    if (tab === 'assigned') return g.scope === 'assigned' && String(g.ownerId) === String(user.id);
    if (tab === 'team') return false;
    if (tab === 'company') return false;
    return false;
  });


  return (
    <div style={{ padding: '0 16px 120px', fontFamily: HP_FONT }}>
      <ScreenHeader title="Strategy & KPI" subtitle="Pantau kemajuan target dan selaraskan dengan tim" />
      
      <TabBar options={[
        { key: 'personal', label: 'Personal' },
        { key: 'assigned', label: 'Assigned' },
      ]} value={tab} onChange={setTab}/>

      {/* Tab Context Info */}
      <HPCard style={{ marginTop: 14, background: tab === 'personal' ? HP_TOKENS.sageWash : tab === 'assigned' ? HP_TOKENS.lavenderWash : HP_TOKENS.blueWash, border: 'none' }} padding={16}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ 
            width: 36, height: 36, borderRadius: 10, 
            background: tab === 'personal' ? HP_TOKENS.sage : tab === 'assigned' ? HP_TOKENS.lavender : HP_TOKENS.blue, 
            display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <HPGlyph name={tab === 'personal' ? "sparkle" : tab === 'assigned' ? "target" : "people"} size={18} color="#fff"/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ ...HP_TEXT.h, fontSize: 14, color: tab === 'personal' ? HP_TOKENS.sage : HP_TOKENS.lavender }}>
              {tab === 'personal' ? 'Personal Focus' : 'Assigned by Manager'}
            </div>
            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft, fontWeight: 600, marginTop: 2 }}>
              {tab === 'personal' ? 'Target yang kamu buat sendiri untuk pengembangan diri.' : 'Target penting yang diberikan oleh atasanmu.'}
            </div>
          </div>
        </div>
      </HPCard>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button 
          onClick={() => openModal('okr_dictionary')}
          className="hp-tap"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', padding: '4px 8px',
            fontFamily: HP_FONT, fontWeight: 700, fontSize: 13, color: HP_TOKENS.blue,
            cursor: 'pointer'
          }}
        >
          <HPGlyph name="info" size={14} color={HP_TOKENS.blue} />
          Panduan KPI
        </button>
      </div>

      <SectionHeader 
        icon="target" 
        label={`${tab.toUpperCase()} KPI`}
        count={String(filteredGoals.length)} 
        action={tab === 'personal' ? "+ Baru" : undefined}
        onAction={tab === 'personal' ? () => openModal('new_goal') : undefined}
      />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredGoals.map((g: any) => (
          <div key={g.id} onClick={() => openModal('new_goal', { goal: g })} className="hp-tap">
            <GoalCard g={g}/>
          </div>
        ))}
        {filteredGoals.length === 0 && (
          <div style={{ 
            textAlign: 'center', padding: '60px 20px', color: HP_TOKENS.inkMute, 
            background: HP_TOKENS.card, borderRadius: 24, border: `1.5px solid ${HP_TOKENS.lineSoft}`
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🌱</div>
            <div style={{ ...HP_TEXT.h, fontSize: 14 }}>Belum ada KPI {tab}.</div>
            <div style={{ ...HP_TEXT.small, marginTop: 4 }}>Semangat! Teruslah tumbuh dan berkembang.</div>
          </div>
        )}
      </div>

    </div>
  );
}


