"use client";

import React, { useState, useMemo } from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPCard from "@/components/ui/HPCard";
import HPGlyph from "@/components/ui/HPGlyph";

interface AttendanceDashboardProps {
  logs: any[];
  users: any[]; // We need users to calculate absences
}

export default function AttendanceDashboard({ logs, users }: AttendanceDashboardProps) {
  const [filterType, setFilterType] = useState<'day' | 'month' | 'year'>('day');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString()); // YYYY

  // Filter logs based on selection
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const logDate = new Date(log.check_in_at);
      if (filterType === 'day') {
        // match YYYY-MM-DD (handling timezone differences minimally for MVP)
        const d = logDate.toLocaleDateString('en-CA'); // YYYY-MM-DD
        return d === selectedDate;
      } else if (filterType === 'month') {
        const m = logDate.toLocaleDateString('en-CA').slice(0, 7); // YYYY-MM
        return m === selectedMonth;
      } else {
        const y = logDate.getFullYear().toString();
        return y === selectedYear;
      }
    });
  }, [logs, filterType, selectedDate, selectedMonth, selectedYear]);

  // Calculate statistics
  const stats = useMemo(() => {
    let onTime = 0;
    let late = 0;
    let wfo = 0;
    let wfa = 0;
    let dinas = 0;

    const presentUserIds = new Set<string>();

    filteredLogs.forEach(log => {
      presentUserIds.add(log.user_id);
      
      if (log.status === 'on-time') onTime++;
      else if (log.status === 'late') late++;
      else onTime++; // default

      if (log.check_in_type === 'WFO') wfo++;
      else if (log.check_in_type === 'WFA') wfa++;
      else if (log.check_in_type === 'DINAS') dinas++;
    });

    // Absences only make sense for 'day' view simply, 
    // but for month/year we could estimate (Total Users * Working Days - Total Presents)
    // For MVP, if filter is 'day', missing = total_employees - present
    let absent = 0;
    if (filterType === 'day' && users.length > 0) {
      absent = Math.max(0, users.length - presentUserIds.size);
    } else {
      absent = -1; // hide absent count if not day view
    }

    return { onTime, late, wfo, wfa, dinas, absent, totalPresent: presentUserIds.size };
  }, [filteredLogs, users, filterType]);

  return (
    <div style={{ marginBottom: 24, fontFamily: HP_FONT }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <select 
          value={filterType} 
          onChange={e => setFilterType(e.target.value as any)}
          style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${HP_TOKENS.line}`, outline: 'none', fontFamily: HP_FONT }}
        >
          <option value="day">Harian</option>
          <option value="month">Bulanan</option>
          <option value="year">Tahunan</option>
        </select>
        
        {filterType === 'day' && (
          <input 
            type="date" 
            value={selectedDate} 
            onChange={e => setSelectedDate(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${HP_TOKENS.line}`, outline: 'none', fontFamily: HP_FONT }}
          />
        )}
        {filterType === 'month' && (
          <input 
            type="month" 
            value={selectedMonth} 
            onChange={e => setSelectedMonth(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${HP_TOKENS.line}`, outline: 'none', fontFamily: HP_FONT }}
          />
        )}
        {filterType === 'year' && (
          <select 
            value={selectedYear} 
            onChange={e => setSelectedYear(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${HP_TOKENS.line}`, outline: 'none', fontFamily: HP_FONT }}
          >
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <HPCard padding={16} style={{ background: HP_TOKENS.blueSoft, border: 'none' }}>
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.blue, fontWeight: 700, marginBottom: 4 }}>TOTAL KEHADIRAN</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: HP_TOKENS.blue }}>{stats.totalPresent}</div>
        </HPCard>
        
        {stats.absent >= 0 && (
          <HPCard padding={16} style={{ background: HP_TOKENS.coralSoft, border: 'none' }}>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.coral, fontWeight: 700, marginBottom: 4 }}>TIDAK MASUK</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: HP_TOKENS.coral }}>{stats.absent}</div>
          </HPCard>
        )}
        {stats.absent < 0 && (
          <HPCard padding={16} style={{ background: HP_TOKENS.sageSoft, border: 'none' }}>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.sage, fontWeight: 700, marginBottom: 4 }}>TEPAT WAKTU</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: HP_TOKENS.sage }}>{stats.onTime}</div>
          </HPCard>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
        {[
          { label: 'WFO', value: stats.wfo, color: HP_TOKENS.ink },
          { label: 'WFA', value: stats.wfa, color: HP_TOKENS.lavender },
          { label: 'Dinas', value: stats.dinas, color: HP_TOKENS.yellow },
        ].map(item => (
          <div key={item.label} style={{ background: HP_TOKENS.card, border: `1px solid ${HP_TOKENS.lineSoft}`, borderRadius: 12, padding: 12, textAlign: 'center' }}>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>{item.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: item.color, marginTop: 4 }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
