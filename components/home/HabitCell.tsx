"use client";

import React, { useState } from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import { trainingGraduationPoints, TRAINING_GRADUATION_MIN_DAYS } from "@/lib/pointsConfig";
import HPGlyph from "@/components/ui/HPGlyph";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface HabitCellProps {
  h: any;
  onToggle?: (date: Date, isToday: boolean, done: boolean) => void;
  onQuickComplete?: (date: Date, isToday: boolean, wasDone: boolean, newDone: boolean) => void;
  /** Menunggu server; resolve `true` kalau training-nya benar-benar tamat. */
  onFinish?: () => void | Promise<boolean | void>;
  /**
   * Poin yang server bayar untuk centang terakhir pada latihan INI. Undefined
   * kalau yang terakhir dicentang latihan lain; 0 kalau tidak dibayar.
   *
   * Dulu pil poinnya berbunyi "+15" dan dinyalakan di `handleCellClick` — yaitu
   * saat dialognya BARU DIBUKA, sebelum penggunanya menekan apa pun dan jauh
   * sebelum server menjawab. Kuota latihan cuma 2/hari, jadi angka itu sering
   * kali memang tidak pernah masuk.
   */
  awardedPoints?: number;
}

const DAY_LABELS = ['S', 'S', 'R', 'K', 'J', 'S', 'M'];

