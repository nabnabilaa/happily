"use client";

import React, { useState } from 'react';
import HPCard from '@/components/ui/HPCard';
import { HP_TOKENS, HP_FONT, HP_TEXT } from '@/lib/constants';

interface Props {
  state: any;
}

export default function HRWellbeingDashboard({ state }: Props) {
  // Use real data from state.hrData or fallback
  const metrics = state?.hrData?.metrics;
  const wellbeingAvg = metrics?.wellbeingAvg !== undefined ? metrics.wellbeingAvg : 78;
  const wellbeingTrend = metrics?.wellbeingTrend || "+0";
  const atRisk = metrics?.atRisk !== undefined ? metrics.atRisk : 0;
  
  const deptPulse = state?.hrData?.deptPulse || [
    { dept: 'Engineering', tone: 'sage', headcount: 12, atRisk: 1, wellbeing: 82, engagement: 90 },
    { dept: 'Marketing', tone: 'coral', headcount: 8, atRisk: 2, wellbeing: 65, engagement: 70 },
    { dept: 'Sales', tone: 'yellow', headcount: 15, atRisk: 1, wellbeing: 75, engagement: 85 }
  ];

  const isWbTrendPos = !wellbeingTrend.includes('-');

  const [currentPageDepts, setCurrentPageDepts] = useState(1);
  const deptsPerPage = 5;
  const totalPagesDepts = Math.ceil(deptPulse.length / deptsPerPage);
  const activePage = Math.min(currentPageDepts, Math.max(1, totalPagesDepts));
  const paginatedDepts = deptPulse.slice((activePage - 1) * deptsPerPage, activePage * deptsPerPage);

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 900, marginBottom: 12, letterSpacing: 1 }}>
        WELLBEING RADAR (COMPANY WIDE)
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <HPCard padding={16} style={{ background: HP_TOKENS.card }}>
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>Company Wellbeing</div>
          <div style={{ ...HP_TEXT.h, fontSize: 24, color: HP_TOKENS.sage }}>{wellbeingAvg}/100</div>
          <div style={{ ...HP_TEXT.small, color: isWbTrendPos ? HP_TOKENS.sage : HP_TOKENS.coral, marginTop: 4 }}>
            {wellbeingTrend}% vs last week
          </div>
        </HPCard>
        <HPCard padding={16} style={{ background: HP_TOKENS.card }}>
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>Total At Risk</div>
          <div style={{ ...HP_TEXT.h, fontSize: 24, color: HP_TOKENS.coral }}>{atRisk} Karyawan</div>
          <div style={{ ...HP_TEXT.small, color: atRisk > 0 ? HP_TOKENS.coral : HP_TOKENS.sage, marginTop: 4 }}>
            {atRisk > 0 ? 'Needs attention' : 'All good'}
          </div>
        </HPCard>
      </div>

      <HPCard padding={16} style={{ background: HP_TOKENS.card }}>
        <div style={{ ...HP_TEXT.h, fontSize: 15, marginBottom: 16 }}>Status per Departemen</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {paginatedDepts.map((dept: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ ...HP_TEXT.body, fontSize: 14, fontWeight: 700 }}>{dept.dept}</div>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>{dept.headcount} Karyawan</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ 
                  display: 'inline-block', padding: '4px 8px', borderRadius: 6,
                  background: dept.wellbeing > 80 ? HP_TOKENS.sageWash : dept.wellbeing > 70 ? HP_TOKENS.yellowWash : HP_TOKENS.coralSoft,
                  color: dept.wellbeing > 80 ? HP_TOKENS.sage : dept.wellbeing > 70 ? HP_TOKENS.yellow : HP_TOKENS.coral,
                  fontWeight: 900, fontSize: 12
                }}>
                  {dept.wellbeing} Score
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPagesDepts > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <button 
              onClick={() => setCurrentPageDepts(p => Math.max(1, p - 1))}
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
              {activePage} / {totalPagesDepts}
            </span>
            <button 
              onClick={() => setCurrentPageDepts(p => Math.min(totalPagesDepts, p + 1))}
              disabled={activePage === totalPagesDepts}
              style={{
                padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
                background: activePage === totalPagesDepts ? HP_TOKENS.lineSoft : '#fff',
                color: activePage === totalPagesDepts ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
                fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, 
                cursor: activePage === totalPagesDepts ? 'default' : 'pointer',
                opacity: activePage === totalPagesDepts ? 0.6 : 1, transition: 'all 0.2s'
              }}
            >
              Berikutnya
            </button>
          </div>
        )}
      </HPCard>
    </div>
  );
}
