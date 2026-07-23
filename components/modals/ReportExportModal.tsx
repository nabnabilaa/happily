"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import Modal from "@/components/ui/Modal";
import HPGlyph from "@/components/ui/HPGlyph";
import HPAvatar from "@/components/ui/HPAvatar";

interface Props { onClose: () => void; }

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

// Tipe laporan → jadi sheet/tab terpisah di 1 file Excel.
const TYPE_OPTIONS: { key: string; label: string; sheet: string; emoji: string }[] = [
  { key: 'logbook', label: 'Harian (Logbook)', sheet: 'Harian', emoji: '📝' },
  { key: 'weekly',  label: 'Mingguan',          sheet: 'Mingguan', emoji: '📅' },
  { key: 'monthly', label: 'Bulanan (Rekap)',   sheet: 'Bulanan', emoji: '📊' },
  { key: 'kpi',     label: 'KPI Bulanan',        sheet: 'KPI', emoji: '🎯' },
];

// Mapper baris → kolom Excel (header = key objek).
const ROW_MAPPERS: Record<string, (r: any) => Record<string, any>> = {
  logbook: (r) => ({
    Nama: r.user_name || '',
    Departemen: r.department || '',
    Tanggal: r.target_date ? String(r.target_date).slice(0, 10) : (r.created_at ? String(r.created_at).slice(0, 10) : ''),
    'Judul Task': r.title || '',
    Deskripsi: r.description || '',
    Status: r.is_done ? (r.is_verified ? 'Verified' : 'Selesai') : 'Belum Selesai',
    'Bukti Link': r.proof_link || '',
    'Bukti Notes': r.proof_notes || '',
    'KPI Terkait': r.goal_title || '',
    'Target Mingguan': r.weekly_target_title || '',
  }),
  kpi: (r) => ({
    Nama: r.user_name || '',
    Departemen: r.department || '',
    'KPI Title': r.title || '',
    'Target Deskripsi': r.target_description || '',
    'Bobot (%)': Number(r.weight || 0),
    'Skor Akhir': r.final_score !== null && r.final_score !== undefined ? Number(r.final_score) : '-',
    Status: r.status || '',
    'Catatan Manager': r.manager_notes || '',
  }),
  weekly: (r) => {
    const target = Number(r.target_value || 0);
    const current = Number(r.current_value || 0);
    return {
      Nama: r.user_name || '',
      Departemen: r.department || '',
      'KPI Title': r.kpi_title || '',
      'Minggu Ke': `Minggu ${r.week_number}`,
      'Target Mingguan': r.title || '',
      'Nilai Target': target,
      'Nilai Aktual': current,
      'Pencapaian (%)': target > 0 ? Math.round((current / target) * 100) : 0,
      Unit: r.metric_unit || '',
      Status: r.status || '',
    };
  },
  monthly: (r) => ({
    Nama: r.user_name || '',
    Departemen: r.department || '',
    Jabatan: r.job_title || '',
    'Total Task': Number(r.total_tasks || 0),
    'Task Selesai': Number(r.tasks_completed || 0),
    'Penyelesaian (%)': Number(r.completion_rate || 0),
    'Hari Aktif': Number(r.active_days || 0),
    'Hari Hadir': Number(r.attendance_days || 0),
    'Hari Kerja': Number(r.total_working_days || 0),
    'Skor KPI': Number(r.kpi_score || 0),
    'Skor Kualitas': Number(r.quality_score || 0),
    'Catatan Manager': r.manager_summary || '',
    'Status Laporan': r.status || '',
  }),
};

