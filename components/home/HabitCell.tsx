"use client";

import React, { useState } from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";

interface HabitCellProps {
  h: any;
  onToggle?: () => void;
}

const DAY_LABELS = ['S', 'S', 'R', 'K', 'J', 'S', 'M'];

export default function HabitCell({ h, onToggle }: HabitCellProps) {
  const [showPoints, setShowPoints] = useState(false);
  const history: boolean[] = h.history || [false, false, false, false, false, false, h.done];
  const lastIndex = history.length - 1;
  const doneCount = history.filter(Boolean).length;
  const progress = doneCount / history.length;

  const handleToggle = () => {
    if (!h.done) {
      setShowPoints(true);
      setTimeout(() => setShowPoints(false), 1200);
    }
    onToggle?.();
  };

  return (
    <div style={{
      padding: '16px',
      borderRadius: 20,
      background: h.done ? HP_TOKENS.yellowSoft : HP_TOKENS.card,
      border: `1.5px solid ${h.done ? HP_TOKENS.yellow : HP_TOKENS.line}`,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.2s ease',
      boxShadow: h.done ? 'none' : '0 2px 8px rgba(0,0,0,0.03)',
    }}>

      {/* Floating +20 Poin */}
      {showPoints && (
        <div style={{
          position: 'absolute', top: 10, right: 14,
          background: HP_TOKENS.ink, color: HP_TOKENS.yellow,
          padding: '2px 8px', borderRadius: 8,
          fontSize: 11, fontWeight: 800, fontFamily: HP_FONT,
          animation: 'hpRise 1.2s ease-out forwards',
          pointerEvents: 'none', zIndex: 10,
        }}>
          +20
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: h.done ? HP_TOKENS.yellow : HP_TOKENS.lineSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: '0.3s',
          }}>
            <HPGlyph name={h.glyph} size={18} color={h.done ? HP_TOKENS.ink : HP_TOKENS.inkMute} />
          </div>
          <div>
            <div style={{ ...HP_TEXT.h, fontSize: 13, lineHeight: 1.3 }}>{h.name}</div>
            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700, fontSize: 11, marginTop: 1 }}>
              {h.streak} streak
            </div>
          </div>
        </div>
      </div>

      {/* 7-day grid */}
      <div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          {history.map((_: boolean, i: number) => (
            <div key={i} style={{
              flex: 1, textAlign: 'center',
              fontFamily: HP_FONT, fontWeight: 700, fontSize: 9,
              color: i === lastIndex ? HP_TOKENS.yellow : HP_TOKENS.inkFade,
            }}>
              {DAY_LABELS[i]}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {history.map((done: boolean, i: number) => {
            const isToday = i === lastIndex;
            return (
              <div
                key={i}
                onClick={isToday ? handleToggle : undefined}
                className={isToday ? "hp-tap" : ""}
                style={{
                  flex: 1,
                  aspectRatio: '1',
                  borderRadius: 6,
                  background: done
                    ? HP_TOKENS.yellow
                    : isToday
                      ? HP_TOKENS.yellowSoft
                      : HP_TOKENS.lineSoft,
                  border: isToday
                    ? `2px solid ${HP_TOKENS.yellow}`
                    : `1px solid transparent`,
                  cursor: isToday ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
              >
                {done && <HPGlyph name="check" size={isToday ? 12 : 8} color={HP_TOKENS.ink} stroke={3} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress */}
      <div>
        <div style={{ height: 4, background: HP_TOKENS.lineSoft, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            width: `${progress * 100}%`, height: '100%',
            background: HP_TOKENS.yellow,
            borderRadius: 2,
            transition: '0.8s cubic-bezier(0.2,0.8,0.2,1)',
          }}/>
        </div>
      </div>
    </div>
  );
}
