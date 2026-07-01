import React, { useState, useMemo } from 'react';
import { HP_TOKENS, HP_FONT, HP_TEXT } from '@/lib/constants';
import HPGlyph from '@/components/ui/HPGlyph';
import HPCard from '@/components/ui/HPCard';
import SectionHeader from '@/components/home/SectionHeader';
import GoalCard from '@/components/goals/GoalCard';

interface ManagerPersonalViewProps {
  personalTasks: any[];
  combinedMyGoals: any[];
  loadingKpis: boolean;
  updateState: (update: any) => void;
  openModal: (name: string, props?: any) => void;
  setTaskToDelete: (id: string | number) => void;
}

export default function ManagerPersonalView({
  personalTasks,
  combinedMyGoals,
  loadingKpis,
  updateState,
  openModal,
  setTaskToDelete
}: ManagerPersonalViewProps) {
  const [currentPagePersonalKPI, setCurrentPagePersonalKPI] = useState(1);
  const personalKpiPerPage = 5;
  const totalPagesPersonalKPI = Math.ceil(combinedMyGoals.length / personalKpiPerPage);
  const activePagePersonalKPI = Math.min(currentPagePersonalKPI, Math.max(1, totalPagesPersonalKPI));
  
  const paginatedPersonalKPIs = useMemo(() => {
    const start = (activePagePersonalKPI - 1) * personalKpiPerPage;
    return combinedMyGoals.slice(start, start + personalKpiPerPage);
  }, [combinedMyGoals, activePagePersonalKPI]);

  return (
    <>
      <SectionHeader 
        icon="sparkle" 
        label="Daily Tasks Saya" 
        count={String(personalTasks.length)} 
        action="+ Tambah Task"
        onAction={() => openModal('manage_priorities')}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {personalTasks.map((t: any) => (
          <HPCard key={t.id} padding={14}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button 
                onClick={() => updateState((s: any) => ({
                  ...s,
                  priorities: s.priorities.map((p: any) => p.id === t.id ? { ...p, done: !p.done } : p)
                }))}
                style={{ 
                  width: 24, height: 24, borderRadius: 8, border: `2px solid ${t.done ? HP_TOKENS.sage : HP_TOKENS.line}`,
                  background: t.done ? HP_TOKENS.sage : 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                {t.done && <HPGlyph name="check" size={14} color="#F4F7F9" />}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ ...HP_TEXT.h, fontSize: 14, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? HP_TOKENS.inkMute : HP_TOKENS.ink }}>{t.title}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>{t.goal || 'General'}</div>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.blue }}>{t.est || '15m'}</div>
                </div>
              </div>
              <button
                onClick={() => setTaskToDelete(t.id)}
                style={{
                  background: HP_TOKENS.coralSoft, border: 'none', cursor: 'pointer',
                  width: 28, height: 28, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                title="Hapus Task"
              >
                <HPGlyph name="trash" size={12} color={HP_TOKENS.coral} />
              </button>
            </div>
          </HPCard>
        ))}
        {personalTasks.length === 0 && <div style={{ textAlign: 'center', padding: 20, color: HP_TOKENS.inkMute, background: HP_TOKENS.card, borderRadius: 20, border: `1.5px dashed ${HP_TOKENS.lineSoft}` }}>Belum ada task harian. Mulai harimu dengan fokus!</div>}
      </div>

      <div style={{ marginTop: 24 }}>
        <SectionHeader 
          icon="target" 
          label="Target / KPI Saya"
          count={String(combinedMyGoals.length)} 
          action="+ Target/KPI Mandiri"
          onAction={() => openModal('new_goal', { scope: 'personal' })}
        />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          {paginatedPersonalKPIs.map((g: any) => (
            <div 
              key={g.id} 
              onClick={() => {
                if (g.isApiKpi) return;
                openModal('new_goal', { goal: g });
              }} 
              className={g.isApiKpi ? "" : "hp-tap"}
            >
              <GoalCard g={g} isReadOnly={g.isApiKpi} />
            </div>
          ))}
          {combinedMyGoals.length === 0 && !loadingKpis && (
            <div style={{ 
              textAlign: 'center', padding: '40px 20px', color: HP_TOKENS.inkMute, 
              background: HP_TOKENS.card, borderRadius: 24, border: `1.5px solid ${HP_TOKENS.lineSoft}`
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🌱</div>
              <div style={{ ...HP_TEXT.h, fontSize: 14 }}>Belum ada KPI personal.</div>
              <div style={{ ...HP_TEXT.small, marginTop: 4 }}>Tambahkan KPI Mandiri baru untuk melacak target kerjamu.</div>
            </div>
          )}
          {loadingKpis && combinedMyGoals.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: HP_TOKENS.inkMute }}>
              Memuat KPI...
            </div>
          )}
        </div>

        {totalPagesPersonalKPI > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <button 
              onClick={() => setCurrentPagePersonalKPI(p => Math.max(1, p - 1))}
              disabled={activePagePersonalKPI === 1}
              style={{
                padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
                background: activePagePersonalKPI === 1 ? HP_TOKENS.lineSoft : '#fff',
                color: activePagePersonalKPI === 1 ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
                fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, 
                cursor: activePagePersonalKPI === 1 ? 'default' : 'pointer',
                opacity: activePagePersonalKPI === 1 ? 0.6 : 1, transition: 'all 0.2s'
              }}
            >
              Sebelumnya
            </button>
            <span style={{ fontFamily: HP_FONT, fontSize: 13, fontWeight: 700, color: HP_TOKENS.inkSoft }}>
              {activePagePersonalKPI} / {totalPagesPersonalKPI}
            </span>
            <button 
              onClick={() => setCurrentPagePersonalKPI(p => Math.min(totalPagesPersonalKPI, p + 1))}
              disabled={activePagePersonalKPI === totalPagesPersonalKPI}
              style={{
                padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
                background: activePagePersonalKPI === totalPagesPersonalKPI ? HP_TOKENS.lineSoft : '#fff',
                color: activePagePersonalKPI === totalPagesPersonalKPI ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
                fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, 
                cursor: activePagePersonalKPI === totalPagesPersonalKPI ? 'default' : 'pointer',
                opacity: activePagePersonalKPI === totalPagesPersonalKPI ? 0.6 : 1, transition: 'all 0.2s'
              }}
            >
              Berikutnya
            </button>
          </div>
        )}
      </div>
    </>
  );
}
