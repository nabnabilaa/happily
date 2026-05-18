"use client";

import React, { useState, useEffect } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import ScreenHeader from "@/components/ui/ScreenHeader";

export default function NotesScreen() {
  const { user } = useHP();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [noteTitle, setNoteTitle] = useState('');
  const [newNote, setNewNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [sharedPermission, setSharedPermission] = useState('view');
  const [sharedUsers, setSharedUsers] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allDivisions, setAllDivisions] = useState<string[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

    async function fetchData() {
      try {
        const [notesRes, usersRes] = await Promise.all([
          fetch(`/api/notes?userId=${user?.id}`),
          fetch('/api/users')
        ]);
        const notesData = await notesRes.json();
        setNotes(notesData.notes || []);

        const usersData = await usersRes.json();
        const users = usersData.users || [];
        setAllUsers(users);
        const depts = Array.from(new Set(users.map((u: any) => u.department).filter(Boolean))) as string[];
        setAllDivisions(depts);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

  useEffect(() => {
    if (user?.id) fetchData();
  }, [user?.id]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    try {
      const payload: any = {
        userId: user?.id,
        title: noteTitle.trim() || undefined,
        content: newNote,
      };
      
      if (visibility === 'private' || visibility === 'company') {
        payload.visibility = visibility;
        payload.sharedPermission = visibility === 'private' ? 'view' : sharedPermission;
      } else if (visibility.startsWith('div_')) {
        const dept = visibility.replace('div_', '');
        payload.visibility = 'custom';
        payload.sharedPermission = sharedPermission;
        
        // Check if all users in dept are selected
        const deptUsers = allUsers.filter(u => String(u.id) !== String(user?.id) && u.department === dept);
        const isAllSelected = deptUsers.length > 0 && deptUsers.every(u => sharedUsers.includes(String(u.id)));
        
        if (isAllSelected) {
          payload.sharedWithDivisions = [dept];
          payload.sharedWithUsers = [];
        } else {
          payload.sharedWithDivisions = [];
          payload.sharedWithUsers = sharedUsers;
        }
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
        // Fetch fresh notes so the new one has full metadata from DB
        const freshNotesRes = await fetch(`/api/notes?userId=${user?.id}`);
        const freshNotesData = await freshNotesRes.json();
        setNotes(freshNotesData.notes || []);
        
        setNoteTitle('');
        setNewNote('');
        setVisibility('private');
        setSharedPermission('view');
        setSharedUsers([]);
        setEditingNoteId(null);
      }
    } catch (e) {
      console.error('Failed to add note', e);
    }
  };

  const deleteNote = async (id: string) => {
    if (!confirm('Hapus catatan ini?')) return;
    try {
      await fetch(`/api/notes?noteId=${id}&userId=${user?.id}`, {
        method: 'DELETE',
      });
      setNotes(notes.filter(n => String(n.id) !== String(id)));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleUser = (uid: string) => {
    if (sharedUsers.includes(uid)) setSharedUsers(sharedUsers.filter(u => u !== uid));
    else setSharedUsers([...sharedUsers, uid]);
  };

  const selectedDept = visibility.startsWith('div_') ? visibility.replace('div_', '') : null;
  const deptUsers = selectedDept ? allUsers.filter(u => String(u.id) !== String(user?.id) && u.department === selectedDept) : [];
  const isAllDeptSelected = deptUsers.length > 0 && deptUsers.every(u => sharedUsers.includes(String(u.id)));

  const toggleDeptAll = () => {
    if (isAllDeptSelected) {
      setSharedUsers([]);
    } else {
      setSharedUsers(deptUsers.map(u => String(u.id)));
    }
  };

  const startEdit = async (note: any) => {
    await fetch('/api/notes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'lock', noteId: note.id, userId: user?.id })
    });
    fetchData();

    setEditingNoteId(note.id);
    setNoteTitle(note.title || '');
    setNewNote(note.content);
    setSharedPermission(note.sharedPermission || 'view');
    
    if (note.visibility === 'custom') {
      if (note.sharedWithDivisions && note.sharedWithDivisions.length > 0) {
        setVisibility(`div_${note.sharedWithDivisions[0]}`);
        setSharedUsers(deptUsers.map(u => String(u.id)));
      } else {
        setVisibility('private');
        if (note.sharedWithUsers?.length > 0) {
          const firstUser = allUsers.find(u => String(u.id) === String(note.sharedWithUsers[0]));
          if (firstUser?.department) {
            setVisibility(`div_${firstUser.department}`);
            setSharedUsers(note.sharedWithUsers.map(String));
          }
        }
      }
    } else {
      setVisibility(note.visibility);
      setSharedUsers([]);
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = async () => {
    if (editingNoteId) {
      await fetch('/api/notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlock', noteId: editingNoteId, userId: user?.id })
      });
      fetchData();
    }
    setEditingNoteId(null);
    setNoteTitle('');
    setNewNote('');
    setVisibility('private');
    setSharedPermission('view');
    setSharedUsers([]);
  };

  const isNoteLocked = (note: any) => {
    if (!note.lockedBy) return false;
    if (String(note.lockedBy) === String(user?.id)) return false;
    if (!note.lockedAt) return false;
    const diff = new Date().getTime() - new Date(note.lockedAt).getTime();
    return diff < 15 * 60 * 1000; // Locked for 15 minutes
  };

  const filteredNotes = notes.filter(n => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (n.title && n.title.toLowerCase().includes(q)) || 
           (n.content && n.content.toLowerCase().includes(q)) ||
           (n.authorName && n.authorName.toLowerCase().includes(q));
  });

  const groupedNotes = filteredNotes.reduce((acc, note) => {
    const d = new Date(note.createdAt);
    const dateKey = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(note);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div style={{ padding: '0 16px 120px', fontFamily: HP_FONT }}>
      <ScreenHeader title="Catatan" subtitle="Semua catatan meeting, ide, dan informasi." />

      {/* New Note / Edit Form */}
      <div style={{ 
        background: '#fff', borderRadius: 20, padding: 16, marginBottom: 20,
        border: `1.5px solid ${editingNoteId ? HP_TOKENS.blue : HP_TOKENS.line}`, 
        boxShadow: editingNoteId ? `0 4px 16px ${HP_TOKENS.blue}20` : '0 4px 12px rgba(0,0,0,0.02)'
      }}>
        {editingNoteId && (
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.blue, fontWeight: 900, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <HPGlyph name="edit" size={14} color={HP_TOKENS.blue}/> MENGEDIT CATATAN
          </div>
        )}
        <input
          value={noteTitle}
          onChange={(e) => setNoteTitle(e.target.value)}
          placeholder="Judul catatan (opsional)"
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 12, marginBottom: 12,
            border: `1.5px solid ${HP_TOKENS.lineSoft}`, fontFamily: HP_FONT, fontSize: 16, fontWeight: 700,
            outline: 'none', background: HP_TOKENS.paper, boxSizing: 'border-box'
          }}
        />
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Tulis catatan baru di sini..."
          style={{
            width: '100%', minHeight: 80, padding: 12, borderRadius: 12,
            border: `1.5px solid ${HP_TOKENS.lineSoft}`, fontFamily: HP_FONT, fontSize: 14,
            outline: 'none', resize: 'none', background: HP_TOKENS.paper, boxSizing: 'border-box'
          }}
        />
        
        {/* Secondary Selection UI (if a division is selected) */}
        {selectedDept && (
          <div style={{ 
            marginTop: 12, padding: 12, borderRadius: 12, background: HP_TOKENS.blueWash,
            border: `1.5px solid ${HP_TOKENS.blue}30`
          }}>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.blue, fontWeight: 800, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
              <span>PILIH ANGGOTA DI DIVISI {selectedDept.toUpperCase()}:</span>
              <button 
                onClick={toggleDeptAll}
                style={{ background: 'none', border: 'none', color: HP_TOKENS.blue, fontSize: 10, fontWeight: 900, cursor: 'pointer', textDecoration: 'underline' }}
              >
                {isAllDeptSelected ? 'Deselect Semua' : 'Pilih Semua'}
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {deptUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => toggleUser(String(u.id))}
                  style={{
                    padding: '4px 10px', borderRadius: 12, border: `1.5px solid ${sharedUsers.includes(String(u.id)) ? HP_TOKENS.blue : HP_TOKENS.line}`,
                    background: sharedUsers.includes(String(u.id)) ? HP_TOKENS.blue : '#fff',
                    color: sharedUsers.includes(String(u.id)) ? '#fff' : HP_TOKENS.inkSoft,
                    fontFamily: HP_FONT, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: '0.2s'
                  }}
                >
                  {u.name}
                </button>
              ))}
              {deptUsers.length === 0 && <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade }}>Tidak ada anggota lain di divisi ini.</span>}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
          <select
            value={visibility}
            onChange={(e) => {
              setVisibility(e.target.value);
              setSharedUsers([]); // Reset selection when changing visibility
            }}
            style={{
              padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${HP_TOKENS.lineSoft}`,
              fontFamily: HP_FONT, fontSize: 12, outline: 'none', background: '#fff', fontWeight: 600,
              color: HP_TOKENS.inkSoft, flex: 1
            }}
          >
            <option value="private">🔒 Pribadi (Hanya Saya)</option>
            <option value="company">🏢 Seluruh Perusahaan</option>
            <optgroup label="Bagikan ke Divisi Spesifik...">
              {allDivisions.map(d => (
                <option key={d} value={`div_${d}`}>👥 Divisi {d}</option>
              ))}
            </optgroup>
          </select>
          
          {visibility !== 'private' && (
            <select
              value={sharedPermission}
              onChange={(e) => setSharedPermission(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${HP_TOKENS.lineSoft}`,
                fontFamily: HP_FONT, fontSize: 12, outline: 'none', background: '#fff', fontWeight: 600,
                color: HP_TOKENS.inkSoft, flex: 1
              }}
            >
              <option value="view">👁️ Bisa Lihat Saja</option>
              <option value="edit">✏️ Bisa Ikut Edit</option>
            </select>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {editingNoteId && (
              <button
                onClick={cancelEdit}
                style={{
                  padding: '8px 16px', borderRadius: 10, border: `1.5px solid ${HP_TOKENS.line}`,
                  background: '#fff', color: HP_TOKENS.inkSoft,
                  fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer',
                  transition: '0.2s'
                }}
              >
                Batal
              </button>
            )}
            <button
              onClick={addNote}
              disabled={!newNote.trim() || (selectedDept !== null && sharedUsers.length === 0)}
              style={{
                padding: '8px 16px', borderRadius: 10, border: 'none',
                background: (!newNote.trim() || (selectedDept !== null && sharedUsers.length === 0)) ? HP_TOKENS.lineSoft : HP_TOKENS.blue,
                color: (!newNote.trim() || (selectedDept !== null && sharedUsers.length === 0)) ? HP_TOKENS.inkMute : '#fff',
                fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, 
                cursor: (!newNote.trim() || (selectedDept !== null && sharedUsers.length === 0)) ? 'default' : 'pointer',
                transition: '0.2s'
              }}
            >
              {editingNoteId ? 'Simpan Perubahan' : '+ Simpan'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Search Bar */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="🔍 Cari judul, isi, atau penulis..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%', padding: '12px 16px', borderRadius: 14,
            border: `1.5px solid ${HP_TOKENS.lineSoft}`, fontFamily: HP_FONT, fontSize: 14,
            outline: 'none', background: '#fff', boxSizing: 'border-box'
          }}
        />
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
          <div style={{ ...HP_TEXT.small, marginTop: 4 }}>Tulis catatan pertamamu di atas!</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 12 }}>
          {(Object.entries(groupedNotes) as [string, any[]][]).map(([dateStr, dayNotes]) => (
            <div key={dateStr}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 900, marginBottom: 12, letterSpacing: 1 }}>
                {dateStr.toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {dayNotes.map(note => (
                  <div key={note.id} style={{ 
                    background: '#fff', borderRadius: 20, padding: 20, 
                    border: `1.5px solid ${HP_TOKENS.line}`,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontSize: 11, fontWeight: 700 }}>
                          {new Date(note.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          {note.title && (
                            <div style={{ ...HP_TEXT.h, fontSize: 16, color: HP_TOKENS.ink }}>
                              {note.title}
                            </div>
                          )}
                          {isNoteLocked(note) && (
                            <div style={{ fontSize: 9, fontWeight: 800, background: HP_TOKENS.coralWash, color: HP_TOKENS.coral, padding: '2px 8px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <HPGlyph name="edit" size={10} color={HP_TOKENS.coral} /> SEDANG DIEDIT OLEH {note.lockedByName?.split(' ')[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        {/* Visibility tag */}
                        <div style={{ 
                          display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6,
                          padding: '2px 8px', borderRadius: 6, 
                          background: note.visibility === 'private' ? HP_TOKENS.lineSoft : 
                                      note.visibility === 'division' ? HP_TOKENS.sageSoft : HP_TOKENS.blueWash,
                          color: note.visibility === 'private' ? HP_TOKENS.inkMute : 
                                 note.visibility === 'division' ? HP_TOKENS.sage : HP_TOKENS.blue,
                        }}>
                          <HPGlyph 
                            name={note.visibility === 'private' ? 'lock' : note.visibility === 'custom' ? 'settings' : 'people'} 
                            size={10} 
                            color={note.visibility === 'private' ? HP_TOKENS.inkMute : 
                                   note.visibility === 'division' ? HP_TOKENS.sage : HP_TOKENS.blue} 
                          />
                          <span style={{ fontSize: 10, fontWeight: 800 }}>
                            {note.visibility === 'custom' ? 'KUSTOM' : note.visibility.toUpperCase()}
                          </span>
                        </div>
                        {note.visibility === 'custom' && (note.sharedWithDivisions?.length > 0 || note.sharedWithUsers?.length > 0) && (
                          <div style={{ marginTop: 6, ...HP_TEXT.tiny, color: HP_TOKENS.inkSoft, fontSize: 10 }}>
                            Dibagikan ke: 
                            {note.sharedWithDivisions?.length > 0 && ` Divisi (${note.sharedWithDivisions.join(', ')})`}
                            {note.sharedWithDivisions?.length > 0 && note.sharedWithUsers?.length > 0 && ' • '}
                            {note.sharedWithUsers?.length > 0 && ` ${note.sharedWithUsers.length} Orang`}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {(String(note.userId) === String(user?.id) || note.sharedPermission === 'edit') && !isNoteLocked(note) && (
                          <button 
                            onClick={() => startEdit(note)}
                            style={{ background: HP_TOKENS.lineSoft, border: 'none', borderRadius: 8, cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Edit Catatan"
                          >
                            <HPGlyph name="edit" size={14} color={HP_TOKENS.inkSoft} />
                          </button>
                        )}
                        {String(note.userId) === String(user?.id) && (
                          <button 
                            onClick={() => deleteNote(note.id)}
                            style={{ background: HP_TOKENS.coralWash, border: 'none', borderRadius: 8, cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Hapus Catatan"
                          >
                            <HPGlyph name="close" size={14} color={HP_TOKENS.coral} />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ ...HP_TEXT.body, fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {note.content}
                    </div>

                    <div style={{ 
                      marginTop: 16, paddingTop: 12, borderTop: `1px dashed ${HP_TOKENS.line}`,
                      ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, display: 'flex', alignItems: 'center', gap: 6
                    }}>
                      <div style={{ width: 16, height: 16, borderRadius: 8, background: HP_TOKENS.lineSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <HPGlyph name="people" size={10} color={HP_TOKENS.inkSoft} />
                      </div>
                      Ditulis oleh {note.authorName} ({note.authorDepartment})
                      {note.sharedPermission === 'view' && String(note.userId) !== String(user?.id) && (
                        <span style={{ marginLeft: 'auto', background: HP_TOKENS.lineSoft, padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 800 }}>VIEW ONLY</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {Object.keys(groupedNotes).length === 0 && searchQuery && (
            <div style={{ textAlign: 'center', padding: 40, color: HP_TOKENS.inkMute }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
              <div style={{ ...HP_TEXT.h, fontSize: 14 }}>Pencarian tidak ditemukan.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
