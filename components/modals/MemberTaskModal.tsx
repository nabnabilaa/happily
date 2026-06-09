"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import HPCard from "@/components/ui/HPCard";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPBar from "@/components/ui/HPBar";
import HPAvatar from "@/components/ui/HPAvatar";

interface Props {
  onClose: () => void;
  targetUserId: string;
  targetUserName: string;
}

export default function MemberTaskModal({ onClose, targetUserId, targetUserName }: Props) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch(`/api/storage?userId=${targetUserId}`);
        const data = await res.json();
        if (data.state?.priorities) {
          setTasks(data.state.priorities);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, [targetUserId]);

  const completed = tasks.filter(t => t.done).length;
  const total = tasks.length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <Modal onClose={onClose} title="Prioritas Hari Ini">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <HPAvatar name={targetUserName} size={48} />
          <div>
            <div style={{ ...HP_TEXT.h, fontSize: 16 }}>{targetUserName}</div>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>Prioritas & Task Harian</div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, color: HP_TOKENS.inkMute }}>Memuat task...</div>
        ) : (
          <>
            {/* Progress Bar */}
            <HPCard padding={16} style={{ background: HP_TOKENS.paper }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ ...HP_TEXT.small, fontWeight: 700 }}>Progress Harian</span>
                <span style={{ ...HP_TEXT.small, fontWeight: 700, color: HP_TOKENS.blue }}>{progress}%</span>
              </div>
              <HPBar value={progress} tone="blue" height={8} />
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 8 }}>
                {completed} dari {total} task selesai
              </div>
            </HPCard>

            {/* Task List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginTop: 4 }}>
                DAFTAR TASK
              </div>
              
              {tasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: HP_TOKENS.inkMute, border: `1.5px dashed ${HP_TOKENS.line}`, borderRadius: 12 }}>
                  Belum ada task hari ini
                </div>
              ) : (
                tasks.map(t => (
                  <HPCard key={t.id} padding={12} style={{ 
                    opacity: t.done ? 0.6 : 1,
                    borderLeft: `4px solid ${t.done ? HP_TOKENS.sage : HP_TOKENS.blue}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ 
                        fontSize: 16, marginTop: 2,
                        color: t.done ? HP_TOKENS.sage : HP_TOKENS.line
                      }}>
                        {t.done ? '✅' : '⭕'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          ...HP_TEXT.small, fontWeight: 700,
                          textDecoration: t.done ? 'line-through' : 'none',
                          color: t.done ? HP_TOKENS.inkSoft : HP_TOKENS.ink
                        }}>
                          {t.title}
                        </div>
                        {t.goal && (
                          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, marginTop: 2 }}>
                            🎯 {t.goal}
                          </div>
                        )}
                      </div>
                    </div>
                  </HPCard>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
