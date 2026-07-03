"use client";

import React, { useState } from 'react';
import HRWellbeingDashboard from './HRWellbeingDashboard';
import BurnoutAlertCard from './BurnoutAlertCard';
import { HP_TOKENS, HP_FONT } from '@/lib/constants';

export default function HRAnalyticsTabs({ state, openModal }: { state: any, openModal?: any }) {
  const [activeTab, setActiveTab] = useState<'radar' | 'burnout'>('radar');
  const burnoutCount = state?.hrData?.atRiskEmployees?.length || 0;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: -8, padding: '0 4px', position: 'relative', zIndex: 2 }}>
        <button
          onClick={() => setActiveTab('radar')}
          className="hp-tap"
          style={{
            flex: 1, padding: '10px 0', borderRadius: '16px 16px 0 0', border: 'none', cursor: 'pointer',
            background: activeTab === 'radar' ? HP_TOKENS.blue : HP_TOKENS.lineSoft,
            color: activeTab === 'radar' ? '#fff' : HP_TOKENS.inkMute,
            fontFamily: HP_FONT, fontWeight: 900, fontSize: 13, transition: 'all 0.2s'
          }}
        >
          Radar (All)
        </button>
        <button
          onClick={() => setActiveTab('burnout')}
          className="hp-tap"
          style={{
            flex: 1, padding: '10px 0', borderRadius: '16px 16px 0 0', border: 'none', cursor: 'pointer',
            background: activeTab === 'burnout' ? HP_TOKENS.coral : HP_TOKENS.lineSoft,
            color: activeTab === 'burnout' ? '#fff' : HP_TOKENS.inkMute,
            fontFamily: HP_FONT, fontWeight: 900, fontSize: 13, transition: 'all 0.2s'
          }}
        >
          Burnout Alerts {burnoutCount > 0 && <span style={{ background: '#fff', color: HP_TOKENS.coral, padding: '2px 6px', borderRadius: 10, fontSize: 10, marginLeft: 6 }}>{burnoutCount}</span>}
        </button>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {activeTab === 'radar' && (
          <div style={{ marginTop: -8 }}>
             <HRWellbeingDashboard state={state} openModal={openModal} onGoToBurnout={() => setActiveTab('burnout')} />
          </div>
        )}
        {activeTab === 'burnout' && (
          <div style={{ marginTop: -24 }}>
             <BurnoutAlertCard openModal={openModal} />
          </div>
        )}
      </div>
    </div>
  );
}
