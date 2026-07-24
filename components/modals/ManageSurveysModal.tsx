"use client";

import React, { useState, useEffect } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import Modal from "@/components/ui/Modal";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";

interface ManageSurveysModalProps {
  onClose: () => void;
  editId?: number;
  openModal?: (name: string, props?: any) => void;
}

const QUESTION_TYPES = [
  { key: 'text', label: 'Teks Singkat', icon: '📝' },
  { key: 'paragraph', label: 'Teks Panjang', icon: '📄' },
  { key: 'rating', label: 'Rating (1-5)', icon: '⭐' },
  { key: 'yes_no', label: 'Ya/Tidak', icon: '✅' },
  { key: 'multiple_choice', label: 'Pilihan Ganda', icon: '🔘' },
];

interface Question {
  id: string;
  question: string;
  type: string;
  required: boolean;
  options?: string[];
  maxRating?: number;
}

export default function ManageSurveysModal({ onClose, editId, openModal }: ManageSurveysModalProps) {
  const { state, user, refreshSurveys } = useHP();
  
  const [view, setView] = useState<'list' | 'builder'>('list');
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Builder state
  const [editingId, setEditingId] = useState<number | null>(editId || null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [targetAudience, setTargetAudience] = useState<'company' | 'department'>('company');
  const [targetDepts, setTargetDepts] = useState<string[]>([]);
  const [deptSearch, setDeptSearch] = useState('');
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);

  // Departments list
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    fetchSurveys();
    fetchDepartments();
    if (editId) {
      setView('builder');
    }
  }, []);

  const fetchSurveys = async () => {
    try {
      const res = await fetch('/api/hr/surveys');
      const data = await res.json();
      setSurveys(data.surveys || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      const depts = Array.from(new Set((data.users || []).map((u: any) => u.department).filter(Boolean))) as string[];
      setDepartments(depts);
    } catch (e) { console.error(e); }
  };

  const loadSurveyForEdit = (survey: any) => {
    setEditingId(survey.id);
    setTitle(survey.title || '');
    setDescription(survey.description || '');
    setDeadline(survey.deadline || '');
    setTargetAudience(survey.target_audience || 'company');
    setTargetDepts(survey.target_departments || []);
    setQuestions(survey.questions || []);
    setView('builder');
  };

  const resetBuilder = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setDeadline('');
    setTargetAudience('company');
    setTargetDepts([]);
    setQuestions([]);
  };

  // Question CRUD
  const addQuestion = (type: string) => {
    const newQ: Question = {
      id: `q_${Date.now()}`,
      question: '',
      type,
      required: true,
      ...(type === 'multiple_choice' ? { options: ['Opsi 1', 'Opsi 2'] } : {}),
      ...(type === 'rating' ? { maxRating: 5 } : {}),
    };
    setQuestions([...questions, newQ]);
  };

  const updateQuestion = (id: string, field: string, value: any) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const moveQuestion = (index: number, dir: -1 | 1) => {
    const newQ = [...questions];
    const target = index + dir;
    if (target < 0 || target >= newQ.length) return;
    [newQ[index], newQ[target]] = [newQ[target], newQ[index]];
    setQuestions(newQ);
  };

  const addOption = (qId: string) => {
    setQuestions(questions.map(q =>
      q.id === qId ? { ...q, options: [...(q.options || []), `Opsi ${(q.options?.length || 0) + 1}`] } : q
    ));
  };

  const updateOption = (qId: string, optIndex: number, value: string) => {
    setQuestions(questions.map(q =>
      q.id === qId ? { ...q, options: q.options?.map((o, i) => i === optIndex ? value : o) } : q
    ));
  };

  const removeOption = (qId: string, optIndex: number) => {
    setQuestions(questions.map(q =>
      q.id === qId ? { ...q, options: q.options?.filter((_, i) => i !== optIndex) } : q
    ));
  };

  // Save
  const saveSurvey = async () => {
    if (!title || questions.length === 0 || questions.some(q => !q.question.trim())) return;
    setSaving(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const body: any = {
        title, description, deadline,
        target_audience: targetAudience,
        target_departments: targetAudience === 'department' ? targetDepts : null,
        questions,
        created_by: user?.id,
      };
      if (editingId) body.id = editingId;

      const res = await fetch('/api/hr/surveys', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        resetBuilder();
        setView('list');
        await fetchSurveys();
        refreshSurveys();
      }
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const deleteSurvey = async (id: number) => {
    if (!confirm("Hapus survey beserta semua responsnya?")) return;
    try {
      await fetch(`/api/hr/surveys?id=${id}`, { method: 'DELETE' });
      await fetchSurveys();
      refreshSurveys();
    } catch (e) { console.error(e); }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: 12,
    border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontSize: 14,
    outline: 'none', background: HP_TOKENS.card, color: HP_TOKENS.ink, boxSizing: 'border-box',
  };

  // ── LIST VIEW ──
  if (view === 'list') {
    return (
      <Modal onClose={onClose} title="📋 Kelola Survey">
        <div style={{ marginTop: 4 }}>
          {/* Create button */}
          <button onClick={() => { resetBuilder(); setView('builder'); }} className="hp-tap" style={{
            width: '100%', padding: '16px', borderRadius: 16, border: 'none',
            background: `${HP_TOKENS.lavender}`,
            color: '#F4F7F9', fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            marginBottom: 20, boxShadow: '0 6px 20px rgba(123,107,181,0.3)',
          }}>
            <HPGlyph name="plus" size={18} color="#F4F7F9" />
            Buat Survey Baru
          </button>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 30, color: HP_TOKENS.inkMute }}>Memuat...</div>
          ) : surveys.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: HP_TOKENS.lineSoft, borderRadius: 20, border: `1.5px dashed ${HP_TOKENS.line}` }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
              <div style={{ ...HP_TEXT.h, fontSize: 14, color: HP_TOKENS.inkMute }}>Belum ada survey</div>
            </div>
          ) : (() => {
            const itemsPerPage = 5;
            const totalPages = Math.ceil(surveys.length / itemsPerPage);
            const paginatedSurveys = surveys.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

            return (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {paginatedSurveys.map(sr => (
                    <HPCard key={sr.id} padding={14} style={{ border: `1.5px solid ${sr.status === 'active' ? `${HP_TOKENS.sage}40` : HP_TOKENS.line}` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{
                          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                          background: sr.status === 'active' ? HP_TOKENS.lavenderSoft : HP_TOKENS.lineSoft,
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <HPGlyph name="book" size={20} color={sr.status === 'active' ? HP_TOKENS.lavender : HP_TOKENS.inkMute} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ ...HP_TEXT.h, fontSize: 14 }}>{sr.title}</div>
                            <div style={{
                              padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 900,
                              background: sr.status === 'active' ? HP_TOKENS.sageWash : HP_TOKENS.lineSoft,
                              color: sr.status === 'active' ? HP_TOKENS.sage : HP_TOKENS.inkMute,
                              fontFamily: HP_FONT
                            }}>
                              {(sr.status || 'active').toUpperCase()}
                            </div>
                          </div>
                          {sr.description && (
                            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft, marginTop: 2, fontSize: 12 }}>
                              {sr.description}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>
                              📊 {sr.response_count || 0} responden
                            </div>
                            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>
                              ❓ {sr.questions?.length || 0} pertanyaan
                            </div>
                            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, cursor: 'help', display: 'flex', alignItems: 'center', gap: 4 }} title={sr.target_audience === 'department' ? (sr.target_departments || []).join(', ') : ''}>
                              🎯 {sr.target_audience === 'department' 
                                  ? `${(sr.target_departments || []).length} Divisi` 
                                  : 'Seluruh Perusahaan'}
                              {sr.target_audience === 'department' && <span style={{ fontSize: 10 }}>ℹ️</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                        {(sr.response_count || 0) > 0 && (
                          <button onClick={() => openModal?.('survey_results', { surveyId: sr.id })} className="hp-tap" style={{
                            flex: 1, padding: '8px', borderRadius: 10, border: `1.5px solid ${HP_TOKENS.blue}40`,
                            background: HP_TOKENS.blueSoft, color: HP_TOKENS.blue,
                            fontFamily: HP_FONT, fontWeight: 800, fontSize: 11, cursor: 'pointer',
                          }}>
                            📊 Lihat Hasil
                          </button>
                        )}
                        <button onClick={() => loadSurveyForEdit(sr)} className="hp-tap" style={{
                          flex: 1, padding: '8px', borderRadius: 10, border: `1.5px solid ${HP_TOKENS.line}`,
                          background: HP_TOKENS.card, color: HP_TOKENS.inkSoft,
                          fontFamily: HP_FONT, fontWeight: 800, fontSize: 11, cursor: 'pointer',
                        }}>
                          ✏️ Edit
                        </button>
                        <button onClick={() => deleteSurvey(sr.id)} className="hp-tap" style={{
                          padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${HP_TOKENS.coral}40`,
                          background: HP_TOKENS.coralSoft, color: HP_TOKENS.coral,
                          fontFamily: HP_FONT, fontWeight: 800, fontSize: 11, cursor: 'pointer',
                        }}>
                          🗑
                        </button>
                      </div>
                    </HPCard>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 20 }}>
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={{
                        padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
                        background: currentPage === 1 ? HP_TOKENS.lineSoft : '#fff',
                        color: currentPage === 1 ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
                        fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, 
                        cursor: currentPage === 1 ? 'default' : 'pointer',
                        opacity: currentPage === 1 ? 0.6 : 1, transition: 'all 0.2s'
                      }}
                    >
                      Sebelumnya
                    </button>
                    <span style={{ fontFamily: HP_FONT, fontSize: 13, fontWeight: 700, color: HP_TOKENS.inkSoft }}>
                      {currentPage} / {totalPages}
                    </span>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
                        background: currentPage === totalPages ? HP_TOKENS.lineSoft : '#fff',
                        color: currentPage === totalPages ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
                        fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, 
                        cursor: currentPage === totalPages ? 'default' : 'pointer',
                        opacity: currentPage === totalPages ? 0.6 : 1, transition: 'all 0.2s'
                      }}
                    >
                      Berikutnya
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </Modal>
    );
  }

  // ── BUILDER VIEW ──
  return (
    <Modal onClose={() => { resetBuilder(); setView('list'); }} title={editingId ? "✏️ Edit Survey" : "📝 Buat Survey Baru"}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 4 }}>
        {/* Title & Description */}
        <div>
          <label style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700, marginBottom: 6, display: 'block' }}>JUDUL SURVEY *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Contoh: Employee Engagement Q2 2026" style={inputStyle} />
        </div>
        <div>
          <label style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700, marginBottom: 6, display: 'block' }}>DESKRIPSI (OPSIONAL)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Jelaskan tujuan survey ini..." style={{ ...inputStyle, minHeight: 60, resize: 'none' }} />
        </div>

        {/* Target + Deadline */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <label style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700, marginBottom: 6, display: 'block' }}>TARGET</label>
            <div 
              onClick={() => setShowDeptDropdown(!showDeptDropdown)}
              style={{ ...inputStyle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>{targetAudience === 'company' ? '🏢 Seluruh Perusahaan' : `👥 Divisi Tertentu (${targetDepts.length})`}</span>
              <HPGlyph name="arrowDown" size={14} color={HP_TOKENS.inkMute} />
            </div>

            {showDeptDropdown && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 10,
                background: HP_TOKENS.card, borderRadius: 14, padding: 12,
                boxShadow: '0 4px 20px rgba(26,29,35,0.1)', border: `1.5px solid ${HP_TOKENS.blue}30`,
              }}>
                <div 
                  onClick={() => { setTargetAudience('company'); setTargetDepts([]); setShowDeptDropdown(false); }}
                  style={{ 
                    padding: '8px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 8,
                    background: targetAudience === 'company' ? HP_TOKENS.blue : 'transparent',
                    color: targetAudience === 'company' ? '#fff' : HP_TOKENS.ink,
                    fontFamily: HP_FONT, fontSize: 13, fontWeight: targetAudience === 'company' ? 700 : 500
                  }}
                >
                  🏢 Seluruh Perusahaan
                </div>
                
                <div style={{ height: 1, background: HP_TOKENS.lineSoft, margin: '8px 0' }} />
                
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.blue, fontWeight: 800, marginBottom: 8 }}>👥 DIVISI TERTENTU:</div>
                
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: HP_TOKENS.blueWash, borderRadius: 10, padding: '8px 12px', marginBottom: 12,
                  border: `1px solid ${HP_TOKENS.blue}40`,
                }}>
                  <HPGlyph name="search" size={14} color={HP_TOKENS.blue} />
                  <input
                    value={deptSearch} onChange={e => setDeptSearch(e.target.value)}
                    placeholder="Cari divisi..."
                    style={{
                      flex: 1, background: 'none', border: 'none', outline: 'none',
                      fontFamily: HP_FONT, fontWeight: 700, fontSize: 13, color: HP_TOKENS.ink,
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 150, overflowY: 'auto' }}>
                  {departments.filter(d => d.toLowerCase().includes(deptSearch.toLowerCase())).map(d => (
                    <label key={d} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                      borderRadius: 8, background: targetDepts.includes(d) ? HP_TOKENS.blue : '#fff',
                      color: targetDepts.includes(d) ? '#fff' : HP_TOKENS.ink,
                      cursor: 'pointer', fontFamily: HP_FONT, fontSize: 13, fontWeight: 600,
                      transition: '0.2s', border: `1px solid ${targetDepts.includes(d) ? HP_TOKENS.blue : HP_TOKENS.lineSoft}`
                    }}>
                      <input 
                        type="checkbox" 
                        checked={targetDepts.includes(d)}
                        onChange={() => {
                          setTargetAudience('department');
                          setTargetDepts(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
                        }}
                        style={{ margin: 0, accentColor: '#fff' }}
                      />
                      {d}
                    </label>
                  ))}
                  {departments.filter(d => d.toLowerCase().includes(deptSearch.toLowerCase())).length === 0 && (
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, textAlign: 'center', padding: 10 }}>Tidak ada divisi.</div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700, marginBottom: 6, display: 'block' }}>DEADLINE</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {/* Questions */}
        <div>
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, letterSpacing: 1, marginBottom: 10 }}>
            PERTANYAAN ({questions.length})
          </div>

          {questions.map((q, idx) => (
            <div key={q.id} style={{
              padding: '14px', borderRadius: 16, marginBottom: 10,
              background: HP_TOKENS.card, border: `1.5px solid ${HP_TOKENS.line}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 8, background: HP_TOKENS.lavenderSoft,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 900, color: HP_TOKENS.lavender, fontFamily: HP_FONT
                }}>{idx + 1}</div>
                <div style={{ flex: 1, ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800 }}>
                  {QUESTION_TYPES.find(t => t.key === q.type)?.icon} {QUESTION_TYPES.find(t => t.key === q.type)?.label}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => moveQuestion(idx, -1)} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: idx === 0 ? 0.3 : 1 }}>
                    <HPGlyph name="arrowUp" size={12} color={HP_TOKENS.inkMute} />
                  </button>
                  <button onClick={() => moveQuestion(idx, 1)} disabled={idx === questions.length - 1} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: idx === questions.length - 1 ? 0.3 : 1 }}>
                    <HPGlyph name="arrowDown" size={12} color={HP_TOKENS.inkMute} />
                  </button>
                  <button onClick={() => removeQuestion(q.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                    <HPGlyph name="trash" size={12} color={HP_TOKENS.coral} />
                  </button>
                </div>
              </div>
              <input
                value={q.question}
                onChange={e => updateQuestion(q.id, 'question', e.target.value)}
                placeholder="Tulis pertanyaan..."
                style={{ ...inputStyle, marginBottom: 8 }}
              />

              {/* Multiple choice options */}
              {q.type === 'multiple_choice' && q.options && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                  {q.options.map((opt, oi) => (
                    <div key={oi} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <div style={{ width: 14, height: 14, borderRadius: 7, border: `2px solid ${HP_TOKENS.line}` }} />
                      <input value={opt} onChange={e => updateOption(q.id, oi, e.target.value)} style={{ ...inputStyle, flex: 1, padding: '8px 12px', fontSize: 13 }} />
                      {(q.options?.length || 0) > 2 && (
                        <button onClick={() => removeOption(q.id, oi)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                          <HPGlyph name="close" size={12} color={HP_TOKENS.coral} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => addOption(q.id)} style={{
                    background: 'none', border: `1.5px dashed ${HP_TOKENS.line}`, borderRadius: 8,
                    padding: '6px', cursor: 'pointer', fontFamily: HP_FONT, fontSize: 11,
                    fontWeight: 700, color: HP_TOKENS.blue,
                  }}>+ Tambah Opsi</button>
                </div>
              )}

              {/* Required toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => updateQuestion(q.id, 'required', !q.required)} style={{
                  width: 34, height: 18, borderRadius: 9, border: 'none', cursor: 'pointer', position: 'relative',
                  background: q.required ? HP_TOKENS.sage : HP_TOKENS.lineSoft, transition: '0.2s',
                }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: 7, background: HP_TOKENS.card,
                    position: 'absolute', top: 2, left: q.required ? 18 : 2, transition: '0.2s',
                    boxShadow: '0 1px 2px rgba(26,29,35,0.2)',
                  }} />
                </button>
                <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>Wajib diisi</span>
              </div>
            </div>
          ))}

          {/* Add question buttons */}
          <div style={{
            padding: '12px', borderRadius: 16, border: `1.5px dashed ${HP_TOKENS.lavender}50`,
            background: HP_TOKENS.lavenderSoft,
          }}>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.lavender, fontWeight: 800, marginBottom: 8 }}>+ TAMBAH PERTANYAAN</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {QUESTION_TYPES.map(t => (
                <button key={t.key} onClick={() => addQuestion(t.key)} className="hp-tap" style={{
                  padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${HP_TOKENS.lavender}30`,
                  background: HP_TOKENS.card, fontFamily: HP_FONT, fontWeight: 700, fontSize: 11,
                  color: HP_TOKENS.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { resetBuilder(); setView('list'); }} style={{
            flex: 1, padding: '14px', borderRadius: 14, border: `1.5px solid ${HP_TOKENS.line}`,
            background: HP_TOKENS.card, color: HP_TOKENS.inkSoft,
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, cursor: 'pointer',
          }}>
            Batal
          </button>
          <button onClick={saveSurvey} disabled={!title || questions.length === 0 || saving} className="hp-tap" style={{
            flex: 2, padding: '14px', borderRadius: 14, border: 'none',
            background: (!title || questions.length === 0 || saving) ? HP_TOKENS.lineSoft : HP_TOKENS.lavender,
            color: (!title || questions.length === 0 || saving) ? HP_TOKENS.inkMute : '#fff',
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <HPGlyph name={editingId ? "sparkle" : "plus"} size={16} color="#F4F7F9" />
            {saving ? "Menyimpan..." : editingId ? "Update Survey" : "Terbitkan Survey"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