function HabitCell({ h, onToggle, onQuickComplete, onFinish, awardedPoints }: HabitCellProps) {
  const [showPoints, setShowPoints] = useState(false);

  // Pil poin menyusul jawaban server, bukan mendahuluinya.
  React.useEffect(() => {
    if (!awardedPoints || awardedPoints <= 0) return;
    setShowPoints(true);
    const t = setTimeout(() => setShowPoints(false), 1200);
    return () => clearTimeout(t);
  }, [awardedPoints]);
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month, 1 = previous month, etc.
  const [confirming, setConfirming] = useState<null | "graduate" | "undo">(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize time
  
  const viewDate = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startDay = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Monday = 0
  
  const streak = h.streak || 0;

  // Kapan sebuah training tamat adalah keputusan yang menjalaninya, jadi tidak
  // ada gerbang durasi di sini — yang mengikuti hari-hari tercatat adalah
  // BAYARANNYA. Rumusnya dibagi dengan server (lib/pointsConfig), jadi angka di
  // dialog konfirmasi sama dengan yang nanti benar-benar dibayar.
  const completedDays = React.useMemo(() => {
    // `completedDates` adalah sumber kebenarannya; `streak` cuma jaring
    // pengaman untuk habit lama yang dibuat sebelum kolom itu ada.
    if (Array.isArray(h.completedDates)) return new Set(h.completedDates).size;
    return streak;
  }, [h.completedDates, streak]);
  const canGraduate = completedDays >= TRAINING_GRADUATION_MIN_DAYS;
  const graduationPoints = trainingGraduationPoints(completedDays);


  const habitCreatedAt = h.created_at ? new Date(h.created_at) : new Date('2020-01-01');
  habitCreatedAt.setHours(0, 0, 0, 0);

  const totalCells = 42; // 6 rows of 7 days
  const calendarCells = React.useMemo(() => {
    return Array(totalCells).fill(0).map((_, i) => {
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
  }, [viewYear, viewMonth, startDay, daysInMonth, h.completedDates, h.done, h.streak, today.getTime()]);

  const monthLabel = viewDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  const progress = React.useMemo(() => {
    const pastDaysCount = calendarCells.filter(c => c.isCurrentMonth && !c.future).length;
    const doneCount = calendarCells.filter(c => c.done).length;
    return Math.min(1, doneCount / Math.max(1, pastDaysCount));
  }, [calendarCells]);

  const handleCellClick = (cell: any) => {
    if (cell.future) return;

    // Pass the specific date to onToggle so HomeScreen knows which day was clicked
    onToggle?.(cell.date, cell.isToday, cell.done);
  };

  return (
    <div 
      style={{
        flex: 1,
        padding: '16px',
        borderRadius: HP_TOKENS.radius,
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

      {/* Pil poin mengambang — angkanya dari server */}
      {showPoints && (
        <div style={{
          position: 'absolute', top: 10, right: 14,
          background: HP_TOKENS.ink, color: HP_TOKENS.yellowInk,
          padding: '2px 8px', borderRadius: 8,
          fontSize: 11, fontWeight: 700, fontFamily: HP_FONT,
          animation: 'hpRise 1.2s ease-out forwards',
          pointerEvents: 'none', zIndex: 10,
        }}>
          +{awardedPoints}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: HP_TOKENS.radiusSm,
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
        
        {/* Bebas ditekan kapan saja — satu-satunya yang mematikannya adalah
            training yang belum pernah dicentang sekali pun, karena di situ
            belum ada hasil apa pun untuk ditamatkan. */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setConfirming("graduate");
          }}
          disabled={!canGraduate}
          className={canGraduate ? "hp-tap" : ""}
          aria-label={
            canGraduate
              ? `Tamatkan training ${h.name}, ${completedDays} hari dijalani`
              : `Tamatkan training ${h.name} — belum dijalani sehari pun`
          }
          title={canGraduate ? undefined : 'Jalani minimal satu hari dulu'}
          style={{
            background: HP_TOKENS.lineSoft, border: 'none', padding: '6px 10px', margin: 0,
            color: canGraduate ? HP_TOKENS.blue : HP_TOKENS.inkFade,
            fontFamily: HP_FONT, fontWeight: 700, fontSize: 11,
            cursor: canGraduate ? 'pointer' : 'not-allowed', borderRadius: 8, flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <HPGlyph name="medal" size={12} color="currentColor" />
          Tamat
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
                cursor: 'pointer', color: HP_TOKENS.inkMute, fontSize: 12, fontFamily: HP_FONT, fontWeight: 700
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
                fontSize: 12, fontFamily: HP_FONT, fontWeight: 700, opacity: monthOffset === 0 ? 0.3 : 1
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
            const cellTime = cell.date.getTime();
            const createdTime = habitCreatedAt.getTime();
            const isClickable = !cell.future && cell.isCurrentMonth && cell.daysAgo <= 2 && cellTime >= createdTime;
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
                  <div style={{ position: 'absolute', bottom: -2, right: -2, background: HP_TOKENS.yellow, borderRadius: HP_TOKENS.radiusSm, padding: 1 }}>
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
              setConfirming("undo");
            } else {
              // Instead of instant complete, we open the modal like when clicking a cell
              onToggle?.(todayCell.date, true, false);
            }
          }
        }}
        className="hp-tap"
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: HP_TOKENS.radiusSm,
          border: 'none',
          background: h.done ? 'transparent' : HP_TOKENS.yellow,
          borderStyle: h.done ? 'solid' : 'none',
          borderWidth: 1.5,
          borderColor: h.done ? HP_TOKENS.line : 'transparent',
          color: h.done ? HP_TOKENS.inkMute : HP_TOKENS.ink,
          fontFamily: HP_FONT,
          fontWeight: 700,
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

      {confirming === "graduate" && (
        <ConfirmDialog
          title={`Tamatkan "${h.name}"?`}
          // Angka harinya dan poinnya disebut bersama supaya hubungannya
          // terbaca: hadiahnya lahir dari hari yang dijalani, bukan dari
          // menekan tombolnya.
          description={`${completedDays} hari dijalani — kelulusannya bernilai +${graduationPoints} poin. Training ini lalu dihapus dari daftar harianmu, dan itu permanen.`}
          confirmLabel="Ya, tamatkan"
          confirmIcon="medal"
          tone="danger"
          onCancel={() => setConfirming(null)}
          // Dialognya baru menutup setelah server menjawab. Kalau ditolak
          // (mis. targetnya ternyata belum tercapai), ia tetap terbuka dan
          // toast-nya menjelaskan kenapa.
          onConfirm={async () => {
            const done = await onFinish?.();
            if (done !== false) setConfirming(null);
          }}
        />
      )}

      {confirming === "undo" && (
        <ConfirmDialog
          title="Batalkan penyelesaian hari ini?"
          description="Centang hari ini dilepas dan streak-mu turun satu. Poin yang sudah diberikan tidak kembali."
          confirmLabel="Ya, batalkan"
          tone="danger"
          onCancel={() => setConfirming(null)}
          onConfirm={() => {
            const todayCell = calendarCells.find(c => c.isToday);
            if (todayCell) onQuickComplete?.(todayCell.date, true, true, false);
            setConfirming(null);
          }}
        />
      )}
    </div>
  );
}

export default React.memo(HabitCell);
