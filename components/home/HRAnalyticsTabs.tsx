"use client";

import React, { useState } from 'react';
import HRWellbeingDashboard from './HRWellbeingDashboard';
import BurnoutAlertCard from './BurnoutAlertCard';
import { Stack, TabBar, SwitchView } from '@/components/ui';

export default function HRAnalyticsTabs({ state, openModal }: { state: any, openModal?: any }) {
  const [activeTab, setActiveTab] = useState<'radar' | 'burnout'>('radar');
  const burnoutCount = state?.hrData?.atRiskEmployees?.length || 0;

  return (
    <Stack gap={4} style={{ marginTop: 16 }}>
      <TabBar
        label="Analitik wellbeing"
        value={activeTab}
        onChange={(v) => setActiveTab(v as 'radar' | 'burnout')}
        options={[
          { key: 'radar', label: 'Radar tim' },
          { key: 'burnout', label: 'Burnout alerts', count: burnoutCount || undefined },
        ]}
      />

      <SwitchView viewKey={activeTab}>
        {activeTab === 'radar' ? (
          <HRWellbeingDashboard
            state={state}
            openModal={openModal}
            onGoToBurnout={() => setActiveTab('burnout')}
          />
        ) : (
          <BurnoutAlertCard openModal={openModal} />
        )}
      </SwitchView>
    </Stack>
  );
}
