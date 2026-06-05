"use client";

import React, { useState } from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";

interface HabitCellProps {
  h: any;
  onToggle?: (date: Date, isToday: boolean, done: boolean) => void;
  onQuickComplete?: (date: Date, isToday: boolean, wasDone: boolean, newDone: boolean) => void;
  onFinish?: () => void;
}

const DAY_LABELS = ['S', 'S', 'R', 'K', 'J', 'S', 'M'];

export default function HabitCell({ h, onToggle, onQuickComplete, onFinish }: HabitCellProps) {
  const [showPoints, setShowPoints] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month, 1 = previous month, etc.

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize time
  
  const viewDate = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startDay = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Monday = 0
  
  const streak = h.streak || 0;
  
  const totalCells = 42; // 6 rows of 7 days
  const calendarCells = Array(totalCells).fill(0).map((_, i) => {
    const isCurrentMonth = i >= startDay && i < startDay + daysInMonth;
    const cellDate = new Date(viewYear, viewMonth, i - startDay + 1);
    
    // Time difference in days relative to absolute today
    const msPerDay = 1000 * 60 * 60 * 24;
    // We use UTC to avoid daylight saving time offset issues when diffing days
    const utcCellDate = Date.UTC(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate());
    const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const daysOffset = Math.round((utcCellDate - utcToday) / msPerDay);
    
    const future = daysOffset > 0;
    const isToday = daysOffset === 0;
    const daysAgo = Math.abs(daysOffset);
    
    let done = false;
    if (h.completedDates) {
      const dateStr = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;
      done = h.completedDates.includes(dateStr);
    } else {
      if (h.done) {
        done = daysAgo < streak || daysAgo === 0;
      } else {
        done = daysAgo > 0 && daysAgo <= streak;
      }
    }
    
    return {
      date: cellDate,
      isCurrentMonth,
      future,
      isToday,
      done: !future && done,
      daysAgo
    };
  });

  const monthLabel = viewDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  // Progress logic: we only care about progress within this viewed month?
  // Or just general progress over the streak?
  // Let's keep it simple: progress is just based on streak vs target, or just days completed in this view.
  const pastDaysCount = calendarCells.filter(c => c.isCurrentMonth && !c.future).length;
  const doneCount = calendarCells.filter(c => c.done).length;
  const progress = Math.min(1, doneCount / Math.max(1, pastDaysCount));

  const handleCellClick = (cell: any) => {
    if (cell.future) return;
    
    if (cell.isToday) {
      if (!h.done) {
        setShowPoints(true);
        setTimeout(() => setShowPoints(false), 1200);
      }
    }
    
    // Pass the specific date to onToggle so HomeScreen knows which day was clicked
    onToggle?.(cell.date, cell.isToday, cell.done);
  };

  return (
    <div 
      style={{
        flex: 1,
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
        boxShadow: h.done ? 'none' : '0 2px 8px rgba(26,29,35,0.03)',
      }}
    >

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
            <div style={{ ...HP_TEXT.h, fontSize: 13, lineHeight: 1.3, paddingRight: 8 }}>{h.name}</div>
            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700, fontSize: 11, marginTop: 1 }}>
              {h.streak} streak
            </div>
          </div>
        </div>
        
        {/* Action Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`Yakin ingin menamatkan training "${h.name}"? Ini akan menghapusnya dari daftar harianmu dan memberikan reward EXP.`)) {
              onFinish?.();
            }
          }}
          className="hp-tap"
          style={{
            background: HP_TOKENS.lineSoft, border: 'none', padding: '6px 10px', margin: 0,
            color: HP_TOKENS.blue, fontFamily: HP_FONT, fontWeight: 800, fontSize: 11,
            cursor: 'pointer', borderRadius: 8, flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 4
          }}
        >
          Tamat 🎓
        </button>
      </div>

      {/* Mini Calendar 5-week grid */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ ...HP_TEXT.small, fontWeight: 700, color: HP_TOKENS.inkMute, fontSize: 10 }}>
            {monthLabel}
          </div>
          
          {/* Navigation */}
          <div style={{ display: 'flex', gap: 4 }}>
            <button 
              onClick={(e) => { e.stopPropagation(); setMonthOffset(p => p + 1); }}
              className="hp-tap"
              style={{
                width: 24, height: 24, borderRadius: 6, background: HP_TOKENS.lineSoft,
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: HP_TOKENS.inkMute, fontSize: 12, fontFamily: HP_FONT, fontWeight: 800
              }}
            >
              &lt;
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setMonthOffset(p => Math.max(0, p - 1)); }}
              disabled={monthOffset === 0}
              className={monthOffset === 0 ? "" : "hp-tap"}
              style={{
                width: 24, height: 24, borderRadius: 6, background: HP_TOKENS.lineSoft,
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: monthOffset === 0 ? 'default' : 'pointer', color: HP_TOKENS.inkMute, 
                fontSize: 12, fontFamily: HP_FONT, fontWeight: 800, opacity: monthOffset === 0 ? 0.3 : 1
              }}
            >
              &gt;
            </button>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
          {DAY_LABELS.map((lbl, i) => (
            <div key={`lbl-${i}`} style={{
              textAlign: 'center',
              fontFamily: HP_FONT, fontWeight: 700, fontSize: 9,
              color: HP_TOKENS.inkFade,
            }}>
              {lbl}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {calendarCells.map((cell, i) => {
            const isClickable = !cell.future && cell.isCurrentMonth && cell.daysAgo <= 2;
            return (
              <div
                key={i}
                onClick={() => {
                  if (isClickable) handleCellClick(cell);
                }}
                className={isClickable ? "hp-tap" : ""}
                style={{
                  aspectRatio: '1',
                  borderRadius: 6,
                  position: 'relative',
                  background: cell.future || !cell.isCurrentMonth
                    ? 'transparent' 
                    : cell.done 
                      ? HP_TOKENS.yellow 
                      : cell.isToday 
                        ? HP_TOKENS.yellowSoft 
                        : HP_TOKENS.lineSoft,
                  border: cell.isToday && cell.isCurrentMonth
                    ? `2px solid ${HP_TOKENS.yellow}`
                    : `1px solid transparent`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  opacity: cell.isCurrentMonth ? (cell.future ? 0.3 : 1) : 0, 
                  cursor: isClickable ? 'pointer' : 'default',
                  // Optional: Make non-clickable past days visually slightly different if desired, 
                  // but standard calendar look is fine
                }}
              >
                <span style={{ 
                  fontFamily: HP_FONT, fontSize: 10, fontWeight: 700, 
                  color: cell.future ? HP_TOKENS.inkFade : (cell.done ? HP_TOKENS.ink : HP_TOKENS.inkMute)
                }}>
                  {cell.date.getDate()}
                </span>
                {cell.done && cell.isCurrentMonth && (
                  <div style={{ position: 'absolute', bottom: -2, right: -2, background: HP_TOKENS.yellow, borderRadius: 10, padding: 1 }}>
                    <HPGlyph name="check" size={8} color={HP_TOKENS.ink} stroke={3} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress */}
      <div style={{ marginTop: 'auto' }}>
        <div style={{ height: 4, background: HP_TOKENS.lineSoft, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            width: `${progress * 100}%`, height: '100%',
            background: HP_TOKENS.yellow,
            borderRadius: 2,
            transition: '0.8s cubic-bezier(0.2,0.8,0.2,1)',
          }}/>
        </div>
      </div>

      {/* Quick Action Button for Today */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          const todayCell = calendarCells.find(c => c.isToday);
          if (todayCell) {
            if (todayCell.done) {
              if (window.confirm("Yakin ingin membatalkan penyelesaian hari ini?")) {
                onQuickComplete?.(todayCell.date, true, true, false);
              }
            } else {
              onQuickComplete?.(todayCell.date, true, false, true);
              setShowPoints(true);
              setTimeout(() => setShowPoints(false), 1200);
            }
          }
        }}
        className="hp-tap"
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: 12,
          border: 'none',
          background: h.done ? 'transparent' : HP_TOKENS.yellow,
          borderStyle: h.done ? 'solid' : 'none',
          borderWidth: 1.5,
          borderColor: h.done ? HP_TOKENS.line : 'transparent',
          color: h.done ? HP_TOKENS.inkMute : HP_TOKENS.ink,
          fontFamily: HP_FONT,
          fontWeight: 800,
          fontSize: 13,
          cursor: 'pointer',
          marginTop: 4,
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6
        }}
      >
        {h.done ? (
          <>
            <HPGlyph name="check" size={14} color={HP_TOKENS.inkMute} stroke={3} />
            Selesai Hari Ini
          </>
        ) : (
          "Tandai Selesai"
        )}
      </button>
    </div>
  );
}
