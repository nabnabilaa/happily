"use client";

import React, { useState, useEffect } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPCard from "@/components/ui/HPCard";
import SectionHeader from "@/components/home/SectionHeader";
import HPGlyph from "@/components/ui/HPGlyph";

export default function ReviewTaskWidget() {
  const { user } = useHP();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // `silent` menahan spinner saat refresh latar. Tanpa itu antrean berkedip
  // "Memuat task..." tiap kali ada anggota tim yang mengumpulkan.
  const fetchTasks = async (silent = false) => {
    if (!user?.id) return;
    try {
      if (!silent) setLoading(true);
      const res = await fetch(`/api/manager/tasks/pending?userId=${user.id}`);
      const data = await res.json();
      if (data.tasks) {
        setTasks(data.tasks);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  /*
   * Widget ini dulu hanya mengambil data sekali seumur hidup komponen. Manajer
   * yang membiarkan halamannya terbuka tidak akan pernah melihat pekerjaan yang
   * masuk setelahnya — antreannya tetap kosong sementara timnya menunggu ACC.
   *
   * `hp_db_update` adalah kanal yang sama yang dipakai komponen lain, dan
   * sekarang `/api/priorities/complete` benar-benar memancarkannya ke manajer.
   */
  useEffect(() => {
    fetchTasks();
    const handleUpdate = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchTasks(true);
      }
    };
    window.addEventListener('hp_db_update', handleUpdate);
    return () => window.removeEventListener('hp_db_update', handleUpdate);
  }, [user?.id]);

  if (!user || user.role !== 'manager') return null;
  if (!loading && tasks.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <SectionHeader
        icon="activity"
        label="Menunggu ACC di Review KPI"
        count={tasks.length.toString()}
      />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, color: HP_TOKENS.inkMute }}>Memuat task...</div>
        ) : (
          tasks.map(t => (
            <HPCard key={t.id} padding={16} style={{ border: `1.5px solid ${HP_TOKENS.yellowWash}`, background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700 }}>{t.userName}</div>
                  <div style={{ ...HP_TEXT.h, fontSize: 16, color: HP_TOKENS.ink, marginTop: 4 }}>{t.title}</div>
                  {t.goalTitle && (
                    <div style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: 4, 
                      background: HP_TOKENS.blueWash, padding: '2px 8px', borderRadius: 6, marginTop: 6 
                    }}>
                      <span style={{ fontSize: 10 }}><HPGlyph name="target" size={12} color="currentColor" /></span>
                      <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.blue, fontWeight: 700, fontSize: 10 }}>{t.goalTitle}</span>
                    </div>
                  )}
                  {(t.proofLinks || []).length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {t.proofLinks.map((link: string, i: number) => (
                        <a key={i} href={link} target="_blank" rel="noopener noreferrer" style={{ ...HP_TEXT.tiny, color: HP_TOKENS.blue, fontWeight: 700, textDecoration: 'none' }}>
                          📎 Bukti Kerja {t.proofLinks.length > 1 ? i + 1 : ''}
                        </a>
                      ))}
                    </div>
                  )}
                  {t.metricValue !== null && t.metricValue !== undefined && (
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkSoft, marginTop: 4 }}>
                      <strong>Hasil:</strong> {t.metricValue}
                    </div>
                  )}
                  {t.proofNotes && (
                    <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 4, fontStyle: 'italic' }}>
                      "{t.proofNotes}"
                    </div>
                  )}
                </div>

                {/* Ringkasan, bukan antrean keputusan. Task-task ini di-ACC
                    sekaligus saat KPI induknya disetujui di Review KPI. */}
                <div style={{
                  flexShrink: 0, alignSelf: 'flex-start',
                  padding: '4px 10px', borderRadius: 99,
                  background: HP_TOKENS.yellowSoft, color: HP_TOKENS.yellowDark,
                  fontFamily: HP_FONT, fontSize: 10, fontWeight: 700,
                }}>
                  Menunggu ACC
                </div>
              </div>
            </HPCard>
          ))
        )}
      </div>
    </div>
  );
}
