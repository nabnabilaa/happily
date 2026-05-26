"use client";

import React, { useMemo } from 'react';
import HPCard from '@/components/ui/HPCard';
import { HP_TOKENS, HP_FONT, HP_TEXT } from '@/lib/constants';
import { calculateWellbeingScore } from '@/lib/wellbeingEngine';

interface Props {
  state: any;
  user: any;
}

export default function WellbeingGauge({ state, user }: Props) {
  const { score, status, message } = useMemo(() => calculateWellbeingScore(state, user), [state, user]);

  const color = status === 'healthy' ? HP_TOKENS.sage : status === 'warning' ? HP_TOKENS.yellow : HP_TOKENS.coral;
  const washColor = status === 'healthy' ? HP_TOKENS.sageWash : status === 'warning' ? HP_TOKENS.yellowWash : HP_TOKENS.coralSoft;
  const emoji = status === 'healthy' ? '🌿' : status === 'warning' ? '⚠️' : '🛑';

  return (
    <HPCard padding={20} style={{ 
      background: washColor, 
      border: `1.5px solid ${color}40`, 
      marginBottom: 20 
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Simple visual gauge */}
        <div style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
          <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
            {/* Background circle */}
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke={`${color}30`}
              strokeWidth="4"
            />
            {/* Foreground circle */}
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke={color}
              strokeWidth="4"
              strokeDasharray={`${score}, 100`}
              style={{ transition: 'stroke-dasharray 1s ease-out' }}
            />
          </svg>
          <div style={{ 
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: HP_FONT, fontWeight: 900, fontSize: 16, color: color 
          }}>
            {Math.round(score)}
          </div>
        </div>

        {/* Text */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 18 }}>{emoji}</span>
            <span style={{ ...HP_TEXT.h, fontSize: 16, color }}>Wellbeing Score</span>
          </div>
          <div style={{ ...HP_TEXT.small, color: HP_TOKENS.ink, lineHeight: 1.4 }}>
            {message}
          </div>
        </div>
      </div>
    </HPCard>
  );
}
