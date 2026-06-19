"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import ScreenHeader from "@/components/ui/ScreenHeader";
import TabBar from "@/components/ui/TabBar";
import SectionHeader from "@/components/home/SectionHeader";
import GoalCard from "@/components/goals/GoalCard";
import ReviewTaskWidget from "@/components/manager/ReviewTaskWidget";

interface GoalsScreenProps {
  openModal: (name: string, props?: any) => void;
}

export default function GoalsScreen({ openModal }: GoalsScreenProps) {
  const { state, user } = useHP();
  const [tab, setTab] = useState('personal');
  const [apiKpis, setApiKpis] = useState<any[]>([]);
  const [loadingKpis, setLoadingKpis] = useState(true);

  // Fetch both Manager-assigned KPIs and Personal KPIs
  useEffect(() => {
    async function fetchKPIs() {
      if (!user?.id) return;
      try {
        setLoadingKpis(true);
        const m = new Date().getMonth() + 1;
        const y = new Date().getFullYear();

        const managerRes = await fetch(`/api/kpi?userId=${user.id}&role=employee&month=${m}&year=${y}`);
        const managerData = await managerRes.json();
        const managerKpis = (managerData.kpis || []).map((k: any) => ({
          id: String(k.id),
          title: k.title,
          progress: k.finalScore !== null && k.finalScore !== undefined ? Number(k.finalScore) : 0,
          alignment: k.weight || 0,
          due: `${m}/${y}`,
          tone: 'lavender',
          metric: k.targetDescription || 'KPI Bulanan (Manager)',
          scope: 'assigned',
          owner: k.assigneeName || user.name || 'You',
          ownerId: String(k.assignedTo),
          status: k.status === 'active' ? 'approved' : k.status,
          is_kpi: true,
          isApiKpi: true,
          subGoals: []
        }));

        const personalRes = await fetch(`/api/kpi/personal?userId=${user.id}&month=${m}&year=${y}`);
        const personalData = await personalRes.json();
        const personalKpis = (personalData.kpis || []).map((k: any) => ({
          id: String(k.id),
          title: k.title,
          progress: k.progress || 0,
          alignment: 0,
          due: `${m}/${y}`,
          tone: 'sage',
          metric: k.targetDescription || `${k.currentValue || 0}/${k.targetValue || 0} ${k.metricUnit || ''}`,
          scope: 'personal',
          owner: user.name || 'You',
          ownerId: String(user.id),
          status: k.status || 'active',
          is_kpi: true,
          isApiKpi: true,
          subGoals: []
        }));

        setApiKpis([...managerKpis, ...personalKpis]);
      } catch (e) {
        console.error("Failed to load KPIs in GoalsScreen:", e);
      } finally {
        setLoadingKpis(false);
      }
    }
    fetchKPIs();
  }, [user?.id]);

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [tab]);

  const handleEditProgress = async (kpiId: string, progress: number) => {
    try {
      const res = await fetch(`/api/kpi`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kpiId, finalScore: progress })
      });
      if (res.ok) {
        setApiKpis(prev => prev.map(k => String(k.id) === String(kpiId) ? { ...k, progress } : k));
      }
    } catch (e) {
      console.error(e);
      alert('Gagal mengupdate progress');
    }
  };

  const combinedGoals = useMemo(() => {
    return [...apiKpis];
  }, [apiKpis]);

  const goalsPerPage = 5;
  const totalPages = Math.ceil(combinedGoals.length / goalsPerPage);
  const activePage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedGoals = useMemo(() => {
    const start = (activePage - 1) * goalsPerPage;
    return combinedGoals.slice(start, start + goalsPerPage);
  }, [combinedGoals, activePage]);

  if (!user) return null;

  return (
    <div style={{ padding: '0 16px 120px', fontFamily: HP_FONT }}>
      <ScreenHeader title="Indikator Kinerja (KPI)" subtitle="Pantau kemajuan target utama yang harus kamu capai bulan ini" />

      {user?.role === 'manager' && <ReviewTaskWidget />}

      <SectionHeader 
        icon="target" 
        label="DAFTAR KPI BULAN INI"
        count={String(combinedGoals.length)} 
      />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {paginatedGoals.map((g: any) => (
          <div 
            key={g.id} 
          >
            <GoalCard 
              g={g} 
              isReadOnly={g.isApiKpi} 
              onEditProgress={user?.role === 'manager' ? (p) => handleEditProgress(g.id, p) : undefined}
            />
          </div>
        ))}
        {combinedGoals.length === 0 && !loadingKpis && (
          <div style={{ 
            textAlign: 'center', padding: '60px 20px', color: HP_TOKENS.inkMute, 
            background: HP_TOKENS.card, borderRadius: 24, border: `1.5px solid ${HP_TOKENS.lineSoft}`
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🌱</div>
            <div style={{ ...HP_TEXT.h, fontSize: 14 }}>Belum ada KPI {tab}.</div>
            <div style={{ ...HP_TEXT.small, marginTop: 4 }}>Semangat! Teruslah tumbuh dan berkembang.</div>
          </div>
        )}
        {loadingKpis && combinedGoals.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: HP_TOKENS.inkMute }}>
            Memuat KPI...
          </div>
        )}

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

    </div>
  );
}
