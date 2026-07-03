"use client";

import React, { useState } from 'react';
import HPCard from '@/components/ui/HPCard';
import HPGlyph from '@/components/ui/HPGlyph';
import { HP_TOKENS, HP_FONT, HP_TEXT } from '@/lib/constants';

interface Props {
  state: any;
  openModal?: (name: string, props?: any) => void;
  onGoToBurnout?: () => void;
}

export default function HRWellbeingDashboard({ state, openModal, onGoToBurnout }: Props) {
  // Use real data from state.hrData or fallback
  const metrics = state?.hrData?.metrics;
  const wellbeingAvg = metrics?.wellbeingAvg !== undefined ? metrics.wellbeingAvg : 78;
  const wellbeingTrend = metrics?.wellbeingTrend || "+0";
  const atRisk = state?.hrData?.atRiskEmployees?.length || 0;
  
  const deptPulse = state?.hrData?.deptPulse || [
    { dept: 'Engineering', tone: 'sage', headcount: 12, atRisk: 1, wellbeing: 82, engagement: 90 },
    { dept: 'Marketing', tone: 'coral', headcount: 8, atRisk: 2, wellbeing: 65, engagement: 70 },
    { dept: 'Sales', tone: 'yellow', headcount: 15, atRisk: 1, wellbeing: 75, engagement: 85 }
  ];

  const isWbTrendPos = !wellbeingTrend.includes('-');

  const [isOpen, setIsOpen] = useState(false);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  
  const DEPTS_PER_PAGE = 3;
  const [currentDeptPage, setCurrentDeptPage] = useState(1);
  const totalDeptPages = Math.ceil(deptPulse.length / DEPTS_PER_PAGE);
  const currentDepts = deptPulse.slice((currentDeptPage - 1) * DEPTS_PER_PAGE, currentDeptPage * DEPTS_PER_PAGE);

  const handleRiskClick = () => {
    if (atRisk > 0 && onGoToBurnout) {
      onGoToBurnout();
    } else if (atRisk === 0) {
      window.alert('Saat ini tidak ada karyawan yang berada di zona berisiko.');
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <HPCard 
        padding={isOpen ? 16 : 14} 
        style={{ 
          background: `linear-gradient(135deg, ${HP_TOKENS.blueWash} 0%, ${HP_TOKENS.blueSoft} 100%)`, 
          border: `1.5px solid ${HP_TOKENS.blue}30`,
          transition: 'all 0.3s ease'
        }}
      >
        {/* Header - Always visible */}
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="hp-tap"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ 
              width: 40, height: 40, borderRadius: 12, 
              background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 12px ${HP_TOKENS.blue}15`, fontSize: 20
            }}>
              📡
            </div>
            <div>
              <div style={{ ...HP_TEXT.small, fontWeight: 900, color: HP_TOKENS.blue, letterSpacing: 0.5 }}>WELLBEING RADAR (ALL)</div>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkSoft, marginTop: 2 }}>
                Avg Score: <strong style={{ color: HP_TOKENS.ink }}>{wellbeingAvg}/100</strong> • {atRisk} at risk
              </div>
            </div>
          </div>
          <div style={{ 
            width: 32, height: 32, borderRadius: 16, background: 'rgba(255,255,255,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={HP_TOKENS.blue} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>

        {/* Expanded Content */}
        {isOpen && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px dashed ${HP_TOKENS.blue}40`, animation: 'hpFadeIn 0.3s ease' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.7)', borderRadius: 12 }}>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>Company Avg</div>
                <div style={{ ...HP_TEXT.h, fontSize: 20, color: HP_TOKENS.sage }}>{wellbeingAvg}</div>
                <div style={{ ...HP_TEXT.small, color: isWbTrendPos ? HP_TOKENS.sage : HP_TOKENS.coral, marginTop: 2, fontSize: 11 }}>
                  {wellbeingTrend}% vs last week
                </div>
              </div>
              <div 
                className="hp-tap"
                onClick={handleRiskClick}
                style={{ padding: '12px', background: 'rgba(255,255,255,0.7)', borderRadius: 12, cursor: 'pointer', border: `1.5px solid transparent` }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = HP_TOKENS.coralSoft)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>Total At Risk</div>
                  <HPGlyph name="arrow-up-right" size={14} color={HP_TOKENS.inkSoft} />
                </div>
                <div style={{ ...HP_TEXT.h, fontSize: 20, color: HP_TOKENS.coral }}>{atRisk}</div>
                <div style={{ ...HP_TEXT.small, color: atRisk > 0 ? HP_TOKENS.coral : HP_TOKENS.sage, marginTop: 2, fontSize: 11 }}>
                  {atRisk > 0 ? 'Lihat daftar di bawah' : 'All good'}
                </div>
              </div>
            </div>

            <div style={{ ...HP_TEXT.small, fontWeight: 800, color: HP_TOKENS.ink, marginBottom: 10 }}>Status Departemen</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {currentDepts.map((dept: any, i: number) => (
                <div key={i} style={{ 
                  background: '#fff', padding: '10px 14px', borderRadius: 12, border: `1px solid ${expandedDept === dept.dept ? HP_TOKENS.blue : HP_TOKENS.lineSoft}`,
                  transition: 'all 0.2s', overflow: 'hidden'
                }}>
                  <div 
                    className="hp-tap"
                    onClick={() => setExpandedDept(expandedDept === dept.dept ? null : dept.dept)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                  >
                    <div>
                      <div style={{ ...HP_TEXT.body, fontSize: 13, fontWeight: 800 }}>{dept.dept}</div>
                      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>{dept.headcount} anggota</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ 
                        padding: '4px 8px', borderRadius: 8,
                        background: dept.wellbeing > 80 ? HP_TOKENS.sageWash : dept.wellbeing > 70 ? HP_TOKENS.yellowWash : HP_TOKENS.coralSoft,
                        color: dept.wellbeing > 80 ? HP_TOKENS.sage : dept.wellbeing > 70 ? HP_TOKENS.yellow : HP_TOKENS.coral,
                        fontWeight: 900, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4
                      }}>
                        {dept.wellbeing} <span style={{fontSize:10, opacity:0.8}}>SCORE</span>
                      </div>
                      <div style={{ transform: expandedDept === dept.dept ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'flex' }}>
                        <HPGlyph name="chevron-right" size={16} color={HP_TOKENS.inkMute} />
                      </div>
                    </div>
                  </div>
                  
                  {/* Mock Detail Drill-down */}
                  {expandedDept === dept.dept && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${HP_TOKENS.line}`, animation: 'hpFadeIn 0.3s ease' }}>
                      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkSoft, marginBottom: 8 }}>Top Performer vs At Risk (Sample)</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: HP_TOKENS.paper, borderRadius: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 24, height: 24, borderRadius: 12, background: HP_TOKENS.sageSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>W</div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: HP_TOKENS.ink }}>Wawan (Manager)</span>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 800, color: HP_TOKENS.sage }}>92 Score</span>
                        </div>
                        {dept.atRisk > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: HP_TOKENS.coralSoft, borderRadius: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 24, height: 24, borderRadius: 12, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>A</div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: HP_TOKENS.coral }}>Andi (Staff)</span>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 800, color: HP_TOKENS.coral }}>54 Score</span>
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          window.dispatchEvent(new CustomEvent('hp_switch_tab', { detail: 'goals' }));
                        }}
                        style={{ width: '100%', padding: '6px 0', marginTop: 8, background: 'transparent', border: `1px solid ${HP_TOKENS.blue}40`, borderRadius: 8, color: HP_TOKENS.blue, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                      >
                        Lihat Seluruh Anggota
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalDeptPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, padding: '8px 4px' }}>
                <button
                  onClick={() => setCurrentDeptPage(prev => Math.max(1, prev - 1))}
                  disabled={currentDeptPage === 1}
                  className="hp-tap"
                  style={{
                    padding: '6px 12px', borderRadius: 8, border: 'none', cursor: currentDeptPage === 1 ? 'not-allowed' : 'pointer',
                    background: currentDeptPage === 1 ? 'rgba(255,255,255,0.4)' : '#fff',
                    color: currentDeptPage === 1 ? HP_TOKENS.inkMute : HP_TOKENS.blue,
                    fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, transition: 'all 0.2s',
                    boxShadow: currentDeptPage === 1 ? 'none' : `0 2px 8px ${HP_TOKENS.blue}20`
                  }}
                >
                  Prev
                </button>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkSoft, fontWeight: 800 }}>
                  Page {currentDeptPage} / {totalDeptPages}
                </div>
                <button
                  onClick={() => setCurrentDeptPage(prev => Math.min(totalDeptPages, prev + 1))}
                  disabled={currentDeptPage === totalDeptPages}
                  className="hp-tap"
                  style={{
                    padding: '6px 12px', borderRadius: 8, border: 'none', cursor: currentDeptPage === totalDeptPages ? 'not-allowed' : 'pointer',
                    background: currentDeptPage === totalDeptPages ? 'rgba(255,255,255,0.4)' : '#fff',
                    color: currentDeptPage === totalDeptPages ? HP_TOKENS.inkMute : HP_TOKENS.blue,
                    fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, transition: 'all 0.2s',
                    boxShadow: currentDeptPage === totalDeptPages ? 'none' : `0 2px 8px ${HP_TOKENS.blue}20`
                  }}
                >
                  Next
                </button>
              </div>
            )}

            {/* Indicator explanation */}
            <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(255,255,255,0.5)', borderRadius: 8, display: 'flex', gap: 8 }}>
              <div style={{ fontSize: 14 }}>💡</div>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkSoft, lineHeight: 1.4 }}>
                <strong>Indikator At Risk:</strong> Karyawan dengan rata-rata Wellbeing Score &lt; 60 atau memiliki indikasi Burnout (kelelahan emosional tinggi) dalam 7 hari terakhir.
              </div>
            </div>
          </div>
        )}
      </HPCard>
    </div>
  );
}
