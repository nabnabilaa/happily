"use client";

import React from 'react';
import HPCard from '@/components/ui/HPCard';
import { HP_TOKENS, HP_FONT, HP_TEXT } from '@/lib/constants';

interface Props {
  state: any;
}

export default function HRWellbeingDashboard({ state }: Props) {
  // Use mock or real data from state.hrData
  const deptPulse = state?.hrData?.deptPulse || [
    { dept: 'Engineering', tone: 'sage', headcount: 12, atRisk: 1, wellbeing: 82, engagement: 90 },
    { dept: 'Marketing', tone: 'coral', headcount: 8, atRisk: 2, wellbeing: 65, engagement: 70 },
    { dept: 'Sales', tone: 'yellow', headcount: 15, atRisk: 1, wellbeing: 75, engagement: 85 }
  ];

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 900, marginBottom: 12, letterSpacing: 1 }}>
        WELLBEING RADAR (COMPANY WIDE)
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <HPCard padding={16} style={{ background: '#fff' }}>
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>Company Wellbeing</div>
          <div style={{ ...HP_TEXT.h, fontSize: 24, color: HP_TOKENS.sage }}>78/100</div>
          <div style={{ ...HP_TEXT.small, color: HP_TOKENS.sage, marginTop: 4 }}>+2% vs last week</div>
        </HPCard>
        <HPCard padding={16} style={{ background: '#fff' }}>
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>Total At Risk</div>
          <div style={{ ...HP_TEXT.h, fontSize: 24, color: HP_TOKENS.coral }}>4 Karyawan</div>
          <div style={{ ...HP_TEXT.small, color: HP_TOKENS.coral, marginTop: 4 }}>Needs attention</div>
        </HPCard>
      </div>

      <HPCard padding={16} style={{ background: '#fff' }}>
        <div style={{ ...HP_TEXT.h, fontSize: 15, marginBottom: 16 }}>Status per Departemen</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {deptPulse.map((dept: any, i: number) => (
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
      </HPCard>
    </div>
  );
}
