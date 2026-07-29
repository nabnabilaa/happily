"use client";

import React, { useMemo, useState } from 'react';
import HPCard from '@/components/ui/HPCard';
import HPGlyph from '@/components/ui/HPGlyph';
import { HP_TOKENS, HP_FONT, HP_TEXT, HP_MOODS } from '@/lib/constants';
import { calculateWellbeingScore } from '@/lib/wellbeingEngine';
import { useMoodCheckIn } from '@/hooks/useMoodCheckIn';
import { scrollIntoViewSafely } from "@/lib/motion";

interface Props {
  state: any;
  user: any;
  openModal: (name: string, props?: any) => void;
}

/** Mood tone → semantic palette. Mirrors EmotionalHero so one mood reads the
 *  same colour wherever it appears. */
const MOOD_TONE: Record<string, { fg: string; bg: string }> = {
  yellow: { fg: HP_TOKENS.yellowDark, bg: HP_TOKENS.yellowSoft },
  sage: { fg: HP_TOKENS.success, bg: HP_TOKENS.successSoft },
  neutral: { fg: HP_TOKENS.inkSoft, bg: HP_TOKENS.sunken },
  blue: { fg: HP_TOKENS.primary, bg: HP_TOKENS.primarySoft },
  coral: { fg: HP_TOKENS.danger, bg: HP_TOKENS.dangerSoft },
};

/**
 * Has this user recorded a mood today?
 *
 * Answered from `lastMoodCheckIn` alone — the timestamp of the newest
 * `mood_checkins` row — and never from `mood`, which carries the last recorded
 * feeling with no indication of when it was recorded. A missing timestamp means
 * no check-in on file, so ask.
 */
function hasCheckedInToday(state: any): boolean {
  if (!state?.lastMoodCheckIn) return false;
  const last = new Date(state.lastMoodCheckIn);
  if (Number.isNaN(last.getTime())) return false;
  return last.toDateString() === new Date().toDateString();
}

