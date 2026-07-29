"use client";

import React from "react";
import HPChip from "@/components/ui/HPChip";
import { HP_TOKENS, HP_TEXT } from "@/lib/constants";
import { describeAttendanceLocation } from "@/lib/attendanceLocation";

interface Props {
  /** Baris attendance mentah dari /api/attendance/logs atau daily-summary. */
  log: any;
  /**
   * `chip` — badge tipe saja (untuk baris padat).
   * `inline` — badge + nama tempat pada satu baris.
   * `block` — badge, tempat, dan koordinat yang bisa diklik ke Maps.
   */
  variant?: 'chip' | 'inline' | 'block';
  /** Tampilkan koordinat sebagai tautan Maps (hanya `block`). */
  showCoords?: boolean;
}

/**
 * Keterangan lokasi absen — dipakai bersama oleh employee, manager, dan HR.
 * Semua tampilan kehadiran harus lewat sini supaya WFO/WFA/Dinas dan nama
 * kantornya konsisten di semua role.
 */
export default function AttendanceLocationTag({ log, variant = 'inline', showCoords = true }: Props) {
  const loc = describeAttendanceLocation(log);

  const chip = (
    <HPChip tone={loc.tone}>
      <span aria-hidden style={{ marginRight: 4 }}>{loc.icon}</span>
      {loc.label}
    </HPChip>
  );

  if (variant === 'chip') return chip;

  if (variant === 'inline') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        {chip}
        <span
          style={{
            ...HP_TEXT.tiny,
            color: loc.place ? HP_TOKENS.inkMute : HP_TOKENS.inkFade,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {loc.place || loc.coords || (loc.kind === 'WFO' ? 'Kantor tidak tercatat' : 'Lokasi luar kantor')}
        </span>
      </span>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {chip}
        <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>{loc.longLabel}</span>
      </div>
      <div style={{ ...HP_TEXT.small, fontSize: 12, color: HP_TOKENS.ink, fontWeight: 600 }}>
        {loc.place || (loc.kind === 'WFO' ? 'Kantor tidak tercatat' : 'Lokasi luar kantor')}
      </div>
      {showCoords && loc.coords && (
        loc.mapsUrl ? (
          <a
            href={loc.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...HP_TEXT.tiny, color: HP_TOKENS.primaryInk, textDecoration: 'none', fontWeight: 600 }}
          >
            📍 {loc.coords} · buka peta
          </a>
        ) : (
          <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade }}>📍 {loc.coords}</span>
        )
      )}
    </div>
  );
}
