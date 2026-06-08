"use client";

import React, { useState, useEffect } from "react";
import HPCard from "@/components/ui/HPCard";
import HPGlyph from "@/components/ui/HPGlyph";
import SectionHeader from "@/components/home/SectionHeader";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import { useHP } from "@/lib/HPContext";

interface SurveySectionProps {
  openModal: (name: string, props?: any) => void;
}

export default function SurveySection({ openModal }: SurveySectionProps) {
  const { user } = useHP();
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSurveys();
  }, [user?.id]);

  const fetchSurveys = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/hr/surveys?userId=${user.id}&dept=${(user as any).department || ''}`);
      const data = await res.json();
      // Only show active surveys user hasn't responded to
      setSurveys((data.surveys || []).filter((s: any) => s.status === 'active' && !s.hasResponded));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  if (loading || surveys.length === 0) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <SectionHeader icon="book" label="Survey untuk Kamu" count={String(surveys.length)} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {surveys.map((sr: any) => {
          const isInternal = sr.questions && sr.questions.length > 0;
          const questionCount = sr.questions?.length || 0;
          const deadlineStr = sr.deadline
            ? new Date(sr.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
            : null;
          const isUrgent = sr.deadline && new Date(sr.deadline) < new Date(Date.now() + 3 * 86400000);

          return (
            <HPCard
              key={sr.id}
              padding={16}
              onClick={() => openModal('take_survey', { survey: sr })}
              style={{
                cursor: 'pointer',
                border: `1.5px solid ${isUrgent ? `${HP_TOKENS.coral}40` : `${HP_TOKENS.lavender}40`}`,
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: isUrgent ? HP_TOKENS.coralSoft : HP_TOKENS.lavenderSoft,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <HPGlyph name="book" size={22} color={isUrgent ? HP_TOKENS.coral : HP_TOKENS.lavender} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...HP_TEXT.h, fontSize: 14 }}>{sr.title}</div>
                  {sr.description && (
                    <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft, fontSize: 12, marginTop: 2, lineHeight: 1.3 }}>
                      {sr.description.substring(0, 60)}{sr.description.length > 60 ? '...' : ''}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    {isInternal && (
                      <div style={{
                        padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 800,
                        background: HP_TOKENS.blueSoft, color: HP_TOKENS.blue, fontFamily: HP_FONT,
                      }}>
                        {questionCount} pertanyaan
                      </div>
                    )}
                    {deadlineStr && (
                      <div style={{
                        padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 800,
                        background: isUrgent ? HP_TOKENS.coralSoft : HP_TOKENS.yellowSoft,
                        color: isUrgent ? HP_TOKENS.coral : '#8A6814', fontFamily: HP_FONT,
                      }}>
                        ⏰ {deadlineStr}
                      </div>
                    )}
                    <div style={{
                      padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 800,
                      background: HP_TOKENS.sageWash, color: HP_TOKENS.sage, fontFamily: HP_FONT,
                    }}>
                      +20 Poin
                    </div>
                  </div>
                </div>
                <HPGlyph name="chevronRight" size={18} color={HP_TOKENS.inkMute} />
              </div>
            </HPCard>
          );
        })}
      </div>
    </div>
  );
}
