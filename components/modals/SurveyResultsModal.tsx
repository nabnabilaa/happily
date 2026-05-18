"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import HPCard from "@/components/ui/HPCard";
import HPGlyph from "@/components/ui/HPGlyph";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import { useHP } from "@/lib/HPContext";

interface SurveyResultsModalProps {
  onClose: () => void;
  surveyId: number;
}

export default function SurveyResultsModal({ onClose, surveyId }: SurveyResultsModalProps) {
  const { user } = useHP();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'responses'>('summary');
  const [expandedResponses, setExpandedResponses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const res = await fetch(`/api/hr/surveys/results?surveyId=${surveyId}&requesterId=${user?.id}`);
      const d = await res.json();
      setData(d);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const exportToExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const { survey, summary, responses } = data;

      // Tab 1: Ringkasan
      const summaryData = summary.map((q: any, i: number) => {
        let answersData = '';
        if (q.type === 'rating') {
          answersData = `Avg: ${q.average} | Dist: ` + (q.distribution || []).map((d: any) => `${d.value}⭐(${d.count})`).join(', ');
        } else if (q.type === 'yes_no' || q.type === 'multiple_choice') {
          answersData = (q.distribution || []).map((d: any) => `${d.value}(${d.count})`).join(', ');
        } else {
          answersData = (q.answers || []).join(' | ');
        }
        return {
          'No': i + 1,
          'Pertanyaan': q.question,
          'Tipe': q.type,
          'Total Jawaban': q.totalAnswers,
          'Hasil': answersData
        };
      });

      // Tab 2: Jawaban Individual
      const individualData = responses.map((r: any) => {
        const row: any = {
          'Responden': r.user_name,
          'Divisi': r.user_department,
          'Waktu': r.submitted_at ? new Date(r.submitted_at).toLocaleString('id-ID') : '',
        };
        r.answers?.forEach((a: any) => {
          const q = survey.questions?.find((sq: any) => sq.id === a.questionId);
          if (q) {
            row[q.question] = a.answer;
          }
        });
        return row;
      });

      const wb = XLSX.utils.book_new();
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      const wsIndividual = XLSX.utils.json_to_sheet(individualData);

      XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');
      XLSX.utils.book_append_sheet(wb, wsIndividual, 'Jawaban Individual');

      XLSX.writeFile(wb, `Hasil_Survey_${survey.title.replace(/\s+/g, '_')}.xlsx`);
    } catch (e) {
      console.error(e);
      alert('Gagal mengekspor Excel');
    }
  };

  if (loading) {
    return (
      <Modal onClose={onClose} title="📊 Hasil Survey">
        <div style={{ textAlign: 'center', padding: 40, color: HP_TOKENS.inkMute }}>Memuat hasil...</div>
      </Modal>
    );
  }

  if (!data || !data.survey) {
    return (
      <Modal onClose={onClose} title="📊 Hasil Survey">
        <div style={{ textAlign: 'center', padding: 40, color: HP_TOKENS.coral }}>Gagal memuat data</div>
      </Modal>
    );
  }

  const { survey, summary, totalResponses, responses } = data;

  return (
    <Modal onClose={onClose} title={`📊 ${survey.title}`}>
      <div style={{ marginTop: 4 }}>
        {/* Stats header */}
        <div style={{
          display: 'flex', gap: 10, marginBottom: 16,
          padding: '14px', borderRadius: 16, background: HP_TOKENS.lavenderSoft,
          border: `1px solid ${HP_TOKENS.lavender}20`,
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 24, color: HP_TOKENS.lavender }}>{totalResponses}</div>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>Responden</div>
          </div>
          <div style={{ width: 1, background: `${HP_TOKENS.lavender}20` }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 24, color: HP_TOKENS.ink }}>{survey.questions?.length || 0}</div>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>Pertanyaan</div>
          </div>
          <div style={{ width: 1, background: `${HP_TOKENS.lavender}20` }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 13, color: HP_TOKENS.inkSoft, marginTop: 4 }}>
              {survey.target_audience === 'department' ? `${(survey.target_departments || []).length} Divisi` : 'Semua Divisi'}
            </div>
            <div 
              style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, cursor: 'help', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }} 
              title={survey.target_audience === 'department' ? (survey.target_departments || []).join(', ') : ''}
            >
              Target {survey.target_audience === 'department' && <span style={{ fontSize: 10, background: HP_TOKENS.lineSoft, padding: '0 4px', borderRadius: 4 }}>ℹ️</span>}
            </div>
          </div>
        </div>

        {/* Tabs & Actions */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {(['summary', 'responses'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className="hp-tap" style={{
              flex: 1, padding: '10px', borderRadius: 12,
              background: activeTab === t ? HP_TOKENS.lavender : HP_TOKENS.lineSoft,
              color: activeTab === t ? '#fff' : HP_TOKENS.inkSoft,
              border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
            }}>
              {t === 'summary' ? '📊 Ringkasan' : '📋 Jawaban Individual'}
            </button>
          ))}
          <button onClick={exportToExcel} className="hp-tap" style={{
            padding: '10px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: HP_TOKENS.sageSoft, color: HP_TOKENS.sage,
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6
          }}>
            <HPGlyph name="book" size={14} color={HP_TOKENS.sage} />
            Excel
          </button>
        </div>

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {summary?.map((q: any, idx: number) => (
              <HPCard key={q.questionId} padding={16} style={{ border: `1px solid ${HP_TOKENS.line}` }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 7, background: HP_TOKENS.lavenderSoft,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 900, color: HP_TOKENS.lavender, fontFamily: HP_FONT, flexShrink: 0,
                  }}>{idx + 1}</div>
                  <div style={{ ...HP_TEXT.h, fontSize: 13, lineHeight: 1.4 }}>{q.question}</div>
                </div>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 8 }}>
                  {q.totalAnswers} jawaban · Tipe: {q.type}
                </div>

                {/* Rating visualization */}
                {q.type === 'rating' && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                      <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 28, color: HP_TOKENS.yellow }}>{q.average}</div>
                      <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute }}>/ {q.distribution?.length || 5}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {q.distribution?.map((d: any) => {
                        const pct = q.totalAnswers > 0 ? (d.count / q.totalAnswers) * 100 : 0;
                        return (
                          <div key={d.value} style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ height: 60, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', marginBottom: 4 }}>
                              <div style={{
                                width: '100%', height: `${Math.max(4, pct)}%`, borderRadius: 4,
                                background: `linear-gradient(to top, ${HP_TOKENS.yellow}, ${HP_TOKENS.yellowSoft})`,
                                transition: '0.5s',
                              }} />
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 800, color: HP_TOKENS.inkMute }}>{d.value}⭐</div>
                            <div style={{ fontSize: 9, color: HP_TOKENS.inkFade }}>{d.count}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Yes/No & Multiple Choice visualization */}
                {(q.type === 'yes_no' || q.type === 'multiple_choice') && q.distribution && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {q.distribution.map((d: any) => {
                      const pct = q.totalAnswers > 0 ? Math.round((d.count / q.totalAnswers) * 100) : 0;
                      return (
                        <div key={d.value}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ ...HP_TEXT.small, fontWeight: 700, color: HP_TOKENS.ink }}>{d.value}</span>
                            <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>{d.count} ({pct}%)</span>
                          </div>
                          <div style={{ height: 8, borderRadius: 4, background: HP_TOKENS.lineSoft, overflow: 'hidden' }}>
                            <div style={{
                              width: `${pct}%`, height: '100%', borderRadius: 4,
                              background: d.value === 'Ya' ? HP_TOKENS.sage : d.value === 'Tidak' ? HP_TOKENS.coral : HP_TOKENS.lavender,
                              transition: '0.5s',
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Text answers */}
                {(q.type === 'text' || q.type === 'paragraph') && q.answers && (
                  <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {q.answers.map((a: string, ai: number) => (
                      <div key={ai} style={{
                        padding: '8px 12px', borderRadius: 10, background: HP_TOKENS.paper,
                        ...HP_TEXT.body, fontSize: 13, color: HP_TOKENS.ink, lineHeight: 1.4,
                        borderLeft: `3px solid ${HP_TOKENS.lavender}`,
                      }}>
                        "{a}"
                      </div>
                    ))}
                  </div>
                )}
              </HPCard>
            ))}
          </div>
        )}

        {/* Responses Tab */}
        {activeTab === 'responses' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {responses?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: HP_TOKENS.inkMute }}>Belum ada responden</div>
            ) : (
              responses?.map((r: any, ri: number) => {
                const isExpanded = expandedResponses[r.id || ri];
                return (
                  <HPCard key={r.id || ri} padding={14}>
                    <div 
                      onClick={() => setExpandedResponses(prev => ({ ...prev, [r.id || ri]: !prev[r.id || ri] }))}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 10, background: HP_TOKENS.blueSoft,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: HP_FONT, fontWeight: 900, fontSize: 12, color: HP_TOKENS.blue,
                        flexShrink: 0
                      }}>
                        {r.user_name?.charAt(0) || '?'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ ...HP_TEXT.h, fontSize: 13 }}>{r.user_name}</div>
                        <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>
                          {r.user_department} · {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('id-ID') : ''}
                        </div>
                      </div>
                      <div style={{ padding: 4, background: HP_TOKENS.lineSoft, borderRadius: 8 }}>
                        <HPGlyph name={isExpanded ? "arrowUp" : "arrowDown"} size={14} color={HP_TOKENS.inkMute} />
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${HP_TOKENS.lineSoft}` }}>
                        {r.answers?.map((a: any, ai: number) => {
                          const q = survey.questions?.find((sq: any) => sq.id === a.questionId);
                          return (
                            <div key={ai} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '6px 0', borderTop: ai > 0 ? `1px solid ${HP_TOKENS.lineSoft}` : 'none' }}>
                              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700 }}>
                                {q?.question || `Q${ai + 1}`}
                              </div>
                              <div style={{ ...HP_TEXT.body, fontSize: 13, color: HP_TOKENS.ink }}>
                                {a.answer}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </HPCard>
                );
              })
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
