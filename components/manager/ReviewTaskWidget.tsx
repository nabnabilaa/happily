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

  const fetchTasks = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/manager/tasks/pending?userId=${user.id}`);
      const data = await res.json();
      if (data.tasks) {
        setTasks(data.tasks);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user?.id]);

  const handleAction = async (taskId: string, status: string) => {
    const notes = prompt(status === 'revision' ? 'Masukkan catatan revisi:' : 'Masukkan catatan (opsional):');
    if (status === 'revision' && !notes) return;

    try {
      const res = await fetch(`/api/manager/tasks/pending`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status, notes })
      });
      if (res.ok) {
        setTasks(prev => prev.filter(t => t.id !== taskId));
      }
    } catch (e) {
      console.error(e);
      alert('Gagal memproses aksi');
    }
  };

  if (!user || user.role !== 'manager') return null;
  if (!loading && tasks.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <SectionHeader 
        icon="activity" 
        label="Review Task Tim" 
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
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800 }}>{t.userName}</div>
                  <div style={{ ...HP_TEXT.h, fontSize: 16, color: HP_TOKENS.ink, marginTop: 4 }}>{t.title}</div>
                  {t.goalTitle && (
                    <div style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: 4, 
                      background: HP_TOKENS.blueWash, padding: '2px 8px', borderRadius: 6, marginTop: 6 
                    }}>
                      <span style={{ fontSize: 10 }}>🎯</span>
                      <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.blue, fontWeight: 800, fontSize: 10 }}>{t.goalTitle}</span>
                    </div>
                  )}
                  {t.proofLink && (
                    <div style={{ marginTop: 8 }}>
                      <a href={t.proofLink} target="_blank" rel="noopener noreferrer" style={{ ...HP_TEXT.tiny, color: HP_TOKENS.blue, fontWeight: 700, textDecoration: 'none' }}>
                        📎 Lihat Bukti Kerja
                      </a>
                    </div>
                  )}
                  {t.proofNotes && (
                    <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 4, fontStyle: 'italic' }}>
                      "{t.proofNotes}"
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                  <button onClick={() => handleAction(t.id, 'approved')} className="hp-tap" style={{
                    padding: '8px 16px', borderRadius: 10, border: 'none', background: HP_TOKENS.sage, color: '#fff',
                    fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, cursor: 'pointer', width: '100px'
                  }}>
                    Terima
                  </button>
                  <button onClick={() => handleAction(t.id, 'revision')} className="hp-tap" style={{
                    padding: '8px 16px', borderRadius: 10, border: 'none', background: HP_TOKENS.coralWash, color: HP_TOKENS.coral,
                    fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, cursor: 'pointer', width: '100px'
                  }}>
                    Revisi
                  </button>
                  <button onClick={() => handleAction(t.id, 'rejected')} className="hp-tap" style={{
                    padding: '8px 16px', borderRadius: 10, border: 'none', background: HP_TOKENS.lineSoft, color: HP_TOKENS.inkMute,
                    fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, cursor: 'pointer', width: '100px'
                  }}>
                    Tolak
                  </button>
                </div>
              </div>
            </HPCard>
          ))
        )}
      </div>
    </div>
  );
}
