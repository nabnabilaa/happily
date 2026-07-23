"use client";

import React from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";

// Shared inline-SVG chart primitives for the report dashboard & employee profile.
export const toneFor = (v: number) => (v >= 80 ? HP_TOKENS.sage : v >= 50 ? HP_TOKENS.yellow : HP_TOKENS.coral);

export function Donut({ value, color, size = 84, thickness = 3.5, children, title, onClick }: { value: number; color: string; size?: number; thickness?: number; children?: React.ReactNode; title?: string; onClick?: () => void }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div title={title} onClick={onClick} className={onClick ? 'hp-tap' : ''} style={{ position: 'relative', width: size, height: size, flexShrink: 0, cursor: onClick ? 'pointer' : 'default' }}>
      <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
        <path d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={`${color}22`} strokeWidth={thickness} />
        <path d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={color} strokeWidth={thickness} strokeLinecap="round" strokeDasharray={`${v}, 100`} style={{ transition: 'stroke-dasharray 0.8s ease-out' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
    </div>
  );
}

export function DonutTile({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{ flex: 1, minWidth: 96, textAlign: 'center', background: HP_TOKENS.lineSoft, borderRadius: 14, padding: '14px 8px' }}>
      <Donut value={value} color={color}>
        <span style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 20, color }}>{Math.round(value)}<span style={{ fontSize: 11 }}>%</span></span>
      </Donut>
      <div style={{ marginTop: 6, fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, color: HP_TOKENS.inkMute }}>{label}</div>
    </div>
  );
}