export default function WellbeingGauge({ state, user, openModal }: Props) {
  const { score, status, message, actions } = useMemo(() => calculateWellbeingScore(state, user), [state, user]);
  const [expanded, setExpanded] = useState(false);
  const { saveMood, isSubmitting } = useMoodCheckIn();

  const checkedInToday = hasCheckedInToday(state);

  // `color` tints the ring, the wash and the hairlines — all surfaces, all
  // fine at 3:1. `ink` is for the glyphs: the warning state resolves to
  // yellow, which is 2.1:1 on its own wash and fails even the icon bar.
  const color = status === 'healthy' ? HP_TOKENS.sage : status === 'warning' ? HP_TOKENS.yellow : HP_TOKENS.coral;
  const ink = status === 'healthy' ? HP_TOKENS.sageInk : status === 'warning' ? HP_TOKENS.yellowInk : HP_TOKENS.coralInk;
  const washColor = status === 'healthy' ? HP_TOKENS.sageWash : status === 'warning' ? HP_TOKENS.yellowWash : HP_TOKENS.coralSoft;
  // Glyph, not emoji: an emoji renders in the platform font at a weight and hue
  // we don't control, which is what made this card read as a mock-up.
  const statusGlyph = status === 'healthy' ? 'leaf' : status === 'warning' ? 'alertCircle' : 'pause';

  const hasActions = actions.length > 0;

  const handleActionClick = (action: any, e: React.MouseEvent) => {
    e.stopPropagation();

    // Special: scroll-to-task action
    if (action.actionType === 'scroll_to_tasks') {
      setExpanded(false);
      setTimeout(() => {
        const el = document.getElementById('task-harian-section');
        scrollIntoViewSafely(el, { behavior: 'smooth', block: 'start' });
      }, 150);
      return;
    }

    if (action.modalTarget) {
      openModal(action.modalTarget, action.modalProps);
    }
  };

  return (
    // No margin here. The card sits in a `Stack` that already owns the vertical
    // rhythm; a local `marginBottom: 20` stacked on top of the 16px gap and made
    // this one card float 36px away from whatever followed it.
    <HPCard padding={0} style={{
      background: washColor,
      border: `1.5px solid ${color}40`,
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
            fontFamily: HP_FONT, fontWeight: 700, fontSize: 16, color: HP_TOKENS.ink
          }}>
            {Math.round(score)}
          </div>
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            {/* Heading and score read as ink, not as the status colour. On its
                own wash, sage clears 3.8:1, coral 4.4:1 and — worst — yellow
                only 3.2:1, all under the 4.5:1 floor for 16px text. The status
                still reads loud: it owns the ring arc, the card wash and this
                glyph, none of which is text and all of which only need 3:1. */}
            <HPGlyph name={statusGlyph} size={16} color={ink} />
            <span style={{ ...HP_TEXT.h, fontSize: 16 }}>Wellbeing Score</span>
          </div>
          <div style={{ ...HP_TEXT.small, color: HP_TOKENS.ink, lineHeight: 1.4 }}>
            {/* Until there's a check-in, say so instead of asserting a verdict.
                The score is computed from streak, tasks and activity alone at
                that point — calling it "prima" reads as a judgement about a
                feeling the user never told us. */}
            {checkedInToday ? message : 'Belum ada check-in hari ini — skor ini belum menghitung perasaanmu.'}
          </div>
        </div>

        {/* Expand arrow */}
        {hasActions && (
          <div style={{ 
            flexShrink: 0, 
            transition: 'transform 0.3s ease',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}>
            <HPGlyph name="chevron-down" size={18} color={ink} />
          </div>
        )}
      </div>

      {/* Inline mood check-in.
          This used to live ~230 lines further down the page in EmotionalHero,
          which meant the card that asks about your wellbeing had no way to
          record it. Worse, the engine only offered a "Update Mood" action once
          moodPenalty > 0 — and that needs a mood already on file, so a user who
          had never checked in was never asked to. One tap, right here. */}
      {!checkedInToday && (
        <div style={{
          padding: '0 16px 16px',
          borderTop: `1px solid ${color}25`,
        }}>
          <div style={{
            ...HP_TEXT.tiny,
            letterSpacing: 0.5,
            marginTop: 14,
            marginBottom: 10,
            textTransform: 'uppercase' as const,
          }}>
            Gimana perasaanmu hari ini?
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {HP_MOODS.map((m) => {
              const tone = MOOD_TONE[m.tone] ?? MOOD_TONE.neutral;
              return (
                <button
                  key={m.key}
                  onClick={(e) => {
                    e.stopPropagation();
                    saveMood({ mood: m.key, quick: true });
                  }}
                  disabled={isSubmitting}
                  className="hp-tap"
                  aria-label={`Catat perasaan: ${m.label}`}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 5,
                    padding: '10px 2px',
                    borderRadius: HP_TOKENS.radiusMd,
                    background: HP_TOKENS.card,
                    border: `1.5px solid ${HP_TOKENS.line}`,
                    cursor: isSubmitting ? 'default' : 'pointer',
                    opacity: isSubmitting ? 0.5 : 1,
                    fontFamily: HP_FONT,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: HP_TOKENS.radiusSm,
                    background: tone.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <HPGlyph name={m.glyph} size={15} color={tone.fg} />
                  </div>
                  <span style={{
                    ...HP_TEXT.tiny,
                    color: HP_TOKENS.inkSoft,
                    textAlign: 'center' as const,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap' as const,
                    maxWidth: '100%',
                  }}>
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); openModal('checkin'); }}
            className="hp-tap"
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              marginTop: 10, marginLeft: 'auto',
              padding: 0, background: 'none', border: 'none',
              cursor: 'pointer',
              ...HP_TEXT.small, fontSize: 12, color: HP_TOKENS.primaryInk,
            }}
          >
            Isi lengkap (energi & catatan)
            <HPGlyph name="chevronRight" size={13} color="currentColor" />
          </button>
        </div>
      )}

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
                  borderRadius: HP_TOKENS.radiusMd,
                  background: HP_TOKENS.card,
                  border: `1.5px solid ${HP_TOKENS.line}`,
                  cursor: 'pointer',
                  textAlign: 'left' as const,
                  fontFamily: HP_FONT,
                  transition: 'all 0.2s ease',
                  width: '100%',
                }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: HP_TOKENS.radiusSm,
                  background: `${color}12`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <HPGlyph name={action.icon} size={17} color={ink} />
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
                  <HPGlyph name="chevronRight" size={14} color={HP_TOKENS.ink} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </HPCard>
  );
}
