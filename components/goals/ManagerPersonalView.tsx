import React, { useState, useMemo } from 'react';
import { HP_TOKENS, HP_FONT, HP_TEXT } from '@/lib/constants';
import SectionHeader from '@/components/home/SectionHeader';
import GoalCard from '@/components/goals/GoalCard';
import TaskHarianWidget from '@/components/home/TaskHarianWidget';

interface ManagerPersonalViewProps {
  combinedMyGoals: any[];
  loadingKpis: boolean;
  openModal: (name: string, props?: any) => void;
  // kept for backwards compat but unused — task management now via TaskHarianWidget
  personalTasks?: any[];
  updateState?: (update: any) => void;
  setTaskToDelete?: (id: string | number) => void;
}

export default function ManagerPersonalView({
  combinedMyGoals,
  loadingKpis,
  openModal,
}: ManagerPersonalViewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 5;
  const totalPages = Math.ceil(combinedMyGoals.length / perPage);
  const activePage = Math.min(currentPage, Math.max(1, totalPages));

  const paginated = useMemo(() => {
    const start = (activePage - 1) * perPage;
    return combinedMyGoals.slice(start, start + perPage);
  }, [combinedMyGoals, activePage]);

  return (
    <>
      {/* Task harian — pakai komponen yang sama dengan employee */}
      <TaskHarianWidget openModal={openModal} />

      {/* Target / KPI personal */}
      <div style={{ marginTop: 24 }}>
        <SectionHeader
          icon="target"
          label="Target / KPI Saya"
          count={String(combinedMyGoals.length)}
          action="+ Target/KPI Mandiri"
          onAction={() => openModal('new_goal', { scope: 'personal' })}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          {paginated.map((g: any) => (
            <div
              key={g.id}
              onClick={() => { if (!g.isApiKpi) openModal('new_goal', { goal: g }); }}
              className={g.isApiKpi ? '' : 'hp-tap'}
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

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={activePage === 1}
              style={{
                padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
                background: activePage === 1 ? HP_TOKENS.lineSoft : '#fff',
                color: activePage === 1 ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
                fontFamily: HP_FONT, fontWeight: 700, fontSize: 12,
                cursor: activePage === 1 ? 'default' : 'pointer',
                opacity: activePage === 1 ? 0.6 : 1, transition: 'all 0.2s'
              }}
            >
              Sebelumnya
            </button>
            <span style={{ fontFamily: HP_FONT, fontSize: 13, fontWeight: 700, color: HP_TOKENS.inkSoft }}>
              {activePage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={activePage === totalPages}
              style={{
                padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
                background: activePage === totalPages ? HP_TOKENS.lineSoft : '#fff',
                color: activePage === totalPages ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
                fontFamily: HP_FONT, fontWeight: 700, fontSize: 12,
                cursor: activePage === totalPages ? 'default' : 'pointer',
                opacity: activePage === totalPages ? 0.6 : 1, transition: 'all 0.2s'
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
