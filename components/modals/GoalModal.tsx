"use client";

import React, { useState } from "react";
import { useHP } from "@/lib/HPContext";
import { 
  HP_TOKENS, 
  HP_FONT, 
  HP_TEXT 
} from "@/lib/constants";
import Modal from "@/components/ui/Modal";
import HPAvatar from "@/components/ui/HPAvatar";
import HPGlyph from "@/components/ui/HPGlyph";


interface GoalModalProps {
  onClose: () => void;
}

export default function GoalModal({ onClose, goal }: { onClose: () => void; goal?: any }) {
  const { state, updateState, user, notify } = useHP();
  const [title, setTitle] = useState(goal?.title || "");

  // Parse due date: handle ISO, or Indonesian display format ("31 Mei 2026 06.05")
  const parseDueDate = (g: any): string => {
    if (g?.dueISO) return g.dueISO;
    if (!g?.due) return '';
    const raw = g.due;
    // Already ISO?
    if (raw.includes('T')) return raw.slice(0, 16);
    // Try Indonesian month names: "31 Mei 2026 06.05"
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', jun: '06',
      jul: '07', agu: '08', ags: '08', sep: '09', okt: '10', nov: '11', des: '12'
    };
    const match = raw.match(/(\d{1,2})\s+(\w+)\s+(\d{4})\s+(\d{1,2})[.:](\d{2})/i);
    if (match) {
      const [, day, monthStr, year, hour, minute] = match;
      const monthKey = monthStr.toLowerCase().slice(0, 3);
      const month = months[monthKey];
      if (month) return `${year}-${month}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}`;
    }
    return '';
  };

  const [due, setDue] = useState(parseDueDate(goal));
  const [scope, setScope] = useState(goal?.scope === 'assigned' ? 'employee' : (goal?.scope || "personal"));
  const [parentId, setParentId] = useState(goal?.parent_id || "");
  const [progress, setProgress] = useState(goal?.progress || 0);
  const [status, setStatus] = useState(goal?.status || 'pending');
  const [isKpi, setIsKpi] = useState(goal?.is_kpi || false);
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<string[]>(goal?.ownerId ? [String(goal.ownerId)] : []);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [managerKpis, setManagerKpis] = useState<any[]>([]);

  // Fetch Manager KPIs for parent alignment options
  React.useEffect(() => {
    async function fetchManagerKpis() {
      if (!user?.id) return;
      try {
        const m = new Date().getMonth() + 1;
        const y = new Date().getFullYear();
        const res = await fetch(`/api/kpi?userId=${user.id}&role=employee&month=${m}&year=${y}`);
        const data = await res.json();
        setManagerKpis((data.kpis || []).map((k: any) => ({
          id: String(k.id),
          title: k.title,
          scope: 'assigned',
          source: 'manager_kpi',
        })));
      } catch (e) { console.error(e); }
    }
    fetchManagerKpis();
  }, [user?.id]);

  // Check if this goal has linked tasks (auto-progress)
  const linkedTaskCount = goal ? (state?.priorities || []).filter(
    (p: any) => (p.goal_id && String(p.goal_id) === String(goal.id)) || (p.kpi_id && String(p.kpi_id) === String(goal.id))
  ).length : 0;
  const hasLinkedTasks = linkedTaskCount > 0;

  const allEmployees = state?.hrData?.members || state?.managerData?.members || [];
  const filteredEmployees = allEmployees.filter((e: any) => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleOwner = (id: string) => {
    setSelectedOwnerIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };


  const save = async () => {
    if (!title || !due || isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      // Validasi Duplikat: Jangan perbolehkan judul yang sama persis jika membuat baru, atau jika edit tapi judul diubah
      const isDuplicate = state?.goals?.some((g: any) => 
        g.title.toLowerCase().trim() === title.toLowerCase().trim() && 
        (!goal || String(g.id) !== String(goal.id))
      );

      if (isDuplicate) {
        notify("Gagal Menyimpan", "OKR/Goals dengan judul ini sudah ada. Harap gunakan nama lain.", "error");
        setIsSubmitting(false);
        return;
      }

      // Format due date for display if it's ISO
    let displayDue = due;
    try {
      const d = new Date(due);
      if (!isNaN(d.getTime())) {
        displayDue = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + " " + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      }
    } catch (e) {}

    if (goal) {
      // Update existing goal
      updateState((s: any) => ({
        ...s,
        goals: s.goals.map((g: any) => {
          if (String(g.id) === String(goal.id)) {
            const nextStatus = (g.status === 'revision' || g.status === 'rejected') ? 'pending' : status;

            return {
              ...g,
              title,
              due: displayDue,
              dueISO: due,
              scope: scope === 'employee' ? 'assigned' : scope,
              parent_id: parentId || null,
              progress: progress,
              status: nextStatus,
              is_kpi: isKpi || g.is_kpi,
            };
          }
          return g;
        })
      }));
    } else {
      // Create new
      const creators = scope === 'employee' ? selectedOwnerIds : [user?.id];
      
      const newEntries = creators.map((ownerId, idx) => {
        const emp = allEmployees.find((e: any) => String(e.id) === String(ownerId));
        return {
          id: String(Date.now() + idx), // Ensure ID is a string
          title,
          progress: progress,
          alignment: 100,
          owner: emp?.name || user?.name || "You",
          ownerId: String(ownerId), // Ensure ownerId is a string
          assignedById: scope === 'employee' ? String(user?.id) : null,
          due: displayDue,
          dueISO: due,
          tone: scope === 'personal' ? "sage" : scope === 'team' ? "blue" : scope === 'employee' ? "lavender" : "yellow",
          metric: "0% complete",
          scope: scope === 'employee' ? 'assigned' : scope,
          parent_id: parentId || null,
          status: 'pending',
          is_kpi: scope === 'employee' || scope === 'team',
        };
      });

      updateState((s: any) => ({
        ...s,
        goals: [
          ...s.goals,
          ...newEntries
        ]
      }));
    }
    notify("OKR Berhasil Disimpan 🎉", "Strategi dan target telah diperbarui.", "success");
    onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const scopes = [
    { key: 'personal', label: 'Personal', desc: 'Hanya untuk progres kamu', icon: 'sparkle' },
    (user?.role === 'manager' || user?.role === 'hr') && { key: 'employee', label: 'Assign', desc: 'Berikan OKR ke anggota tim', icon: 'people' },
    (user?.role === 'manager' || user?.role === 'hr') && { key: 'team', label: 'Team', desc: 'Target bersama satu divisi', icon: 'target' },
  ].filter(Boolean) as any[];

  const parentOptions = React.useMemo(() => {
    const goalsFromState = (state?.goals || []).filter((g: any) => {
      if (scope === 'personal') return g.scope === 'team' || g.scope === 'assigned';
      if (scope === 'employee') return g.scope === 'team';
      return false;
    }).map((g: any) => ({ ...g, source: g.scope === 'assigned' ? 'assigned_okr' : g.scope }));

    // Merge Manager KPIs as parent options for personal goals
    if (scope === 'personal') {
      for (const kpi of managerKpis) {
        if (!goalsFromState.some((g: any) => String(g.id) === String(kpi.id) || g.title?.toLowerCase() === kpi.title?.toLowerCase())) {
          goalsFromState.push(kpi);
        }
      }
    }
    return goalsFromState;
  }, [state?.goals, scope, managerKpis]);

  return (
    <Modal onClose={onClose} title={goal ? "Edit OKR" : "Set Strategi OKR"}>
      <div style={{ marginTop: 4 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700, letterSpacing: 0.5 }}>JUDUL STRATEGI</div>
            <textarea 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              placeholder="Apa yang ingin dicapai? (Misal: Ekspansi pasar ke SEA)"
              rows={2}
              style={{
                width: '100%', marginTop: 8, padding: 14, borderRadius: 16,
                border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontSize: 15,
                color: HP_TOKENS.ink, outline: 'none', background: HP_TOKENS.card, boxSizing: 'border-box',
                resize: 'none', lineHeight: 1.4
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700 }}>TENGGAT WAKTU (DEADLINE)</div>
            <input 
              type="datetime-local" 
              value={due} 
              onChange={e => setDue(e.target.value)}
              style={{
                width: '100%', marginTop: 8, padding: 14, borderRadius: 16,
                border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontSize: 14,
                color: HP_TOKENS.ink, outline: 'none', background: HP_TOKENS.card, boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700 }}>PROGRESS (%)</div>
            <div style={{ ...HP_TEXT.h, fontSize: 16, color: HP_TOKENS.sage }}>{progress}%</div>
          </div>
          {hasLinkedTasks ? (
            <div style={{ 
              marginTop: 12, padding: '10px 14px', background: HP_TOKENS.sageWash, borderRadius: 10,
              border: `1px solid ${HP_TOKENS.sage}20`, display: 'flex', alignItems: 'center', gap: 8
            }}>
              <HPGlyph name="target" size={14} color={HP_TOKENS.sage} />
              <div style={{ ...HP_TEXT.small, color: HP_TOKENS.sage, fontWeight: 700, fontSize: 12 }}>
                Progress dihitung otomatis dari {linkedTaskCount} task harian yang terhubung.
              </div>
            </div>
          ) : (
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={progress} 
              onChange={e => setProgress(parseInt(e.target.value))}
              style={{
                width: '100%', marginTop: 12, accentColor: HP_TOKENS.sage, cursor: 'pointer'
              }}
            />
          )}
        </div>

        {(goal?.status === 'revision' || goal?.status === 'rejected') && (
            <div style={{ 
              marginTop: 12, padding: '12px 14px', background: HP_TOKENS.yellowWash, 
              borderRadius: 14, border: `1px solid ${HP_TOKENS.yellow}40`,
              display: 'flex', alignItems: 'flex-start', gap: 10
            }}>
              <div style={{ marginTop: 2 }}><HPGlyph name="info" size={16} color={HP_TOKENS.yellow} /></div>
              <div style={{ ...HP_TEXT.tiny, color: '#8A6814', fontWeight: 700, fontSize: 11, lineHeight: 1.4 }}>
                <strong>Butuh Perbaikan:</strong> OKR ini sebelumnya ditandai sebagai {goal.status === 'revision' ? 'Revisi' : 'Ditolak'}. Menyimpan perubahan akan otomatis mengirimkan kembali OKR ini sebagai <strong>Pending Review</strong> ke Manager Anda untuk dinilai ulang.
              </div>
            </div>
          )}


        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700, marginTop: 24, marginBottom: 12 }}>PILIH SCOPE OKR</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {scopes.map(s => (
            <button
              key={s.key}
              onClick={() => { setScope(s.key); setParentId(""); }}
              className="hp-tap"
              style={{
                padding: '14px', borderRadius: 16, border: `1.5px solid ${scope === s.key ? HP_TOKENS.ink : HP_TOKENS.lineSoft}`,
                background: scope === s.key ? HP_TOKENS.ink : '#fff',
                color: scope === s.key ? '#fff' : HP_TOKENS.ink,
                fontFamily: HP_FONT, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <HPGlyph name={s.icon} size={18} color={scope === s.key ? '#fff' : HP_TOKENS.inkMute} />
                <div>
                  <div style={{ fontWeight: 900, fontSize: 14 }}>{s.label}</div>
                  <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{s.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {scope === 'employee' && (
          <div style={{ marginTop: 20 }}>
            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700, marginBottom: 10 }}>ASSIGN KE ANGGOTA ({selectedOwnerIds.length})</div>
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', 
              background: HP_TOKENS.card, borderRadius: 16, border: `1.5px solid ${HP_TOKENS.line}`,
              marginBottom: 12
            }}>
              <HPGlyph name="target" size={16} color={HP_TOKENS.inkMute} />
              <input 
                placeholder="Cari nama atau posisi..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontFamily: HP_FONT, fontSize: 14 }}
              />
            </div>
            <div style={{ 
              display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 10, 
              scrollbarWidth: 'none'
            }}>
              {filteredEmployees.map((e: any) => {
                const active = selectedOwnerIds.includes(e.id);
                return (
                  <div 
                    key={e.id} 
                    onClick={() => toggleOwner(e.id)}
                    className="hp-tap"
                    style={{ 
                      flexShrink: 0, width: 70, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      opacity: active ? 1 : 0.5, transition: '0.2s', cursor: 'pointer'
                    }}
                  >
                    <div style={{ position: 'relative' }}>
                      <HPAvatar name={e.name} size={48} color={active ? HP_TOKENS.blue : undefined} />
                      {active && (
                        <div style={{ 
                          position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10,
                          background: HP_TOKENS.blue, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '2px solid #fff', boxShadow: '0 2px 6px rgba(26,29,35,0.1)'
                        }}>
                          <HPGlyph name="check" size={10} color="#F4F7F9" stroke={4} />
                        </div>
                      )}
                    </div>
                    <div style={{ ...HP_TEXT.tiny, textAlign: 'center', fontSize: 10, fontWeight: 800 }}>
                      {e.name.split(' ')[0]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {parentOptions.length > 0 && scope !== 'employee' && (
          <div style={{ marginTop: 24 }}>
            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700, letterSpacing: 0.5 }}>HUBUNGKAN KE PARENT OKR</div>
            <select
              value={parentId}
              onChange={e => setParentId(e.target.value)}
              style={{
                width: '100%', marginTop: 8, padding: 14, borderRadius: 16,
                border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontSize: 14,
                color: HP_TOKENS.ink, outline: 'none', background: HP_TOKENS.card, boxSizing: 'border-box',
              }}
            >
              <option value="">-- Berdiri Sendiri --</option>
              {parentOptions.filter((p: any) => p.source === 'manager_kpi').length > 0 && (
                <optgroup label="📋 KPI dari Manager">
                  {parentOptions.filter((p: any) => p.source === 'manager_kpi').map((p: any) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </optgroup>
              )}
              {parentOptions.filter((p: any) => p.source === 'assigned_okr').length > 0 && (
                <optgroup label="🎯 OKR Assigned">
                  {parentOptions.filter((p: any) => p.source === 'assigned_okr').map((p: any) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </optgroup>
              )}
              {parentOptions.filter((p: any) => p.source === 'team').length > 0 && (
                <optgroup label="🏢 OKR Tim">
                  {parentOptions.filter((p: any) => p.source === 'team').map((p: any) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        )}

        <button 
          onClick={save} 
          disabled={!title || !due || (scope === 'employee' && selectedOwnerIds.length === 0) || isSubmitting}
          style={{
            width: '100%', marginTop: 32, padding: '18px', borderRadius: 99,
            background: HP_TOKENS.sage, color: '#F4F7F9', border: 'none',
            fontFamily: HP_FONT, fontWeight: 900, fontSize: 16, cursor: isSubmitting ? 'default' : 'pointer',
            opacity: (!title || !due || (scope === 'employee' && selectedOwnerIds.length === 0) || isSubmitting) ? 0.4 : 1,
            boxShadow: `0 10px 25px ${HP_TOKENS.sageSoft}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
          }}
          className="hp-tap"
        >
          <HPGlyph name="sparkle" size={20} color="#F4F7F9" />
          {isSubmitting ? "Memproses..." : (scope === 'employee' ? `Assign OKR ke ${selectedOwnerIds.length} Orang` : 'Simpan & Publikasikan OKR')}
        </button>
      </div>
    </Modal>
  );
}