export default function ReportExportModal({ onClose }: Props) {
  const { user, notify } = useHP();
  const isManagerOnly = user?.role === 'manager' && !user?.hrAccess;

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set());

  const [selectAll, setSelectAll] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['logbook', 'monthly']);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/hr/users?adminId=${user?.id}`);
        const data = await res.json();
        let list = data.users || [];
        // Manager hanya boleh memilih anggota timnya.
        if (isManagerOnly) list = list.filter((u: any) => String(u.manager_id) === String(user?.id));
        setUsers(list);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [user?.id]);

  const usersByDept = useMemo(() => {
    const map: Record<string, any[]> = {};
    users
      .filter(u => u.name?.toLowerCase().includes(search.toLowerCase()) || u.department?.toLowerCase().includes(search.toLowerCase()))
      .forEach(u => {
        const dept = u.department || 'Lainnya';
        (map[dept] = map[dept] || []).push(u);
      });
    return map;
  }, [users, search]);

  const deptNames = Object.keys(usersByDept).sort();

  const toggleUser = (id: string) =>
    setSelectedUserIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const selectAllInDept = (dept: string) => {
    const ids = (usersByDept[dept] || []).map(u => String(u.id));
    const all = ids.every(id => selectedUserIds.includes(id));
    setSelectedUserIds(prev => all ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]);
  };

  const toggleType = (key: string) =>
    setSelectedTypes(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);

  const toggleCollapse = (dept: string) =>
    setCollapsedDepts(prev => { const n = new Set(prev); n.has(dept) ? n.delete(dept) : n.add(dept); return n; });

  const canExport = selectedTypes.length > 0 && (selectAll || selectedUserIds.length > 0) && !exporting;

  const handleExport = async () => {
    if (!canExport) return;
    setExporting(true);
    try {
      const xlsxMod: any = await import("xlsx");
      const XLSX: any = xlsxMod?.utils ? xlsxMod : (xlsxMod?.default ?? xlsxMod);
      const wb = XLSX.utils.book_new();
      const base = `/api/hr/reports/export?requesterId=${user?.id}&month=${month}&year=${year}`;
      const idsParam = selectAll ? '' : `&userIds=${encodeURIComponent(selectedUserIds.join(','))}`;
      let anyData = false;

      // Auto-fit column widths from cell content.
      const autoCols = (rows: any[]) => {
        if (!rows.length) return [{ wch: 40 }];
        return Object.keys(rows[0]).map(k => ({
          wch: Math.min(60, Math.max(k.length + 2, ...rows.map(r => String(r[k] ?? '').length + 2))),
        }));
      };

      const summaryRows: Record<string, any>[] = [];
      for (const t of TYPE_OPTIONS.filter(t => selectedTypes.includes(t.key))) {
        const res = await fetch(`${base}&type=${t.key}${idsParam}`);
        const json = await res.json();
        const rows = (json.data || []).map(ROW_MAPPERS[t.key]);
        if (rows.length) anyData = true;
        summaryRows.push({ 'Jenis Laporan': t.label, Sheet: t.sheet, 'Jumlah Baris': rows.length });
        const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Info: 'Tidak ada data untuk pilihan ini' }]);
        ws['!cols'] = autoCols(rows.length ? rows : [{ Info: '' }]);
        XLSX.utils.book_append_sheet(wb, ws, t.sheet);
      }

      // Prepend a Ringkasan (summary) sheet.
      const scopeText = selectAll ? (isManagerOnly ? 'Semua anggota tim' : 'Semua karyawan') : `${selectedUserIds.length} orang terpilih`;
      const meta = [
        { Info: 'Periode', Nilai: `${MONTHS[month - 1]} ${year}` },
        { Info: 'Cakupan', Nilai: scopeText },
        { Info: 'Dibuat', Nilai: new Date().toLocaleString('id-ID') },
        { Info: '', Nilai: '' },
        ...summaryRows.map(s => ({ Info: s['Jenis Laporan'], Nilai: `${s['Jumlah Baris']} baris` })),
      ];
      const summaryWs = XLSX.utils.json_to_sheet(meta);
      summaryWs['!cols'] = [{ wch: 28 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Ringkasan');
      // Move Ringkasan to first position.
      wb.SheetNames = ['Ringkasan', ...wb.SheetNames.filter((n: string) => n !== 'Ringkasan')];

      if (!anyData) {
        notify('Kosong', 'Tidak ada data untuk pilihan tersebut.', 'warning');
        setExporting(false);
        return;
      }

      const scopeLabel = selectAll ? 'semua' : `${selectedUserIds.length}orang`;
      const fname = `laporan_${scopeLabel}_${MONTHS[month - 1]}${year}.xlsx`.toLowerCase();
      XLSX.writeFile(wb, fname);
      notify('Berhasil', `Laporan Excel (${selectedTypes.length} sheet) diunduh.`, 'success');
      onClose();
    } catch (e) {
      console.error(e);
      notify('Error', 'Gagal membuat file Excel.', 'error');
    }
    setExporting(false);
  };

  const selBox = (on: boolean, color: string, size = 20) => (
    <div style={{
      width: size, height: size, borderRadius: 6, flexShrink: 0,
      border: `2px solid ${on ? color : HP_TOKENS.line}`, background: on ? color : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {on && <HPGlyph name="check" size={size * 0.55} color="#F4F7F9" />}
    </div>
  );

  return (
    <Modal onClose={onClose} title="📥 Ekspor Laporan (Excel)">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* 1. Periode */}
        <div>
          <div style={{ ...HP_TEXT.h, fontSize: 13, marginBottom: 8 }}>1. Periode</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} style={selectStyle}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))} style={selectStyle}>
              {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* 2. Tipe laporan (checkbox → sheet terpisah) */}
        <div>
          <div style={{ ...HP_TEXT.h, fontSize: 13, marginBottom: 8 }}>2. Jenis Laporan <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 600 }}>(tiap jenis jadi sheet terpisah)</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {TYPE_OPTIONS.map(t => {
              const on = selectedTypes.includes(t.key);
              return (
                <button key={t.key} onClick={() => toggleType(t.key)} className="hp-tap" style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12,
                  border: `1.5px solid ${on ? HP_TOKENS.sage : HP_TOKENS.line}`,
                  background: on ? HP_TOKENS.sageWash : HP_TOKENS.card, cursor: 'pointer', textAlign: 'left',
                }}>
                  {selBox(on, HP_TOKENS.sage, 18)}
                  <span style={{ fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, color: HP_TOKENS.ink }}>{t.emoji} {t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Siapa saja */}
        <div>
          <div style={{ ...HP_TEXT.h, fontSize: 13, marginBottom: 8 }}>
            3. Siapa saja {isManagerOnly && <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 600 }}>(anggota tim kamu)</span>}
          </div>

          {/* Toggle "Semua orang" */}
          <button onClick={() => setSelectAll(s => !s)} className="hp-tap" style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 12,
            border: `1.5px solid ${selectAll ? HP_TOKENS.blue : HP_TOKENS.line}`,
            background: selectAll ? HP_TOKENS.blueWash : HP_TOKENS.card, cursor: 'pointer', marginBottom: 8,
          }}>
            {selBox(selectAll, HP_TOKENS.blue)}
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ ...HP_TEXT.h, fontSize: 13 }}>Semua orang{isManagerOnly ? ' (tim)' : ''}</div>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>Ekspor seluruh {isManagerOnly ? 'anggota tim' : 'karyawan'}</div>
            </div>
            <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>{users.length} orang</span>
          </button>

          {!selectAll && (
            <>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Cari nama / divisi..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${HP_TOKENS.line}`,
                  fontFamily: HP_FONT, fontSize: 12, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />

              {selectedUserIds.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '6px 8px', borderRadius: 8, background: HP_TOKENS.blueWash, marginBottom: 8 }}>
                  {selectedUserIds.map(id => {
                    const u = users.find(x => String(x.id) === id);
                    return u ? (
                      <span key={id} onClick={() => toggleUser(id)} style={{
                        padding: '3px 8px', borderRadius: 6, background: HP_TOKENS.blue, color: '#F4F7F9',
                        fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: HP_FONT,
                      }}>{u.name?.split(' ')[0]} ✕</span>
                    ) : null;
                  })}
                </div>
              )}

              <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4,
                border: `1px solid ${HP_TOKENS.line}`, borderRadius: 10, padding: 4 }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: 20, color: HP_TOKENS.inkMute }}>Memuat...</div>
                ) : deptNames.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 20, color: HP_TOKENS.inkMute }}>Tidak ada orang.</div>
                ) : deptNames.map(dept => {
                  const du = usersByDept[dept];
                  const isCol = collapsedDepts.has(dept);
                  const allSel = du.every(u => selectedUserIds.includes(String(u.id)));
                  const someSel = du.some(u => selectedUserIds.includes(String(u.id)));
                  return (
                    <div key={dept}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: HP_TOKENS.lineSoft }}>
                        <button onClick={() => toggleCollapse(dept)} className="hp-tap" style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex',
                          transform: isCol ? 'rotate(0)' : 'rotate(90deg)', transition: 'transform 0.2s',
                        }}>
                          <HPGlyph name="chevronRight" size={12} color={HP_TOKENS.inkMute} />
                        </button>
                        <div style={{ flex: 1, ...HP_TEXT.h, fontSize: 12, color: HP_TOKENS.inkMute }}>{dept} ({du.length})</div>
                        <button onClick={() => selectAllInDept(dept)} className="hp-tap" style={{
                          padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, fontFamily: HP_FONT, cursor: 'pointer',
                          background: allSel ? HP_TOKENS.blue : someSel ? `${HP_TOKENS.blue}30` : HP_TOKENS.card,
                          color: allSel ? '#fff' : HP_TOKENS.blue, border: `1.5px solid ${HP_TOKENS.blue}40`,
                        }}>{allSel ? '✓ Semua' : 'Pilih Semua'}</button>
                      </div>
                      {!isCol && du.map(u => {
                        const sel = selectedUserIds.includes(String(u.id));
                        return (
                          <button key={u.id} onClick={() => toggleUser(String(u.id))} className="hp-tap" style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px 8px 28px', borderRadius: 10,
                            background: sel ? HP_TOKENS.blueWash : 'transparent',
                            border: sel ? `1.5px solid ${HP_TOKENS.blue}30` : '1.5px solid transparent',
                            cursor: 'pointer', width: '100%', textAlign: 'left',
                          }}>
                            <HPAvatar name={u.name} size={30} image={u.avatar_image} />
                            <div style={{ flex: 1 }}>
                              <div style={{ ...HP_TEXT.h, fontSize: 13 }}>{u.name}</div>
                              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontSize: 10 }}>{u.job_title || u.role}</div>
                            </div>
                            {selBox(sel, HP_TOKENS.blue, 18)}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Download */}
        <button onClick={handleExport} disabled={!canExport} className="hp-tap" style={{
          width: '100%', padding: 16, borderRadius: 14, border: 'none',
          background: canExport ? HP_TOKENS.sage : HP_TOKENS.lineSoft,
          color: canExport ? '#fff' : HP_TOKENS.inkMute,
          fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, cursor: canExport ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          boxShadow: canExport ? `0 4px 16px ${HP_TOKENS.sage}30` : 'none',
        }}>
          {exporting ? 'Membuat Excel...' : `📥 Unduh Excel${selectedTypes.length ? ` (${selectedTypes.length} sheet)` : ''}`}
        </button>
      </div>
    </Modal>
  );
}

const selectStyle: React.CSSProperties = {
  width: '100%', padding: 12, borderRadius: 12, border: `1.5px solid ${HP_TOKENS.line}`,
  fontFamily: HP_FONT, fontSize: 14, fontWeight: 700, outline: 'none', background: HP_TOKENS.card,
  color: HP_TOKENS.ink, boxSizing: 'border-box', height: 44,
};