export function WeeklyBars({ weekly, height = 150, onBarClick }: { weekly: { week: number; avgAchievement: number }[]; height?: number; onBarClick?: (w: { week: number; avgAchievement: number }) => void }) {
  if (!weekly?.length) return <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, textAlign: 'center', padding: 16 }}>Belum ada data target mingguan.</div>;
  // Kolom lebar tetap + rata kiri → jarak konsisten walau minggu sedikit (tak melebar aneh).
  const spread = weekly.length >= 5;
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', height, paddingTop: 10, justifyContent: spread ? 'space-between' : 'flex-start' }}>
      {weekly.map(w => (
        <div key={w.week} title={`Minggu ${w.week}: ${w.avgAchievement}%`}
          onClick={onBarClick ? () => onBarClick(w) : undefined}
          className={onBarClick ? 'hp-tap' : ''}
          style={{ width: spread ? undefined : 52, flex: spread ? 1 : undefined, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', cursor: onBarClick ? 'pointer' : 'default' }}>
          <div style={{ fontFamily: HP_FONT, fontWeight: 800, fontSize: 11, marginBottom: 4, color: HP_TOKENS.ink }}>{w.avgAchievement}%</div>
          <div style={{ flex: 1, width: '100%', maxWidth: 40, background: HP_TOKENS.line, borderRadius: '8px 8px 4px 4px', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
            <div style={{ width: '100%', height: `${Math.max(4, Math.min(100, w.avgAchievement))}%`, background: toneFor(w.avgAchievement), borderRadius: '8px 8px 0 0', transition: 'height 0.6s ease-out' }} />
          </div>
          <div style={{ marginTop: 6, fontFamily: HP_FONT, fontWeight: 700, fontSize: 11, color: HP_TOKENS.inkMute }}>M{w.week}</div>
        </div>
      ))}
    </div>
  );
}

// Per-target: satu baris per target (nama + timeframe + kontribusi %). Menggantikan model rigid mingguan.
export interface TargetRow { title: string; timeframe?: string; achievement: number; kpiTitle?: string; unit?: string; target?: number; current?: number; status?: string; }
export function TargetBars({ targets, max, onTargetClick, showKpi }: { targets: TargetRow[]; max?: number; onTargetClick?: (t: TargetRow) => void; showKpi?: boolean }) {
  if (!targets?.length) return <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, textAlign: 'center', padding: 12 }}>Belum ada target.</div>;
  const rows = max ? targets.slice(0, max) : targets;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((t, i) => {
        const v = Math.max(0, Math.min(100, t.achievement));
        const sub = [showKpi ? t.kpiTitle : null, t.timeframe].filter(Boolean).join(' · ');
        return (
          <div key={i} title={`${t.title}${t.timeframe ? ` (${t.timeframe})` : ''}: ${t.achievement}%`}
            onClick={onTargetClick ? () => onTargetClick(t) : undefined}
            className={onTargetClick ? 'hp-tap' : ''}
            style={{ cursor: onTargetClick ? 'pointer' : 'default' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
              <span style={{ fontFamily: HP_FONT, fontWeight: 700, fontSize: 11.5, color: HP_TOKENS.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{t.title || 'Target'}</span>
              <span style={{ fontFamily: HP_FONT, fontWeight: 800, fontSize: 11.5, color: toneFor(v), flexShrink: 0 }}>{t.achievement}%</span>
            </div>
            <div style={{ height: 8, background: HP_TOKENS.line, borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max(3, v)}%`, background: toneFor(v), borderRadius: 5, transition: 'width 0.6s ease-out' }} />
            </div>
            {sub && <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontSize: 9.5, marginTop: 2 }}>{sub}</div>}
          </div>
        );
      })}
    </div>
  );
}

// Team-level: capaian rata-rata per KPI (bukan tren minggu) — pengganti WeeklyBars di ringkasan tim.
export function KpiBreakdownBars({ items, onKpiClick }: { items: { title: string; avgAchievement: number; count: number }[]; onKpiClick?: (k: { title: string; avgAchievement: number; count: number }) => void }) {
  if (!items?.length) return <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, textAlign: 'center', padding: 12 }}>Belum ada KPI.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((k, i) => (
        <div key={i} title={`${k.title}: ${k.avgAchievement}% (${k.count} KPI)`}
          onClick={onKpiClick ? () => onKpiClick(k) : undefined}
          className={onKpiClick ? 'hp-tap' : ''}
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: onKpiClick ? 'pointer' : 'default' }}>
          <div style={{ width: 130, fontFamily: HP_FONT, fontWeight: 700, fontSize: 11.5, color: HP_TOKENS.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.title}</div>
          <div style={{ flex: 1 }}><Meter value={k.avgAchievement} color={toneFor(k.avgAchievement)} width={120} /></div>
        </div>
      ))}
    </div>
  );
}

export function Meter({ value, color, width = 70 }: { value: number; color: string; width?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ display: 'inline-block', width, height: 7, background: HP_TOKENS.line, borderRadius: 4, overflow: 'hidden' }}>
        <span style={{ display: 'block', height: '100%', width: `${Math.min(100, value)}%`, background: color, borderRadius: 4 }} />
      </span>
      <span style={{ fontFamily: HP_FONT, fontWeight: 700, fontSize: 11, color: HP_TOKENS.ink }}>{value}%</span>
    </span>
  );
}

export function HealthBar({ health }: { health: { onTrack: number; atRisk: number; behind: number; total: number } }) {
  if (!health?.total) return null;
  const pct = (n: number) => (n / health.total) * 100;
  const seg = [
    { n: health.onTrack, c: HP_TOKENS.sage, l: 'On-track' },
    { n: health.atRisk, c: HP_TOKENS.yellow, l: 'Berisiko' },
    { n: health.behind, c: HP_TOKENS.coral, l: 'Tertinggal' },
  ];
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', height: 16, borderRadius: 8, overflow: 'hidden', background: HP_TOKENS.line }}>
        {seg.map((s, i) => <div key={i} style={{ width: `${pct(s.n)}%`, background: s.c, transition: 'width 0.6s' }} />)}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
        {seg.map((s, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: HP_FONT, fontWeight: 600, fontSize: 12, color: HP_TOKENS.inkMute }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.c }} />{s.l} {s.n}
          </span>
        ))}
      </div>
    </div>
  );
}
