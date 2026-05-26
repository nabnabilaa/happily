"use client";

import React, { useState, useEffect } from "react";
import HPCard from "@/components/ui/HPCard";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPAvatar from "@/components/ui/HPAvatar";
import AttendanceDashboard from "@/components/hr/AttendanceDashboard";

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

interface HRAttendanceViewProps {
  currentUser: any;
  openModal?: (name: string, props?: any) => void;
}

export default function HRAttendanceView({ currentUser, openModal }: HRAttendanceViewProps) {
  const now = new Date();
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [summaryByUser, setSummaryByUser] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchLogs();
    const handleUpdate = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchLogs(true);
      }
    };
    window.addEventListener('hp_db_update', handleUpdate);
    return () => window.removeEventListener('hp_db_update', handleUpdate);
  }, [month, year]);

  const fetchLogs = async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    try {
      const params = new URLSearchParams({
        userId: currentUser?.id,
        month: String(month),
        year: String(year)
      });

      const res = await fetch(`/api/attendance/logs?${params}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.logs) setLogs(data.logs);

      // Fetch users if HR/Manager
      if (['hr', 'manager'].includes(currentUser?.role)) {
        const uRes = await fetch(`/api/hr/users?adminId=${currentUser?.id}`);
        const uData = await uRes.json();
        if (uData.users) {
          setUsers(uData.users);
          // Compute per-user summaries from logs
          const byUser: Record<string, any> = {};
          for (const log of data.logs || []) {
            const uid = log.user_id;
            if (!byUser[uid]) {
              byUser[uid] = { 
                name: log.user_name, 
                days: 0, 
                totalMinutes: 0, 
                withCheckout: 0,
                department: log.user_department || '' 
              };
            }
            byUser[uid].days++;
            if (log.duration_minutes) {
              byUser[uid].totalMinutes += Number(log.duration_minutes);
              byUser[uid].withCheckout++;
            }
          }
          setSummaryByUser(byUser);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!logs || logs.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Nama,Waktu Masuk,Waktu Keluar,Tipe Absen,Durasi (Menit),Lokasi\n";
    
    logs.forEach(row => {
      const name = `"${row.user_name}"`;
      const inTime = `"${new Date(row.check_in_at).toLocaleString('id-ID')}"`;
      const outTime = row.check_out_at ? `"${new Date(row.check_out_at).toLocaleString('id-ID')}"` : '""';
      const type = `"${row.check_in_type || ''}"`;
      const duration = row.duration_minutes || '';
      const location = `"${row.check_in_location_name || ''}"`;
      
      csvContent += `${name},${inTime},${outTime},${type},${duration},${location}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `absensi_${MONTHS[month-1]}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Aggregate stats
  const totalLogs = logs.length;
  const uniqueUsers = new Set(logs.map(l => l.user_id)).size;
  const withCheckout = logs.filter(l => l.check_out_at).length;
  const avgDuration = withCheckout > 0 
    ? Math.round(logs.filter(l => l.duration_minutes).reduce((s, l) => s + Number(l.duration_minutes), 0) / withCheckout) 
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Month Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <select 
          value={month} 
          onChange={e => setMonth(Number(e.target.value))}
          style={{
            flex: 1, padding: '10px 12px', borderRadius: 12,
            border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT,
            fontWeight: 700, fontSize: 13, outline: 'none', background: '#fff'
          }}
        >
          {MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
        <select 
          value={year} 
          onChange={e => setYear(Number(e.target.value))}
          style={{
            width: 100, padding: '10px 12px', borderRadius: 12,
            border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT,
            fontWeight: 700, fontSize: 13, outline: 'none', background: '#fff'
          }}
        >
          {[2024, 2025, 2026, 2027].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button onClick={() => fetchLogs()} style={{ 
          background: HP_TOKENS.blue, border: 'none', cursor: 'pointer', 
          padding: '10px 14px', borderRadius: 12, display: 'flex', alignItems: 'center'
        }}>
          <HPGlyph name="refresh" size={14} color="#fff" />
        </button>
        {['hr', 'manager'].includes(currentUser?.role) && (
          <button onClick={handleExportCSV} style={{ 
            background: HP_TOKENS.sage, border: 'none', cursor: 'pointer', 
            padding: '10px 14px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 6,
            color: '#fff', fontFamily: HP_FONT, fontWeight: 700, fontSize: 13
          }}>
            <HPGlyph name="sparkle" size={14} color="#fff" />
            CSV
          </button>
        )}
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: 'Total Log', value: totalLogs, color: HP_TOKENS.blue, bg: HP_TOKENS.blueSoft },
          { label: 'Unik Users', value: uniqueUsers, color: '#7B6BB5', bg: '#EDE8F5' },
          { label: 'Clock-out', value: `${withCheckout}/${totalLogs}`, color: HP_TOKENS.sage, bg: HP_TOKENS.sageWash },
          { label: 'Avg Jam', value: avgDuration > 0 ? `${Math.floor(avgDuration/60)}j${avgDuration%60}m` : '-', color: '#8A6814', bg: HP_TOKENS.yellowSoft },
        ].map(s => (
          <div key={s.label} style={{
            padding: '12px 8px', borderRadius: 14, background: s.bg,
            textAlign: 'center', border: `1px solid ${s.color}15`
          }}>
            <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 18, color: s.color }}>{s.value}</div>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Legacy Dashboard (if exists) */}
      {['hr', 'manager'].includes(currentUser?.role) && logs.length > 0 && (
        <AttendanceDashboard logs={logs} users={users} />
      )}

      {/* Per-User Summary Table */}
      {['hr', 'manager'].includes(currentUser?.role) && Object.keys(summaryByUser).length > 0 && (
        <HPCard padding={0} style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${HP_TOKENS.lineSoft}` }}>
            <div style={{ ...HP_TEXT.h, fontSize: 14 }}>👥 Ringkasan Per Karyawan</div>
          </div>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {Object.entries(summaryByUser)
              .sort((a, b) => b[1].days - a[1].days)
              .map(([userId, data]: [string, any]) => (
                <div 
                  key={userId}
                  onClick={() => openModal?.('attendance_history', { targetUserId: userId, targetUserName: data.name })}
                  className="hp-tap"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                    borderBottom: `1px solid ${HP_TOKENS.lineSoft}`, cursor: 'pointer',
                  }}
                >
                  <HPAvatar name={data.name} size={34} />
                  <div style={{ flex: 1 }}>
                    <div style={{ ...HP_TEXT.h, fontSize: 13 }}>{data.name}</div>
                    {data.department && (
                      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>{data.department}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, color: HP_TOKENS.sage }}>{data.days}</div>
                      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade }}>hadir</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, color: HP_TOKENS.blue }}>
                        {data.withCheckout > 0 ? `${Math.floor(data.totalMinutes / data.withCheckout / 60)}j` : '-'}
                      </div>
                      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade }}>avg</div>
                    </div>
                    <HPGlyph name="chevronRight" size={14} color={HP_TOKENS.line} />
                  </div>
                </div>
              ))
            }
          </div>
        </HPCard>
      )}

      {/* Recent Logs */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ ...HP_TEXT.h, fontSize: 15 }}>Log Absensi — {MONTHS[month-1]} {year}</div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, color: HP_TOKENS.inkMute }}>Loading...</div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, border: `1.5px dashed ${HP_TOKENS.line}`, borderRadius: 20, color: HP_TOKENS.inkMute }}>
            Belum ada data absensi bulan ini
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {logs.slice(0, 30).map((log: any) => (
              <HPCard key={log.id} padding={12}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <HPAvatar name={log.user_name} size={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ ...HP_TEXT.h, fontSize: 13 }}>{log.user_name}</div>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2 }}>
                      {new Date(log.check_in_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {log.check_out_at && (
                        <> → {new Date(log.check_out_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</>
                      )}
                      {log.check_in_type && ` · ${log.check_in_type}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {log.duration_minutes && (
                      <div style={{
                        padding: '3px 8px', borderRadius: 8, fontSize: 10, fontWeight: 800, fontFamily: HP_FONT,
                        background: HP_TOKENS.yellowSoft, color: '#8A6814'
                      }}>
                        {Math.floor(log.duration_minutes / 60)}j{log.duration_minutes % 60}m
                      </div>
                    )}
                    <div style={{
                      padding: '3px 8px', borderRadius: 8, fontSize: 10, fontWeight: 800, fontFamily: HP_FONT,
                      background: log.check_out_at ? HP_TOKENS.sageWash : HP_TOKENS.coralSoft,
                      color: log.check_out_at ? HP_TOKENS.sage : HP_TOKENS.coral
                    }}>
                      {log.check_out_at ? 'LENGKAP' : 'BELUM OUT'}
                    </div>
                  </div>
                </div>
              </HPCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
