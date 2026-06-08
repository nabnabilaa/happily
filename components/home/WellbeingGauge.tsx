"use client";

import React, { useMemo, useState } from 'react';
import HPCard from '@/components/ui/HPCard';
import HPGlyph from '@/components/ui/HPGlyph';
import { HP_TOKENS, HP_FONT, HP_TEXT } from '@/lib/constants';
import { calculateWellbeingScore } from '@/lib/wellbeingEngine';

interface Props {
  state: any;
  user: any;
  openModal: (name: string, props?: any) => void;
}

export default function WellbeingGauge({ state, user, openModal }: Props) {
  const { score, status, message, actions } = useMemo(() => calculateWellbeingScore(state, user), [state, user]);
  const [expanded, setExpanded] = useState(false);

  const color = status === 'healthy' ? HP_TOKENS.sage : status === 'warning' ? HP_TOKENS.yellow : HP_TOKENS.coral;
  const washColor = status === 'healthy' ? HP_TOKENS.sageWash : status === 'warning' ? HP_TOKENS.yellowWash : HP_TOKENS.coralSoft;
  const emoji = status === 'healthy' ? '🌿' : status === 'warning' ? '⚠️' : '🛑';

  const hasActions = actions.length > 0;

  const handleActionClick = (action: any, e: React.MouseEvent) => {
    e.stopPropagation();

    // Special: scroll-to-task action
    if (action.actionType === 'scroll_to_tasks') {
      setExpanded(false);
      setTimeout(() => {
        const el = document.getElementById('task-harian-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
      return;
    }

    if (action.modalTarget) {
      openModal(action.modalTarget, action.modalProps);
    }
  };

  return (
    <HPCard padding={0} style={{ 
      background: washColor, 
      border: `1.5px solid ${color}40`, 
      marginBottom: 20,
      overflow: 'hidden',
      transition: 'all 0.3s ease',
    }}>
      {/* Main card - clickable */}
      <div 
        onClick={() => hasActions && setExpanded(!expanded)}
        className={hasActions ? 'hp-tap' : ''}
        style={{ 
          display: 'flex', alignItems: 'center', gap: 16, 
          padding: 20,
          cursor: hasActions ? 'pointer' : 'default',
          position: 'relative',
        }}
      >
        {/* Simple visual gauge */}
        <div style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
          <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke={`${color}30`}
              strokeWidth="4"
            />
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
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 18 }}>{emoji}</span>
            <span style={{ ...HP_TEXT.h, fontSize: 16, color }}>Wellbeing Score</span>
          </div>
          <div style={{ ...HP_TEXT.small, color: HP_TOKENS.ink, lineHeight: 1.4 }}>
            {message}
          </div>
        </div>

        {/* Expand arrow */}
        {hasActions && (
          <div style={{ 
            flexShrink: 0, 
            transition: 'transform 0.3s ease',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}>
            <HPGlyph name="chevron-down" size={18} color={color} />
          </div>
        )}
      </div>

      {/* Expandable actions panel */}
      <div style={{
        maxHeight: expanded ? 999 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }}>
        <div style={{ 
          padding: '0 16px 16px',
          borderTop: `1px solid ${color}25`,
        }}>
          <div style={{ 
            ...HP_TEXT.tiny, 
            color, 
            fontWeight: 800, 
            letterSpacing: 0.5,
            marginTop: 14,
            marginBottom: 10,
            textTransform: 'uppercase' as const,
          }}>
            Yang bisa kamu lakukan sekarang
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={(e) => handleActionClick(action, e)}
                className="hp-tap"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px',
                  borderRadius: 14,
                  background: HP_TOKENS.card,
                  border: `1.5px solid ${HP_TOKENS.line}`,
                  cursor: 'pointer',
                  textAlign: 'left' as const,
                  fontFamily: HP_FONT,
                  boxShadow: '0 2px 8px rgba(26,29,35,0.03)',
                  transition: 'all 0.2s ease',
                  width: '100%',
                }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: `${color}12`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>
                  {action.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...HP_TEXT.h, fontSize: 13, color: HP_TOKENS.ink }}>
                    {action.label}
                  </div>
                  <div style={{ ...HP_TEXT.small, fontSize: 11, color: HP_TOKENS.inkMute, marginTop: 1, lineHeight: 1.3 }}>
                    {action.description}
                  </div>
                </div>
                <div style={{ flexShrink: 0, opacity: 0.3 }}>
                  <HPGlyph name="chevron-right" size={14} color={HP_TOKENS.ink} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </HPCard>
  );
}
