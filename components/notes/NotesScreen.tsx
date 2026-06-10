"use client";

import React, { useState, useMemo, useEffect } from "react";
import useSWR from 'swr';
import { Editor } from '@tinymce/tinymce-react';
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import ScreenHeader from "@/components/ui/ScreenHeader";
import HPAvatar from "@/components/ui/HPAvatar";

const NOTE_THEMES = [
  { id: 'yellow', bg: '#FFF9E6', border: '#F59F00', blob: '#FFE8A1', label: 'Kuning' },
  { id: 'blue', bg: '#EBF5FF', border: '#339AF0', blob: '#A5D8FF', label: 'Biru' },
  { id: 'green', bg: '#EBFBEE', border: '#51CF66', blob: '#B2F2BB', label: 'Hijau' },
  { id: 'purple', bg: '#F3F0FF', border: '#845EF7', blob: '#D0BFFF', label: 'Ungu' },
  { id: 'pink', bg: '#FFF0F6', border: '#F06595', blob: '#FCC2D7', label: 'Pink' },
];

export default function NotesScreen() {
  const { user } = useHP();
  
  // Fetch with SWR for offline caching and automatic revalidation
  const { data: notesRes, mutate: mutateNotes } = useSWR(user?.id ? `/api/notes?userId=${user.id}` : null);
  const { data: usersRes } = useSWR('/api/users');

  const notes: any[] = notesRes?.notes || [];
  const allUsers: any[] = (usersRes?.users || []).filter((u: any) => String(u.id) !== String(user?.id));
  const loading = !notesRes || !usersRes;

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [newNote, setNewNote] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [sharedPermission, setSharedPermission] = useState('view');
  const [sharedUsers, setSharedUsers] = useState<string[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteColor, setNoteColor] = useState('yellow');
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [showVisibilityDropdown, setShowVisibilityDropdown] = useState(false);
  const [showPermissionDropdown, setShowPermissionDropdown] = useState(false);

  // Users & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const addNote = async () => {
    if (!newNote.trim()) return;
    try {
      const payload: any = {
        userId: user?.id,
        title: noteTitle.trim() || undefined,
        content: newNote,
        color: noteColor,
      };
      
      if (visibility === 'private' || visibility === 'company') {
        payload.visibility = visibility;
        payload.sharedPermission = visibility === 'private' ? 'view' : sharedPermission;
      } else if (visibility === 'custom') {
        payload.visibility = 'custom';
        payload.sharedPermission = sharedPermission;
        payload.sharedWithUsers = sharedUsers;
      }

      if (editingNoteId) {
        payload.noteId = editingNoteId;
      }
      
      const res = await fetch('/api/notes', {
        method: editingNoteId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        await mutateNotes();
        
        cancelForm();

        if (typeof window !== "undefined") {
          window.postMessage({ type: "FLOWBEE_WEBSITE_UPDATE" }, "*");
        }
      }
    } catch (e) {
      console.error('Failed to add note', e);
    }
  };

  const deleteNote = async () => {
    if (!noteToDelete) return;
    try {
      await fetch(`/api/notes?noteId=${noteToDelete}&userId=${user?.id}`, {
        method: 'DELETE',
      });
      await mutateNotes();
      setNoteToDelete(null);
      if (typeof window !== "undefined") {
        window.postMessage({ type: "FLOWBEE_WEBSITE_UPDATE" }, "*");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startEdit = async (note: any) => {
    await fetch('/api/notes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'lock', noteId: note.id, userId: user?.id })
    });
    await mutateNotes();

    setEditingNoteId(note.id);
    setNoteTitle(note.title || '');
    setNewNote(note.content);
    setNoteColor(note.color || 'yellow');
    setSharedPermission(note.sharedPermission || 'view');
    
    if (note.visibility === 'custom' || note.visibility === 'division') {
      setVisibility('custom');
      // Gather users from division + specific users
      const toSelect: string[] = [];
      if (note.sharedWithDivisions && note.sharedWithDivisions.length > 0) {
        note.sharedWithDivisions.forEach((dept: string) => {
          allUsers.filter((u: any) => u.department === dept).forEach((u: any) => toSelect.push(String(u.id)));
        });
      }
      if (note.sharedWithUsers && note.sharedWithUsers.length > 0) {
        note.sharedWithUsers.forEach((uid: string) => toSelect.push(String(uid)));
      }
      setSharedUsers([...new Set(toSelect)]);
    } else {
      setVisibility(note.visibility || 'private');
      setSharedUsers([]);
    }
    
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelForm = async () => {
    if (editingNoteId) {
      await fetch('/api/notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlock', noteId: editingNoteId, userId: user?.id })
      });
      await mutateNotes();
    }
    setEditingNoteId(null);
    setNoteTitle('');
    setNewNote('');
    setNoteColor('yellow');
    setVisibility('private');
    setSharedPermission('view');
    setSharedUsers([]);
    setSearchUser('');
    setShowForm(false);
  };

  const isNoteLocked = (note: any) => {
    if (!note.lockedBy) return false;
    if (String(note.lockedBy) === String(user?.id)) return false;
    if (!note.lockedAt) return false;
    const diff = new Date().getTime() - new Date(note.lockedAt).getTime();
    return diff < 15 * 60 * 1000;
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const filteredNotes = notes.filter((n: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (n.title && n.title.toLowerCase().includes(q)) || 
           (n.content && n.content.toLowerCase().includes(q)) ||
           (n.authorName && n.authorName.toLowerCase().includes(q));
  });

  const notesPerPage = 5;
  const totalPagesNotes = Math.ceil(filteredNotes.length / notesPerPage);
  const activePageNotes = Math.min(currentPage, Math.max(1, totalPagesNotes));
  
  const paginatedNotes = useMemo(() => {
    const start = (activePageNotes - 1) * notesPerPage;
    return filteredNotes.slice(start, start + notesPerPage);
  }, [filteredNotes, activePageNotes]);

  const groupedNotes = useMemo(() => {
    return paginatedNotes.reduce((acc: Record<string, any[]>, note: any) => {
      const d = new Date(note.createdAt);
      const dateKey = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(note);
      return acc;
    }, {} as Record<string, any[]>);
  }, [paginatedNotes]);

  // Group Users logic
  const usersByDept = useMemo(() => {
    const map: Record<string, any[]> = {};
    const filtered = allUsers.filter((u: any) =>
      u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.department?.toLowerCase().includes(searchUser.toLowerCase())
    );
    filtered.forEach((u: any) => {
      const dept = u.department || 'Lainnya';
      if (!map[dept]) map[dept] = [];
      map[dept].push(u);
    });
    return map;
  }, [allUsers, searchUser]);

  const deptNames = Object.keys(usersByDept).sort();

  const toggleUser = (uid: string) => {
    setSharedUsers(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  const selectAllInDept = (dept: string) => {
    const deptUserIds = (usersByDept[dept] || []).map((u: any) => String(u.id));
    const allSelected = deptUserIds.every(id => sharedUsers.includes(id));
    if (allSelected) {
      setSharedUsers(prev => prev.filter(id => !deptUserIds.includes(id)));
    } else {
      setSharedUsers(prev => [...new Set([...prev, ...deptUserIds])]);
    }
  };

  const toggleDeptCollapse = (dept: string) => {
    setCollapsedDepts(prev => {
      const n = new Set(prev);
      n.has(dept) ? n.delete(dept) : n.add(dept);
      return n;
    });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '16px 20px', borderRadius: 16,
    border: `1.5px solid ${HP_TOKENS.lineSoft}`, fontFamily: HP_FONT, fontSize: 15,
    outline: 'none', background: HP_TOKENS.card, color: HP_TOKENS.ink, boxSizing: 'border-box',
    transition: 'all 0.2s ease'
  };

  if (showForm) {
    return (
      <div style={{ padding: '0 16px 120px', fontFamily: HP_FONT }}>
        <ScreenHeader 
          title={editingNoteId ? "✏️ Edit Catatan" : "📝 Catatan Baru"} 
          subtitle="Tulis, simpan, dan bagikan ide cemerlangmu." 
        />

        <style>{`
          .hp-native-select {
            color-scheme: light dark;
          }
          .hp-native-select option {
            background-color: var(--hp-card);
            color: var(--hp-ink);
            padding: 12px;
          }
          .hp-user-list::-webkit-scrollbar {
            width: 6px;
          }
          .hp-user-list::-webkit-scrollbar-thumb {
            background: var(--hp-lineSoft);
            border-radius: 6px;
          }
          .hp-notes-actions {
            display: flex;
            justify-content: flex-end;
            gap: 16px;
            margin-top: 24px;
            flex-wrap: wrap;
          }
          @media (max-width: 600px) {
            .hp-notes-actions {
              flex-direction: column-reverse;
            }
            .hp-notes-actions button {
              width: 100% !important;
              justify-content: center;
            }
          }
        `}</style>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* SECTION 1: AKSES & BAGIKAN CATATAN */}
          <div style={{ 
            background: HP_TOKENS.card, borderRadius: 24, padding: 24, 
            border: `1.5px solid ${HP_TOKENS.line}`, 
            boxShadow: '0 8px 24px rgba(26,29,35,0.03)'
          }}>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 16, letterSpacing: 0.5 }}>
              AKSES & BAGIKAN CATATAN
            </div>
            
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', position: 'relative' }}>
                <div 
                  onClick={() => setShowVisibilityDropdown(!showVisibilityDropdown)}
                  style={{ ...inputStyle, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
                >
                  <span>
                    {visibility === 'private' ? '🔒 Pribadi (Hanya Saya)' : 
                     visibility === 'company' ? '🏢 Seluruh Perusahaan' : 
                     '👥 Pilih Anggota Spesifik...'}
                  </span>
                  <HPGlyph name="chevron-down" size={16} color={HP_TOKENS.inkMute} />
                </div>
                {showVisibilityDropdown && (
                  <>
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }} onClick={() => setShowVisibilityDropdown(false)} />
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(26,29,35,0.12)', border: `1px solid ${HP_TOKENS.line}`, zIndex: 101, maxHeight: 250, overflowY: 'auto', padding: 8 }}>
                      {[
                        { value: 'private', label: '🔒 Pribadi (Hanya Saya)' },
                        { value: 'company', label: '🏢 Seluruh Perusahaan' },
                        { value: 'custom', label: '👥 Pilih Anggota Spesifik...' }
                      ].map(o => (
                        <div 
                          key={o.value} className="hp-tap"
                          onClick={() => { setVisibility(o.value); setSharedUsers([]); setShowVisibilityDropdown(false); }}
                          style={{
                            padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                            background: visibility === o.value ? HP_TOKENS.blueWash : 'transparent',
                            color: visibility === o.value ? HP_TOKENS.blue : HP_TOKENS.ink,
                            ...HP_TEXT.body, fontSize: 13, fontWeight: visibility === o.value ? 700 : 500,
                            marginBottom: 4
                          }}
                        >
                          {o.label}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              
              {visibility !== 'private' && (
                <div style={{ flex: '1 1 120px', position: 'relative' }}>
                  <div 
                    onClick={() => setShowPermissionDropdown(!showPermissionDropdown)}
                    style={{ ...inputStyle, fontWeight: 700, padding: '16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
                  >
                    <span>
                      {sharedPermission === 'view' ? '👁️ Bisa Lihat' : '✏️ Bisa Ikut Edit'}
                    </span>
                    <HPGlyph name="chevron-down" size={16} color={HP_TOKENS.inkMute} />
                  </div>
                  {showPermissionDropdown && (
                    <>
                      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }} onClick={() => setShowPermissionDropdown(false)} />
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(26,29,35,0.12)', border: `1px solid ${HP_TOKENS.line}`, zIndex: 101, maxHeight: 250, overflowY: 'auto', padding: 8 }}>
                        {[
                          { value: 'view', label: '👁️ Bisa Lihat' },
                          { value: 'edit', label: '✏️ Bisa Ikut Edit' }
                        ].map(o => (
                          <div 
                            key={o.value} className="hp-tap"
                            onClick={() => { setSharedPermission(o.value); setShowPermissionDropdown(false); }}
                            style={{
                              padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                              background: sharedPermission === o.value ? HP_TOKENS.blueWash : 'transparent',
                              color: sharedPermission === o.value ? HP_TOKENS.blue : HP_TOKENS.ink,
                              ...HP_TEXT.body, fontSize: 13, fontWeight: sharedPermission === o.value ? 700 : 500,
                              marginBottom: 4
                            }}
                          >
                            {o.label}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {visibility === 'custom' && (
              <div style={{ 
                marginTop: 20, padding: 24, background: HP_TOKENS.paper, 
                border: `1.5px solid ${HP_TOKENS.line}`, borderRadius: 20 
              }}>
                {sharedUsers.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '16px',
                    borderRadius: 16, background: HP_TOKENS.blueWash, marginBottom: 20 }}>
                    {sharedUsers.map(uid => {
                      const u = allUsers.find((x: any) => String(x.id) === uid);
                      return u ? (
                        <span key={uid} onClick={() => toggleUser(uid)} style={{
                          padding: '8px 16px', borderRadius: 12, fontSize: 13, fontWeight: 800,
                          cursor: 'pointer', fontFamily: HP_FONT, border: 'none',
                          background: HP_TOKENS.blue, color: '#F4F7F9',
                          display: 'inline-flex', alignItems: 'center', gap: 6
                        }}>
                          {u.name.split(' ')[0]} 
                          <HPGlyph name="close" size={14} color="#F4F7F9" />
                        </span>
                      ) : null;
                    })}
                  </div>
                )}

                <input value={searchUser} onChange={e => setSearchUser(e.target.value)}
                  placeholder="🔍 Cari nama atau departemen..."
                  style={{ ...inputStyle, padding: '16px 20px', borderRadius: 16, marginBottom: 20 }} />

                <div className="hp-user-list" style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 8 }}>
                  {deptNames.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 20, color: HP_TOKENS.inkMute }}>Tidak ditemukan</div>
                  ) : (
                    deptNames.map(dept => {
                      const deptUsers = usersByDept[dept];
                      const isCollapsed = collapsedDepts.has(dept);
                      const allInDeptSelected = deptUsers.every((u: any) => sharedUsers.includes(String(u.id)));
                      const someInDeptSelected = deptUsers.some((u: any) => sharedUsers.includes(String(u.id)));

                      return (
                        <div key={dept} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 16px', borderRadius: 16,
                            background: HP_TOKENS.card, border: `1.5px solid ${HP_TOKENS.lineSoft}`
                          }}>
                            <button onClick={(e) => { e.preventDefault(); toggleDeptCollapse(dept); }} className="hp-tap" style={{
                              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                              display: 'flex', alignItems: 'center',
                              transform: isCollapsed ? 'rotate(0)' : 'rotate(90deg)',
                              transition: 'transform 0.2s',
                            }}>
                              <HPGlyph name="chevronRight" size={16} color={HP_TOKENS.inkMute} />
                            </button>
                            <div style={{ flex: 1, ...HP_TEXT.h, fontSize: 14, color: HP_TOKENS.ink }}>
                              {dept} ({deptUsers.length})
                            </div>
                            <button onClick={(e) => { e.preventDefault(); selectAllInDept(dept); }} className="hp-tap" style={{
                              padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 800,
                              cursor: 'pointer', fontFamily: HP_FONT,
                              background: allInDeptSelected ? HP_TOKENS.blue : someInDeptSelected ? `${HP_TOKENS.blue}30` : HP_TOKENS.lineSoft,
                              color: allInDeptSelected ? '#fff' : HP_TOKENS.blue,
                              border: 'none', transition: '0.2s'
                            }}>
                              {allInDeptSelected ? '✓ Semua' : 'Pilih Semua'}
                            </button>
                          </div>

                          {!isCollapsed && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 12 }}>
                              {deptUsers.map((u: any) => {
                                const isSelected = sharedUsers.includes(String(u.id));
                                return (
                                  <button key={u.id} onClick={(e) => { e.preventDefault(); toggleUser(String(u.id)); }}
                                    className="hp-tap" style={{
                                      display: 'flex', alignItems: 'center', gap: 16,
                                      padding: '12px 16px', borderRadius: 16,
                                      background: isSelected ? HP_TOKENS.blueWash : 'transparent',
                                      border: isSelected ? `1.5px solid ${HP_TOKENS.blue}30` : '1.5px solid transparent',
                                      cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'all 0.2s'
                                    }}>
                                    <HPAvatar name={u.name} size={40} />
                                    <div style={{ flex: 1 }}>
                                      <div style={{ ...HP_TEXT.h, fontSize: 15 }}>{u.name}</div>
                                      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontSize: 12, marginTop: 4 }}>
                                        {u.jobTitle || u.role}
                                      </div>
                                    </div>
                                    <div style={{
                                      width: 24, height: 24, borderRadius: 8,
                                      border: `2px solid ${isSelected ? HP_TOKENS.blue : HP_TOKENS.line}`,
                                      background: isSelected ? HP_TOKENS.blue : 'transparent',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      transition: 'all 0.2s'
                                    }}>
                                      {isSelected && <HPGlyph name="check" size={14} color="#F4F7F9" />}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                 </div>
              </div>
            )}
          </div>

          {/* SECTION 2: TEMA WARNA */}
          <div style={{ 
            background: HP_TOKENS.card, borderRadius: 24, padding: 24, 
            border: `1.5px solid ${HP_TOKENS.line}`, 
            boxShadow: '0 8px 24px rgba(26,29,35,0.03)'
          }}>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 16, letterSpacing: 0.5 }}>
              TEMA WARNA
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {NOTE_THEMES.map(theme => (
                <div
                  key={theme.id}
                  onClick={() => setNoteColor(theme.id)}
                  className="hp-tap"
                  style={{
                    width: 44, height: 44, borderRadius: 22, background: theme.bg,
                    border: `3px solid ${noteColor === theme.id ? theme.border : 'transparent'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: noteColor === theme.id ? `0 4px 16px ${theme.border}40` : 'none'
                  }}
                  title={theme.label}
                />
              ))}
            </div>
          </div>

          {/* SECTION 3: KONTEN */}
          <div style={{ 
            background: HP_TOKENS.card, borderRadius: 24, padding: 24, 
            border: `1.5px solid ${HP_TOKENS.line}`, 
            boxShadow: '0 8px 24px rgba(26,29,35,0.03)',
            display: 'flex', flexDirection: 'column', gap: 24
          }}>
            <div>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 12, letterSpacing: 0.5 }}>
                JUDUL CATATAN
              </div>
              <input
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Rapat Mingguan, Ide Kreatif, dll."
                style={{ ...inputStyle, fontWeight: 800, fontSize: 18, padding: '18px 20px' }}
              />
            </div>
            
            <div>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 12, letterSpacing: 0.5 }}>
                ISI CATATAN
              </div>
              <div style={{ background: HP_TOKENS.card, borderRadius: 16, overflow: 'hidden', maxWidth: '100%', border: `1.5px solid ${HP_TOKENS.lineSoft}` }}>
                <Editor
                  tinymceScriptSrc="https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.8.3/tinymce.min.js"
                  value={newNote}
                  onEditorChange={(content) => setNewNote(content)}
                  init={{
                    width: '100%',
                    height: 400,
                    menubar: false,
                    toolbar_mode: 'sliding',
                    plugins: [
                      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                      'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                    ],
                    toolbar: 'undo redo | blocks | ' +
                      'bold italic forecolor | alignleft aligncenter ' +
                      'alignright alignjustify | bullist numlist outdent indent | ' +
                      'removeformat | help',
                    content_style: `body { font-family: ${HP_FONT}, sans-serif; font-size: 15px; line-height: 1.6; }`,
                    placeholder: "Tuliskan semua idemu di sini..."
                  }}
                />
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="hp-notes-actions">
            <button
              onClick={cancelForm}
              className="hp-tap"
              style={{
                padding: '16px 28px', borderRadius: 16, border: `1.5px solid ${HP_TOKENS.line}`,
                background: HP_TOKENS.card, color: HP_TOKENS.inkSoft,
                fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer',
              }}
            >
              Batal
            </button>
            <button
              onClick={addNote}
              disabled={!newNote.trim() || (visibility === 'custom' && sharedUsers.length === 0)}
              className="hp-tap"
              style={{
                padding: '16px 32px', borderRadius: 16, border: 'none',
                background: (!newNote.trim() || (visibility === 'custom' && sharedUsers.length === 0)) ? HP_TOKENS.lineSoft : HP_TOKENS.primaryWash,
                color: (!newNote.trim() || (visibility === 'custom' && sharedUsers.length === 0)) ? HP_TOKENS.inkMute : HP_TOKENS.primary,
                fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, 
                cursor: (!newNote.trim() || (visibility === 'custom' && sharedUsers.length === 0)) ? 'default' : 'pointer',
                boxShadow: 'none'
              }}
            >
              {editingNoteId ? '✓ Simpan Perubahan' : '✓ Buat Catatan'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 16px 120px', fontFamily: HP_FONT }}>
      <ScreenHeader title="Catatan" subtitle="Semua catatan meeting, ide, dan informasi." />
      
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="🔍 Cari judul, isi, atau penulis..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: '1 1 200px', padding: '14px 16px', borderRadius: 16,
            border: `1.5px solid ${HP_TOKENS.lineSoft}`, fontFamily: HP_FONT, fontSize: 14,
            outline: 'none', background: HP_TOKENS.card, boxSizing: 'border-box'
          }}
        />
        <button
          onClick={() => setShowForm(true)}
          className="hp-tap"
          style={{
            flex: '1 1 auto',
            padding: '14px 20px', borderRadius: 16, border: 'none',
            background: HP_TOKENS.card, color: HP_TOKENS.ink,
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, whiteSpace: 'nowrap',
            boxShadow: `0 4px 12px rgba(26,29,35,0.03)`,
            borderTop: `1px solid ${HP_TOKENS.lineSoft}`,
          }}
        >
          <HPGlyph name="plus" size={16} color={HP_TOKENS.ink} />
          Tambah Catatan
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: HP_TOKENS.inkMute }}>Memuat catatan...</div>
      ) : notes.length === 0 ? (
        <div style={{ 
          textAlign: 'center', padding: '60px 20px', color: HP_TOKENS.inkMute, 
          background: HP_TOKENS.card, borderRadius: 24, border: `1.5px dashed ${HP_TOKENS.line}`
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📝</div>
          <div style={{ ...HP_TEXT.h, fontSize: 14 }}>Belum ada catatan.</div>
          <div style={{ ...HP_TEXT.small, marginTop: 4 }}>Klik "Tambah Catatan" untuk mulai menulis!</div>
        </div>
      ) : (
        <>
          <style>{`
            .notes-grid {
              column-count: 2;
              column-gap: 16px;
            }
            @media (max-width: 768px) {
              .notes-grid {
                column-count: 1;
              }
            }
            .note-card {
              break-inside: avoid;
              margin-bottom: 16px;
              border-radius: 16px;
              padding: 20px;
              position: relative;
              overflow: hidden;
              transition: transform 0.2s, box-shadow 0.2s;
            }
            .note-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 24px rgba(0,0,0,0.06);
            }
            .note-card .tinymce-content {
              word-break: break-word;
              overflow-wrap: break-word;
            }
            .note-card .tinymce-content p {
              margin: 0 0 8px 0;
            }
            .note-card .tinymce-content p:last-child {
              margin-bottom: 0;
            }
            .note-card .tinymce-content * {
              font-family: var(--hp-font) !important;
              font-size: 13px !important;
              max-width: 100%;
            }
          `}</style>
          
          <div className="notes-grid">
            {paginatedNotes.map(note => {
              const theme = NOTE_THEMES.find(t => t.id === note.color) || NOTE_THEMES.find(t => {
                let hash = 0;
                const id = String(note.id);
                for (let i = 0; i < id.length; i++) hash += id.charCodeAt(i);
                return t.id === NOTE_THEMES[hash % NOTE_THEMES.length].id;
              }) || NOTE_THEMES[0];

              return (
                <div key={note.id} className="note-card" style={{ background: theme.bg, border: `1.5px solid transparent` }}>
                  <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: theme.blob, opacity: 0.6 }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, position: 'relative', zIndex: 2 }}>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                      📝 CATATAN
                    </div>
                    
                    <div style={{ display: 'flex', gap: 6 }}>
                       {(String(note.userId) === String(user?.id) || note.sharedPermission === 'edit') && !isNoteLocked(note) && (
                         <button onClick={() => startEdit(note)} className="hp-tap" style={{ background: '#fff', border: `1px solid ${theme.blob}`, borderRadius: 8, cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Edit">
                           <HPGlyph name="edit" size={12} color={theme.border} />
                         </button>
                       )}
                       {String(note.userId) === String(user?.id) && (
                         <button onClick={() => setNoteToDelete(note.id)} className="hp-tap" style={{ background: '#fff', border: `1px solid ${theme.blob}`, borderRadius: 8, cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Hapus">
                           <HPGlyph name="close" size={12} color={HP_TOKENS.coral} />
                         </button>
                       )}
                    </div>
                  </div>

                  {isNoteLocked(note) && (
                    <div style={{ position: 'relative', zIndex: 2, marginBottom: 8, fontSize: 9, fontWeight: 800, background: HP_TOKENS.coralWash, color: HP_TOKENS.coral, padding: '4px 8px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <HPGlyph name="edit" size={10} color={HP_TOKENS.coral} /> SEDANG DIEDIT OLEH {note.lockedByName?.split(' ')[0].toUpperCase()}
                    </div>
                  )}

                  <div style={{ fontFamily: HP_FONT, fontWeight: 800, fontSize: 18, color: theme.border, marginBottom: 8, position: 'relative', zIndex: 2 }}>
                    {note.title || 'Catatan Tanpa Judul'}
                  </div>

                  <div 
                    className="tinymce-content"
                    style={{ ...HP_TEXT.body, fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.5, color: HP_TOKENS.inkSoft, position: 'relative', zIndex: 2, marginBottom: 16 }}
                    dangerouslySetInnerHTML={{ __html: note.content }}
                  />

                  <div style={{ 
                    marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 2 
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: theme.border }}>
                      {new Date(note.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {note.visibility !== 'private' && (
                        <div style={{ padding: '4px 8px', borderRadius: 8, fontSize: 9, fontWeight: 800, background: '#fff', color: theme.border, border: `1px solid ${theme.blob}` }}>
                          {note.visibility === 'custom' ? 'KUSTOM' : note.visibility.toUpperCase()}
                        </div>
                      )}
                      <div style={{ fontSize: 11, fontWeight: 700, color: HP_TOKENS.inkMute }}>
                        oleh {note.authorName?.split(' ')[0] || 'SAYA'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Pagination Controls */}
          {totalPagesNotes > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 24 }}>
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={activePageNotes === 1}
                style={{
                  padding: '8px 16px', borderRadius: 12, border: `1.5px solid ${HP_TOKENS.line}`,
                  background: activePageNotes === 1 ? HP_TOKENS.lineSoft : '#fff',
                  color: activePageNotes === 1 ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
                  fontFamily: HP_FONT, fontWeight: 700, fontSize: 13, 
                  cursor: activePageNotes === 1 ? 'default' : 'pointer',
                  opacity: activePageNotes === 1 ? 0.6 : 1, transition: 'all 0.2s'
                }}
              >
                Sebelumnya
              </button>
              <span style={{ fontFamily: HP_FONT, fontSize: 14, fontWeight: 700, color: HP_TOKENS.inkSoft }}>
                {activePageNotes} / {totalPagesNotes}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPagesNotes, p + 1))}
                disabled={activePageNotes === totalPagesNotes}
                style={{
                  padding: '8px 16px', borderRadius: 12, border: `1.5px solid ${HP_TOKENS.line}`,
                  background: activePageNotes === totalPagesNotes ? HP_TOKENS.lineSoft : '#fff',
                  color: activePageNotes === totalPagesNotes ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
                  fontFamily: HP_FONT, fontWeight: 700, fontSize: 13, 
                  cursor: activePageNotes === totalPagesNotes ? 'default' : 'pointer',
                  opacity: activePageNotes === totalPagesNotes ? 0.6 : 1, transition: 'all 0.2s'
                }}
              >
                Berikutnya
              </button>
            </div>
          )}
          
          {paginatedNotes.length === 0 && searchQuery && (
            <div style={{ textAlign: 'center', padding: 40, color: HP_TOKENS.inkMute }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
              <div style={{ ...HP_TEXT.h, fontSize: 14 }}>Pencarian tidak ditemukan.</div>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {noteToDelete && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#fff', borderRadius: 24, padding: 32,
            width: '100%', maxWidth: 400, textAlign: 'center',
            boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
            animation: 'hpPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <div style={{ width: 64, height: 64, borderRadius: 32, background: HP_TOKENS.coralWash, color: HP_TOKENS.coral, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <HPGlyph name="trash" size={32} />
            </div>
            <div style={{ ...HP_TEXT.h, fontSize: 20, marginBottom: 8 }}>Hapus Catatan?</div>
            <div style={{ ...HP_TEXT.body, color: HP_TOKENS.inkSoft, marginBottom: 24 }}>
              Catatan ini akan dihapus secara permanen dan tidak dapat dikembalikan.
            </div>
            <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
              <button onClick={deleteNote} className="hp-tap" style={{
                padding: '16px', borderRadius: 16, border: 'none',
                background: HP_TOKENS.coral, color: '#fff',
                fontFamily: HP_FONT, fontWeight: 800, fontSize: 16, cursor: 'pointer',
                width: '100%'
              }}>
                Ya, Hapus
              </button>
              <button onClick={() => setNoteToDelete(null)} className="hp-tap" style={{
                padding: '16px', borderRadius: 16, border: 'none',
                background: HP_TOKENS.card, color: HP_TOKENS.inkSoft,
                fontFamily: HP_FONT, fontWeight: 800, fontSize: 16, cursor: 'pointer',
                width: '100%'
              }}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
