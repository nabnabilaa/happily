"use client";

import React, { useState, useEffect } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPAvatar from "@/components/ui/HPAvatar";
import Modal from "@/components/ui/Modal";

interface ManageKPIModalProps {
  onClose: () => void;
}

interface KPI {
  id: string;
  title: string;
  targetDescription: string;
  weight: number;
  assignedTo: string;
  assigneeName: string | null;
  status: string;
  finalScore: number | null;
}

interface TeamMember {
  id: string;
  name: string;
  role?: string;
  job_title?: string;
}

const now = new Date();
const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

export default function ManageKPIModal({ onClose }: ManageKPIModalProps) {
  const { user } = useHP();
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [weight, setWeight] = useState(25);
  const [assignTo, setAssignTo] = useState('');
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchKPIs();
    fetchMembers();
  }, [month, year]);

  const fetchKPIs = async () => {
    try {
      const res = await fetch(`/api/kpi?userId=${user?.id}&role=${user?.role}&month=${month}&year=${year}`);
      const data = await res.json();
      setKpis(data.kpis || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.users) {
        setMembers(data.users.filter((u: any) => String(u.id) !== String(user?.id)));
      }
    } catch (e) { console.error(e); }
  };

  const handleCreate = async () => {
    if (!title || !assignTo) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/kpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, targetDescription: target, weight, month, year,
          assignedTo: assignTo, assignedBy: user?.id
        })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setSaving(false); return; }

      setTitle(''); setTarget(''); setWeight(25); setAssignTo('');
      setShowForm(false);
      fetchKPIs();
    } catch (e) { setError('Gagal menyimpan'); }
    setSaving(false);
  };

  const handleDelete = async (kpiId: string) => {
    await fetch(`/api/kpi?id=${kpiId}`, { method: 'DELETE' });
    fetchKPIs();
  };

  const totalWeight = kpis.reduce((sum, k) => sum + k.weight, 0);

  const selectStyle: React.CSSProperties = {
    padding: 12, borderRadius: 12, border: `1.5px solid ${HP_TOKENS.line}`,
    fontFamily: HP_FONT, fontSize: 13, background: HP_TOKENS.card, outline: 'none', width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <Modal onClose={onClose} title="📊 KPI Bulanan">
      <div style={{ marginTop: 4 }}>
        {/* Month/Year Selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <div style={{ flex: 2, position: 'relative' }}>
            <div 
              onClick={() => setShowMonthDropdown(!showMonthDropdown)}
              style={{ ...selectStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
            >
              <span>{MONTHS[month - 1]}</span>
              <HPGlyph name="chevron-down" size={16} color={HP_TOKENS.inkMute} />
            </div>
            {showMonthDropdown && (
              <>
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }} onClick={() => setShowMonthDropdown(false)} />
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(26,29,35,0.12)', border: `1px solid ${HP_TOKENS.line}`, zIndex: 101, maxHeight: 250, overflowY: 'auto', padding: 8 }}>
                  {MONTHS.map((m, i) => (
                    <div 
                      key={i} className="hp-tap"
                      onClick={() => { setMonth(i + 1); setShowMonthDropdown(false); }}
                      style={{
                        padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                        background: month === (i + 1) ? HP_TOKENS.blueWash : 'transparent',
                        color: month === (i + 1) ? HP_TOKENS.blue : HP_TOKENS.ink,
                        ...HP_TEXT.body, fontSize: 13, fontWeight: month === (i + 1) ? 700 : 500,
                        marginBottom: 4
                      }}
                    >
                      {m}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <div 
              onClick={() => setShowYearDropdown(!showYearDropdown)}
              style={{ ...selectStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
            >
              <span>{year}</span>
              <HPGlyph name="chevron-down" size={16} color={HP_TOKENS.inkMute} />
            </div>
            {showYearDropdown && (
              <>
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }} onClick={() => setShowYearDropdown(false)} />
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(26,29,35,0.12)', border: `1px solid ${HP_TOKENS.line}`, zIndex: 101, maxHeight: 250, overflowY: 'auto', padding: 8 }}>
                  {[2025, 2026, 2027].map(y => (
                    <div 
                      key={y} className="hp-tap"
                      onClick={() => { setYear(y); setShowYearDropdown(false); }}
                      style={{
                        padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                        background: year === y ? HP_TOKENS.blueWash : 'transparent',
                        color: year === y ? HP_TOKENS.blue : HP_TOKENS.ink,
                        ...HP_TEXT.body, fontSize: 13, fontWeight: year === y ? 700 : 500,
                        marginBottom: 4
                      }}
                    >
                      {y}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Weight indicator */}
        <div style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', borderRadius: 12, marginBottom: 16,
          background: totalWeight === 100 ? HP_TOKENS.sageWash : totalWeight > 100 ? '#FFF5F5' : HP_TOKENS.blueWash,
          border: `1px solid ${totalWeight === 100 ? HP_TOKENS.sage : totalWeight > 100 ? '#FFC9C9' : HP_TOKENS.blue}30`
        }}>
          <span style={{ ...HP_TEXT.small, fontWeight: 700, color: HP_TOKENS.inkSoft }}>Total Bobot</span>
          <span style={{ 
            fontFamily: HP_FONT, fontWeight: 900, fontSize: 16,
            color: totalWeight === 100 ? HP_TOKENS.sage : totalWeight > 100 ? HP_TOKENS.coral : HP_TOKENS.blue 
          }}>
            {totalWeight}%
            {totalWeight === 100 && ' ✅'}
            {totalWeight > 100 && ' ⚠️ Melebihi!'}
          </span>
        </div>

        {/* KPI List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, color: HP_TOKENS.inkMute }}>Memuat...</div>
        ) : kpis.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: HP_TOKENS.inkMute }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
            <div style={{ ...HP_TEXT.body, fontWeight: 700 }}>Belum ada KPI untuk {MONTHS[month - 1]} {year}</div>
            <div style={{ ...HP_TEXT.small, marginTop: 4 }}>Klik tombol di bawah untuk mulai</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {kpis.map(k => (
              <div key={k.id} style={{
                padding: 14, borderRadius: 16, background: HP_TOKENS.card,
                border: `1.5px solid ${HP_TOKENS.line}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...HP_TEXT.h, fontSize: 14 }}>{k.title}</div>
                    {k.targetDescription && (
                      <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 4 }}>
                        Target: {k.targetDescription}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                      <div style={{
                        padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 800,
                        background: HP_TOKENS.blueSoft, color: HP_TOKENS.blue, fontFamily: HP_FONT
                      }}>
                        Bobot: {k.weight}%
                      </div>
                      {k.assigneeName && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <HPAvatar name={k.assigneeName} size={18} />
                          <span style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft, fontWeight: 600 }}>
                            {k.assigneeName.split(' ')[0]}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(k.id)} style={{ 
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4 
                  }}>
                    <HPGlyph name="close" size={16} color={HP_TOKENS.coral} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Form */}
        {showForm ? (
          <div style={{ 
            padding: 16, borderRadius: 20, background: HP_TOKENS.sageWash,
            display: 'flex', flexDirection: 'column', gap: 12
          }}>
            {error && (
              <div style={{ padding: 10, borderRadius: 10, background: '#FFF5F5', color: '#E03131', fontSize: 12, fontWeight: 700 }}>
                {error}
              </div>
            )}

            <input
              type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Judul KPI (mis: Redesign checkout flow)"
              style={selectStyle}
            />
            <textarea
              value={target} onChange={e => setTarget(e.target.value)}
              placeholder="Target terukur (mis: Deliverable hi-fi di Figma)"
              rows={2}
              style={{ ...selectStyle, resize: 'none' }}
            />

            <div style={{ ...HP_TEXT.small, fontSize: 11, fontWeight: 700, color: HP_TOKENS.inkMute }}>Bobot (%)</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[10, 20, 25, 30, 40, 50].map(w => (
                <button key={w} onClick={() => setWeight(w)} style={{
                  flex: 1, padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 800,
                  background: weight === w ? HP_TOKENS.sage : '#fff',
                  color: weight === w ? '#fff' : HP_TOKENS.ink,
                  border: `1px solid ${weight === w ? HP_TOKENS.sage : HP_TOKENS.line}`,
                  cursor: 'pointer', fontFamily: HP_FONT,
                }}>
                  {w}%
                </button>
              ))}
            </div>

            <div style={{ ...HP_TEXT.small, fontSize: 11, fontWeight: 700, color: HP_TOKENS.inkMute }}>Assign ke</div>
            <div style={{ position: 'relative' }}>
              <div 
                onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                style={{ ...selectStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
              >
                <span>
                  {assignTo === "" ? "Pilih anggota tim..." : members.find(m => m.id === assignTo)?.name || "Pilih anggota tim..."}
                </span>
                <HPGlyph name="chevron-down" size={16} color={HP_TOKENS.inkMute} />
              </div>
              {showAssignDropdown && (
                <>
                  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }} onClick={() => setShowAssignDropdown(false)} />
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(26,29,35,0.12)', border: `1px solid ${HP_TOKENS.line}`, zIndex: 101, maxHeight: 250, overflowY: 'auto', padding: 8 }}>
                    <div 
                      className="hp-tap"
                      onClick={() => { setAssignTo(""); setShowAssignDropdown(false); }}
                      style={{
                        padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                        background: assignTo === "" ? HP_TOKENS.blueWash : 'transparent',
                        color: assignTo === "" ? HP_TOKENS.blue : HP_TOKENS.ink,
                        ...HP_TEXT.body, fontSize: 13, fontWeight: assignTo === "" ? 700 : 500,
                        marginBottom: 4
                      }}
                    >
                      Pilih anggota tim...
                    </div>
                    {members.map(m => (
                      <div 
                        key={m.id} className="hp-tap"
                        onClick={() => { setAssignTo(m.id); setShowAssignDropdown(false); }}
                        style={{
                          padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                          background: assignTo === m.id ? HP_TOKENS.blueWash : 'transparent',
                          color: assignTo === m.id ? HP_TOKENS.blue : HP_TOKENS.ink,
                          ...HP_TEXT.body, fontSize: 13, fontWeight: assignTo === m.id ? 700 : 500,
                          marginBottom: 4
                        }}
                      >
                        {m.name} — {m.job_title || m.role}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowForm(false)} style={{
                flex: 1, padding: 12, borderRadius: 12, border: `1.5px solid ${HP_TOKENS.line}`,
                background: HP_TOKENS.card, fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer', color: HP_TOKENS.inkSoft
              }}>
                Batal
              </button>
              <button onClick={handleCreate} disabled={!title || !assignTo || saving} style={{
                flex: 2, padding: 12, borderRadius: 12, border: 'none',
                background: HP_TOKENS.sage, color: '#F4F7F9',
                fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer',
                opacity: !title || !assignTo || saving ? 0.5 : 1,
              }}>
                {saving ? 'Menyimpan...' : 'Buat KPI'}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)} style={{
            width: '100%', padding: 14, borderRadius: 14, border: `2px dashed ${HP_TOKENS.sage}`,
            background: HP_TOKENS.sageWash, color: HP_TOKENS.sage,
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <HPGlyph name="plus" size={16} color={HP_TOKENS.sage} />
            Tambah KPI Baru
          </button>
        )}
      </div>
    </Modal>
  );
}
