"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import Modal from "@/components/ui/Modal";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/home/SectionHeader";
import GoalCard from "@/components/goals/GoalCard";
import ReviewTaskWidget from "@/components/manager/ReviewTaskWidget";

interface GoalsScreenProps {
  openModal: (name: string, props?: any) => void;
}

// ── Target Tab ──────────────────────────────────────────────────────────────
function TargetTab({ openModal, kpis, activeKpiId, setActiveKpiId }: { openModal: any; kpis: any[]; activeKpiId: string | null; setActiveKpiId: (id: string) => void }) {
  const { state, notify } = useHP();

  const [weeklyTargetsByKpi, setWeeklyTargetsByKpi] = useState<Record<string, any[]>>({});
  const [loadingTargets, setLoadingTargets] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formKpiId, setFormKpiId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formTargetValue, setFormTargetValue] = useState('100');
  const [formUnit, setFormUnit] = useState('%');
  const [formWeekNumber, setFormWeekNumber] = useState(String(Math.ceil(new Date().getDate() / 7)));
  const [saving, setSaving] = useState(false);
  const refreshTargets = useCallback(async (kpiId: string) => {
    try {
      const r = await fetch(`/api/kpi/weekly-targets?kpiId=${kpiId}`);
      const d = await r.json();
      setWeeklyTargetsByKpi(prev => ({ ...prev, [String(kpiId)]: d.weeklyTargets || [] }));
    } catch (e) { console.error(e); }
  }, []);

  // Fetch weekly targets untuk semua KPI setiap kali kpis berubah
  useEffect(() => {
    if (kpis.length === 0) { setLoadingTargets(false); return; }
    if (!activeKpiId && kpis.length > 0) setActiveKpiId(String(kpis[0].id));
    setLoadingTargets(true);
    Promise.all(kpis.map(async (k: any) => {
      try {
        const r = await fetch(`/api/kpi/weekly-targets?kpiId=${k.id}`);
        const d = await r.json();
        return { kpiId: String(k.id), targets: d.weeklyTargets || [] };
      } catch { return { kpiId: String(k.id), targets: [] }; }
    })).then(results => {
      const map: Record<string, any[]> = {};
      results.forEach(r => { map[r.kpiId] = r.targets; });
      setWeeklyTargetsByKpi(map);
      setLoadingTargets(false);
    });
  }, [kpis]);

  const handleCreate = async () => {
    if (!formKpiId || !formTitle.trim()) {
      notify('Lengkapi Data', 'Pilih KPI dan isi judul target.', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/kpi/weekly-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kpiId: formKpiId,
          title: formTitle.trim(),
          description: formDesc.trim(),
          weekNumber: Number(formWeekNumber) || 1,
          targetValue: Number(formTargetValue) || 100,
          metricUnit: formUnit || '%',
        }),
      });
      if (res.ok) {
        notify('Target Dibuat!', `"${formTitle}" berhasil ditambahkan.`, 'success');
        setShowForm(false);
        setFormTitle(''); setFormDesc(''); setFormKpiId(''); setFormTargetValue('100'); setFormUnit('%');
        await refreshTargets(formKpiId);
      } else {
        notify('Gagal', 'Terjadi kesalahan saat menyimpan target.', 'error');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const [targetToDelete, setTargetToDelete] = useState<{ id: string; kpiId: string } | null>(null);

  const confirmDelete = (targetId: string, kpiId: string) => {
    setTargetToDelete({ id: targetId, kpiId });
  };

  const executeDelete = async () => {
    if (!targetToDelete) return;
    await fetch(`/api/kpi/weekly-targets?id=${targetToDelete.id}`, { method: 'DELETE' });
    await refreshTargets(targetToDelete.kpiId);
    setTargetToDelete(null);
  };

  // Tasks dari state yang linked ke weekly target
  const tasksByTarget = useMemo(() => {
    const map: Record<string, any[]> = {};
    (state?.priorities || []).forEach((p: any) => {
      if (p.weekly_target_id) {
        const key = String(p.weekly_target_id);
        if (!map[key]) map[key] = [];
        map[key].push(p);
      }
    });
    return map;
  }, [state?.priorities]);

  const allTargets = useMemo(() => Object.values(weeklyTargetsByKpi).flat(), [weeklyTargetsByKpi]);

  if (kpis.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', background: HP_TOKENS.card, borderRadius: 24, border: `1.5px solid ${HP_TOKENS.lineSoft}` }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
        <div style={{ ...HP_TEXT.h, fontSize: 14 }}>Belum ada KPI dari manager.</div>
        <div style={{ ...HP_TEXT.small, marginTop: 4, color: HP_TOKENS.inkMute }}>Target bisa dibuat setelah KPI diberikan.</div>
      </div>
    );
  }

  const activeKpi = kpis.find((k: any) => String(k.id) === activeKpiId) || kpis[0];
  const activeTargets = activeKpi ? (weeklyTargetsByKpi[String(activeKpi.id)] || []) : [];

  return (
    <div>
      {!showForm && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ ...HP_TEXT.h, fontSize: 16 }}>Target Mingguan</div>
          <button
            onClick={() => { setFormKpiId(activeKpiId || ''); setShowForm(true); }}
            className="hp-tap"
            style={{
              padding: '10px 18px', borderRadius: 12, border: 'none',
              background: HP_TOKENS.ink, color: '#fff',
              fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            <HPGlyph name="plus" size={14} color="#fff" />
            Buat Target
          </button>
        </div>
      )}

      {/* Form buat target */}
      {showForm && (
        <Modal onClose={() => setShowForm(false)} title="Buat Target Baru ✨">
          <div style={{ marginBottom: 10 }}>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>KPI yang Ditarget *</div>
            <select
              value={formKpiId}
              onChange={e => setFormKpiId(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                border: `1.5px solid ${formKpiId ? HP_TOKENS.blue : HP_TOKENS.line}`,
                fontFamily: HP_FONT, fontSize: 13, fontWeight: 700,
                background: HP_TOKENS.card, color: HP_TOKENS.ink, outline: 'none',
              }}
            >
              <option value="">-- Pilih KPI --</option>
              {kpis.map((k: any) => (
                <option key={k.id} value={String(k.id)}>{k.label || k.title}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>Judul Target *</div>
            <input
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="cth: Selesaikan modul onboarding minggu ini"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10, boxSizing: 'border-box',
                border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontSize: 13,
                background: HP_TOKENS.card, color: HP_TOKENS.ink, outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>Deskripsi (opsional)</div>
            <input
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
              placeholder="Detail lebih lanjut..."
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10, boxSizing: 'border-box',
                border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontSize: 13,
                background: HP_TOKENS.card, color: HP_TOKENS.ink, outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 2 }}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>% Bobot Target (Porsi KPI)</div>
              <input
                type="number" min="1" value={formTargetValue}
                onChange={e => setFormTargetValue(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10, boxSizing: 'border-box',
                  border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontSize: 13,
                  background: HP_TOKENS.card, color: HP_TOKENS.ink, outline: 'none',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>Satuan</div>
              <input
                value={formUnit}
                onChange={e => setFormUnit(e.target.value)}
                placeholder="%"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10, boxSizing: 'border-box',
                  border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontSize: 13,
                  background: HP_TOKENS.card, color: HP_TOKENS.ink, outline: 'none',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>Minggu ke-</div>
              <input
                type="number" min="1" max="5" value={formWeekNumber}
                onChange={e => setFormWeekNumber(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10, boxSizing: 'border-box',
                  border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontSize: 13,
                  background: HP_TOKENS.card, color: HP_TOKENS.ink, outline: 'none',
                }}
              />
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={saving || !formKpiId || !formTitle.trim()}
            className="hp-tap"
            style={{
              width: '100%', padding: '14px', borderRadius: 12, border: 'none',
              background: `${HP_TOKENS.blue}`, color: '#fff',
              fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, cursor: 'pointer',
              opacity: (saving || !formKpiId || !formTitle.trim()) ? 0.6 : 1,
              boxShadow: '0 6px 16px rgba(123, 107, 181, 0.3)'
            }}
          >
            {saving ? 'Menyimpan...' : 'Simpan Target'}
          </button>
        </Modal>
      )}

      {/* SPLIT SCREEN LAYOUT */}
      {!showForm && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 35%) 1fr', gap: 20, alignItems: 'start' }}>
          
          {/* Master View: Daftar KPI */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {kpis.map((kpi: any) => {
              const isActive = activeKpiId === String(kpi.id);
              const targets = weeklyTargetsByKpi[String(kpi.id)] || [];
              const kpiProgressFromTargets = targets.length > 0 ? Math.round(
                targets.reduce((sum: number, t: any) => {
                  const tTasks = tasksByTarget[String(t.id)] || [];
                  return sum + (tTasks.length > 0
                    ? Math.round(tTasks.reduce((s: number, p: any) => s + (p.done ? 100 : (p.partial_progress || 0)), 0) / tTasks.length)
                    : Math.min(100, Math.round((t.currentValue / (t.targetValue || 100)) * 100)));
                }, 0) / targets.length
              ) : 0;

              return (
                <div 
                  key={kpi.id} 
                  onClick={() => setActiveKpiId(String(kpi.id))}
                  className="hp-tap"
                  style={{
                    padding: '16px', borderRadius: 16, cursor: 'pointer',
                    background: isActive ? HP_TOKENS.card : 'transparent',
                    border: `1.5px solid ${isActive ? HP_TOKENS.blue : HP_TOKENS.lineSoft}`,
                    boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.03)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, color: HP_TOKENS.ink, lineHeight: 1.3 }}>
                        {kpi.title}
                      </div>
                      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 4 }}>
                        {targets.length} Target
                      </div>
                    </div>
                    <div style={{ 
                      fontFamily: HP_FONT, fontWeight: 900, fontSize: 14, 
                      color: kpiProgressFromTargets >= 100 ? HP_TOKENS.sage : HP_TOKENS.blue 
                    }}>
                      {kpiProgressFromTargets}%
                    </div>
                  </div>
                  {/* KPI Progress Bar */}
                  <div style={{ height: 4, background: HP_TOKENS.lineSoft, borderRadius: 2, overflow: 'hidden', marginTop: 10 }}>
                    <div style={{
                      height: '100%', width: `${kpiProgressFromTargets}%`,
                      background: kpiProgressFromTargets >= 100 ? HP_TOKENS.sage : HP_TOKENS.blue,
                      borderRadius: 2, transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail View: Target & Task List */}
          <div style={{ 
            background: HP_TOKENS.card, borderRadius: 24, 
            border: `1px solid ${HP_TOKENS.lineSoft}`, overflow: 'hidden' 
          }}>
            {activeKpi ? (
              <>
                <div style={{
                  padding: '20px', 
                  borderBottom: `1px solid ${HP_TOKENS.lineSoft}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>🎯</span>
                    <div style={{ fontFamily: HP_FONT, fontWeight: 800, fontSize: 16, color: HP_TOKENS.ink }}>
                      {activeKpi.title}
                    </div>
                  </div>
                  <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute }}>
                    {activeKpi.source === 'manager' ? 'KPI dari Manager' : 'KPI Personal'}
                  </div>
                </div>

                {loadingTargets ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: HP_TOKENS.inkMute, fontFamily: HP_FONT, fontSize: 13 }}>Memuat target...</div>
                ) : activeTargets.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                    <div style={{ ...HP_TEXT.h, fontSize: 14 }}>Belum ada target untuk KPI ini.</div>
                    <div style={{ ...HP_TEXT.small, marginTop: 4, color: HP_TOKENS.inkMute }}>Buat target untuk memecah KPI menjadi langkah yang bisa dicapai.</div>
                  </div>
                ) : (
                  <div style={{ padding: '8px' }}>
                    {activeTargets.map((t: any) => {
                      const linkedTasks = tasksByTarget[String(t.id)] || [];
                      const doneTasks = linkedTasks.filter((p: any) => p.done);
                      // Calculate from current task state — not accumulated currentValue which can drift
                      const pct = linkedTasks.length > 0
                        ? Math.round(linkedTasks.reduce((s: number, p: any) => s + (p.done ? 100 : (p.partial_progress || 0)), 0) / linkedTasks.length)
                        : Math.min(100, Math.round((t.currentValue / (t.targetValue || 100)) * 100));

                      return (
                        <div key={t.id} style={{
                          padding: '16px', margin: '8px', borderRadius: 16,
                          border: `1px solid ${HP_TOKENS.lineSoft}`,
                          background: '#fff',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700 }}>MINGGU {t.weekNumber}</span>
                                {pct >= 100 && (
                                  <span style={{ fontSize: 10, background: HP_TOKENS.sageSoft, color: HP_TOKENS.sage, borderRadius: 20, padding: '2px 6px', fontFamily: HP_FONT, fontWeight: 800 }}>✓ SELESAI</span>
                                )}
                              </div>
                              <div style={{ fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, color: HP_TOKENS.ink }}>{t.title}</div>
                              {t.description && (
                                <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 4, fontSize: 12 }}>{t.description}</div>
                              )}
                            </div>
                            <button
                              onClick={() => confirmDelete(String(t.id), String(activeKpi.id))}
                              className="hp-tap"
                              style={{
                                background: HP_TOKENS.coralSoft || '#FFE5E5', border: 'none', cursor: 'pointer',
                                width: 28, height: 28, borderRadius: 14,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                              }}
                            >
                              <HPGlyph name="trash" size={14} color={HP_TOKENS.coral || '#FF4444'} />
                            </button>
                          </div>

                          <div style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-end' }}>
                              <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700 }}>
                                {linkedTasks.length > 0
                                  ? <>TASK: <span style={{ color: HP_TOKENS.ink, fontSize: 13, fontWeight: 800 }}>{doneTasks.length}/{linkedTasks.length}</span> selesai</>
                                  : <>TARGET: <span style={{ color: HP_TOKENS.ink, fontSize: 13, fontWeight: 800 }}>{pct}%</span></>
                                }
                              </span>
                              <span style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 14, color: pct >= 100 ? HP_TOKENS.sage : HP_TOKENS.blue }}>
                                {pct}%
                              </span>
                            </div>
                            <div style={{ height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', width: `${pct}%`,
                                background: pct >= 100 ? HP_TOKENS.sage : HP_TOKENS.blue,
                                borderRadius: 3, transition: 'width 0.6s ease',
                              }} />
                            </div>
                          </div>

                          {linkedTasks.length > 0 && (
                            <div style={{ 
                              marginTop: 16, padding: '12px', 
                              background: HP_TOKENS.lineSoft + '40', 
                              borderRadius: 12, border: `1px solid ${HP_TOKENS.lineSoft}`
                            }}>
                              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 8, fontWeight: 800 }}>
                                TASK TERHUBUNG · {doneTasks.length}/{linkedTasks.length} selesai
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {linkedTasks.slice(0, 5).map((p: any) => (
                                  <div
                                    key={p.id}
                                    onClick={() => {
                                      if (p.done) return;
                                      window.dispatchEvent(new CustomEvent('hp_switch_tab', { detail: 'home' }));
                                      setTimeout(() => window.dispatchEvent(new CustomEvent('hp_focus_task', { detail: { taskId: p.id } })), 150);
                                    }}
                                    style={{
                                      background: '#fff', padding: '10px 12px', borderRadius: 8,
                                      border: `1px solid ${HP_TOKENS.lineSoft}`, boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                      cursor: p.done ? 'default' : 'pointer',
                                      transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => { if (!p.done) (e.currentTarget as HTMLElement).style.background = HP_TOKENS.blueWash; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <div style={{
                                        width: 14, height: 14, borderRadius: 7, flexShrink: 0,
                                        background: p.done ? HP_TOKENS.sage : (!p.done && (p.partial_progress || 0) > 0 ? HP_TOKENS.blue + '20' : 'transparent'),
                                        border: `2px solid ${p.done ? HP_TOKENS.sage : (!p.done && (p.partial_progress || 0) > 0 ? HP_TOKENS.blue : HP_TOKENS.line)}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      }}>
                                        {p.done && <HPGlyph name="check" size={8} color="#fff" />}
                                      </div>
                                      <span style={{
                                        fontFamily: HP_FONT, fontSize: 12, fontWeight: 700, flex: 1,
                                        color: p.done ? HP_TOKENS.inkMute : HP_TOKENS.ink,
                                      }}>{p.title}</span>
                                      {!p.done && (
                                        <span style={{ fontFamily: HP_FONT, fontSize: 10, fontWeight: 800, color: HP_TOKENS.blue, flexShrink: 0 }}>
                                          {(p.partial_progress || 0) > 0 ? `${p.partial_progress}%` : '→ Selesaikan'}
                                        </span>
                                      )}
                                      {p.metric_value != null && p.done && (
                                        <span style={{ fontFamily: HP_FONT, fontSize: 10, fontWeight: 800, color: HP_TOKENS.sage, flexShrink: 0 }}>
                                          +{p.metric_value}{t.metricUnit}
                                        </span>
                                      )}
                                    </div>
                                    {!p.done && (p.partial_progress || 0) > 0 && (
                                      <div style={{ height: 4, background: '#F1F5F9', borderRadius: 2, overflow: 'hidden', marginTop: 8 }}>
                                        <div style={{
                                          height: '100%', borderRadius: 2, background: HP_TOKENS.blue, width: `${p.partial_progress}%`, transition: '0.4s ease'
                                        }} />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                              {linkedTasks.length > 5 && (
                                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 8, textAlign: 'center' }}>
                                  +{linkedTasks.length - 5} task lainnya
                                </div>
                              )}
                            </div>
                          )}

                          <button
                            onClick={() => openModal('manage_priorities', { initialGoalId: String(activeKpi.id) })}
                            className="hp-tap"
                            style={{
                              marginTop: 12, padding: '8px 14px', borderRadius: 10,
                              border: `1.5px dashed ${HP_TOKENS.line}`, background: 'transparent',
                              color: HP_TOKENS.inkSoft, fontFamily: HP_FONT, fontWeight: 700, fontSize: 11, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 6,
                            }}
                          >
                            <HPGlyph name="plus" size={10} color={HP_TOKENS.inkSoft} />
                            Tambah Task untuk Target Ini
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {targetToDelete && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <HPCard padding={24} style={{ width: '100%', maxWidth: 360, background: '#fff', borderRadius: 24 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 20, background: HP_TOKENS.coralSoft || '#FFE5E5',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <HPGlyph name="trash" size={20} color={HP_TOKENS.coral || '#FF4444'} />
              </div>
              <div>
                <div style={{ ...HP_TEXT.h, fontSize: 16 }}>Hapus Target?</div>
                <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 4 }}>
                  Target ini akan dihapus permanen. Task yang sudah terhubung akan kehilangan referensinya.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button
                onClick={() => setTargetToDelete(null)}
                className="hp-tap"
                style={{
                  flex: 1, padding: 12, borderRadius: 14, border: 'none',
                  background: HP_TOKENS.lineSoft, color: HP_TOKENS.inkSoft,
                  fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                onClick={executeDelete}
                className="hp-tap"
                style={{
                  flex: 1, padding: 12, borderRadius: 14, border: 'none',
                  background: HP_TOKENS.coral || '#FF4444', color: '#fff',
                  fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer',
                }}
              >
                Hapus
              </button>
            </div>
          </HPCard>
        </div>
      )}
    </div>
  );
}

// ── Main GoalsScreen ─────────────────────────────────────────────────────────
export default function GoalsScreen({ openModal }: GoalsScreenProps) {
  const { user } = useHP();
  const [tab, setTab] = useState<'target' | 'kpi'>('target');
  const [activeKpiId, setActiveKpiId] = useState<string | null>(null);

  // Satu sumber data KPI — dipakai oleh kedua tab
  const [kpis, setKpis] = useState<any[]>([]);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function fetchKPIs() {
      if (!user?.id) return;
      setLoadingKpis(true);
      try {
        const m = new Date().getMonth() + 1;
        const y = new Date().getFullYear();
        const [mRes, pRes] = await Promise.all([
          fetch(`/api/kpi?userId=${user.id}&role=employee&month=${m}&year=${y}`),
          fetch(`/api/kpi/personal?userId=${user.id}&month=${m}&year=${y}`),
        ]);
        const mData = await mRes.json();
        const pData = await pRes.json();

        const managerKpis = (mData.kpis || []).map((k: any) => ({
          id: String(k.id), title: k.title,
          label: `[Manager] ${k.title}`,
          source: 'manager',
          progress: k.finalScore !== null && k.finalScore !== undefined ? Number(k.finalScore) : 0,
          alignment: k.weight || 0, due: `${m}/${y}`, tone: 'lavender',
          metric: k.targetDescription || 'KPI Bulanan',
          scope: 'assigned', owner: k.assigneeName || user.name || 'You',
          ownerId: String(k.assignedTo),
          status: k.status === 'active' ? 'approved' : k.status,
          is_kpi: true, isApiKpi: true, subGoals: [],
          reviewStatus: k.reviewStatus || null,
          reviewNote: k.reviewNote || null,
          penaltyPct: k.penaltyPct || 0,
        }));

        const personalKpis = (pData.kpis || []).map((k: any) => ({
          id: String(k.id), title: k.title,
          label: `[Personal] ${k.title}`,
          source: 'personal',
          progress: k.progress || 0,
          alignment: 0, due: `${m}/${y}`, tone: 'sage',
          metric: k.targetDescription || `${k.currentValue || 0}/${k.targetValue || 0} ${k.metricUnit || ''}`,
          scope: 'personal', owner: user.name || 'You', ownerId: String(user.id),
          status: k.status || 'active', is_kpi: true, isApiKpi: true, subGoals: [],
        }));

        setKpis([...managerKpis, ...personalKpis]);
      } catch (e) {
        console.error("Failed to load KPIs:", e);
      } finally {
        setLoadingKpis(false);
      }
    }
    fetchKPIs();
  }, [user?.id]);

  useEffect(() => { setCurrentPage(1); }, [tab]);

  const handleEditProgress = async (kpiId: string, progress: number) => {
    try {
      const res = await fetch('/api/kpi', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kpiId, finalScore: progress }),
      });
      if (res.ok) setKpis(prev => prev.map(k => String(k.id) === String(kpiId) ? { ...k, progress } : k));
    } catch (e) { console.error(e); }
  };

  const goalsPerPage = 5;
  const totalPages = Math.ceil(kpis.length / goalsPerPage);
  const activePage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedGoals = useMemo(() => {
    const start = (activePage - 1) * goalsPerPage;
    return kpis.slice(start, start + goalsPerPage);
  }, [kpis, activePage]);

  if (!user) return null;

  return (
    <div style={{ padding: '0 16px 120px', fontFamily: HP_FONT }}>
      <ScreenHeader title="Target & KPI" subtitle="Pecah KPI-mu menjadi target mingguan yang terukur" />

      {user?.role === 'manager' && <ReviewTaskWidget />}

      {/* Tab Bar */}
      <div style={{ 
        display: 'flex', background: HP_TOKENS.lineSoft, padding: 4, borderRadius: 16, marginBottom: 24 
      }}>
        {[
          { key: 'target', label: '📋 Target' },
          { key: 'kpi', label: '🎯 KPI' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className="hp-tap"
            style={{
              flex: 1, padding: '12px 8px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: tab === t.key ? '#fff' : 'transparent',
              color: tab === t.key ? HP_TOKENS.ink : HP_TOKENS.inkSoft,
              fontFamily: HP_FONT, fontWeight: 800, fontSize: 14,
              boxShadow: tab === t.key ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Target tab — pakai kpis dari parent */}
      {tab === 'target' && <TargetTab openModal={openModal} kpis={kpis} activeKpiId={activeKpiId} setActiveKpiId={setActiveKpiId} />}

      {/* KPI tab — pakai kpis yang sama */}
      {tab === 'kpi' && (
        <>
          <SectionHeader icon="target" label="KPI BULAN INI" count={String(kpis.length)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loadingKpis && kpis.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: HP_TOKENS.inkMute, fontFamily: HP_FONT }}>Memuat KPI...</div>
            )}
            {!loadingKpis && kpis.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: HP_TOKENS.card, borderRadius: 24, border: `1.5px solid ${HP_TOKENS.lineSoft}` }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🌱</div>
                <div style={{ ...HP_TEXT.h, fontSize: 14 }}>Belum ada KPI bulan ini.</div>
                <div style={{ ...HP_TEXT.small, marginTop: 4 }}>Hubungi manager untuk mendapatkan KPI.</div>
              </div>
            )}
            {paginatedGoals.map((g: any) => (
              <GoalCard
                key={g.id}
                g={g}
                isReadOnly={g.isApiKpi}
                onEditProgress={user?.role === 'manager' ? (p) => handleEditProgress(g.id, p) : undefined}
                onViewDetails={() => {
                  setActiveKpiId(String(g.id));
                  setTab('target');
                }}
              />
            ))}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={activePage === 1}
                  style={{ padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`, background: activePage === 1 ? HP_TOKENS.lineSoft : '#fff', color: activePage === 1 ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft, fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, cursor: activePage === 1 ? 'default' : 'pointer', opacity: activePage === 1 ? 0.6 : 1 }}
                >Sebelumnya</button>
                <span style={{ fontFamily: HP_FONT, fontSize: 13, fontWeight: 700, color: HP_TOKENS.inkSoft }}>{activePage} / {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={activePage === totalPages}
                  style={{ padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`, background: activePage === totalPages ? HP_TOKENS.lineSoft : '#fff', color: activePage === totalPages ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft, fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, cursor: activePage === totalPages ? 'default' : 'pointer', opacity: activePage === totalPages ? 0.6 : 1 }}
                >Berikutnya</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
