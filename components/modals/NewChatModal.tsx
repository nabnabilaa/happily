"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import Modal from "@/components/ui/Modal";
import HPGlyph from "@/components/ui/HPGlyph";
import HPAvatar from "@/components/ui/HPAvatar";

interface NewChatModalProps {
  onClose: () => void;
  onChannelCreated?: (channelId: string) => void;
}

interface UserItem {
  id: string;
  name: string;
  jobTitle: string;
  department: string;
  role: string;
}

const GROUP_EMOJIS = ['👥', '🚀', '💡', '🎯', '🔥', '⚡', '🌟', '🎨', '📊', '🏆'];

export default function NewChatModal({ onClose, onChannelCreated }: NewChatModalProps) {
  const { user, notify } = useHP();
  const [mode, setMode] = useState<'select' | 'dm' | 'group' | 'broadcast'>('select');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Group mode
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupEmoji, setGroupEmoji] = useState('👥');
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set());

  // Broadcast mode
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);

  const isHRorManager = user?.role === 'hr' || user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const [uRes, dRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/admin/departments'),
      ]);
      const uData = await uRes.json();
      const dData = await dRes.json();
      setUsers((uData.users || []).filter((u: any) => u.id !== user?.id));
      setDepartments((dData.departments || []).map((d: any) => d.name));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // Group users by department
  const usersByDept = useMemo(() => {
    const map: Record<string, UserItem[]> = {};
    const filtered = users.filter(u =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.department?.toLowerCase().includes(search.toLowerCase())
    );
    filtered.forEach(u => {
      const dept = u.department || 'Lainnya';
      if (!map[dept]) map[dept] = [];
      map[dept].push(u);
    });
    return map;
  }, [users, search]);

  const filteredUsers = useMemo(() =>
    users.filter(u =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.department?.toLowerCase().includes(search.toLowerCase())
    ), [users, search]);

  const toggleDeptCollapse = (dept: string) => {
    setCollapsedDepts(prev => {
      const n = new Set(prev);
      n.has(dept) ? n.delete(dept) : n.add(dept);
      return n;
    });
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const selectAllInDept = (dept: string) => {
    const deptUserIds = (usersByDept[dept] || []).map(u => u.id);
    const allSelected = deptUserIds.every(id => selectedUsers.includes(id));
    if (allSelected) {
      setSelectedUsers(prev => prev.filter(id => !deptUserIds.includes(id)));
    } else {
      setSelectedUsers(prev => [...new Set([...prev, ...deptUserIds])]);
    }
  };

  const toggleDeptForBroadcast = (dept: string) => {
    setSelectedDepts(prev =>
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  const selectAllDepts = () => {
    if (selectedDepts.length === departments.length) {
      setSelectedDepts([]);
    } else {
      setSelectedDepts([...departments]);
    }
  };

  const handleStartDM = async (targetUserId: string) => {
    setCreating(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_dm', userId: user?.id, targetUserId }),
      });
      const data = await res.json();
      if (data.channelId) { onChannelCreated?.(data.channelId); onClose(); }
    } catch (e) { console.error(e); notify('Error', 'Gagal membuat chat', 'error'); }
    setCreating(false);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length < 1) return;
    setCreating(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_channel', name: groupName.trim(), type: 'group',
          createdBy: user?.id, memberIds: selectedUsers, avatarEmoji: groupEmoji,
        }),
      });
      const data = await res.json();
      if (data.channelId) {
        notify('Grup Dibuat', `"${groupName}" berhasil dibuat`, 'success');
        onChannelCreated?.(data.channelId); onClose();
      }
    } catch (e) { console.error(e); notify('Error', 'Gagal membuat grup', 'error'); }
    setCreating(false);
  };

  const handleSendBroadcast = async () => {
    if (!broadcastContent.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'broadcast', senderId: user?.id, content: broadcastContent.trim(),
          title: broadcastTitle.trim() || undefined,
          targetDepartments: selectedDepts.length > 0 && selectedDepts.length < departments.length ? selectedDepts : [],
        }),
      });
      const data = await res.json();
      if (data.success) {
        notify('📢 Siaran Terkirim', `Diterima oleh ${data.recipientCount} orang`, 'success');
        onChannelCreated?.(data.channelId); onClose();
      } else {
        notify('Error', data.error || 'Gagal mengirim siaran', 'error');
      }
    } catch (e) { console.error(e); notify('Error', 'Gagal mengirim siaran', 'error'); }
    setCreating(false);
  };

  const chipStyle: React.CSSProperties = {
    padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
    cursor: 'pointer', fontFamily: HP_FONT, border: 'none',
  };

  // ── Mode Select ─────────────────────────────────────────────────────────
  if (mode === 'select') {
    return (
      <Modal onClose={onClose} title="💬 Chat Baru">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* DM */}
          <button onClick={() => setMode('dm')} className="hp-tap" style={{
            padding: '18px 16px', borderRadius: 16, border: `1.5px solid ${HP_TOKENS.line}`,
            background: HP_TOKENS.card, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: HP_TOKENS.yellowSoft,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>👤</div>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div style={{ ...HP_TEXT.h, fontSize: 15 }}>Direct Message</div>
              <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 2 }}>Chat pribadi 1-on-1</div>
            </div>
            <HPGlyph name="chevronRight" size={16} color={HP_TOKENS.inkMute} />
          </button>

          {/* Group */}
          <button onClick={() => setMode('group')} className="hp-tap" style={{
            padding: '18px 16px', borderRadius: 16, border: `1.5px solid ${HP_TOKENS.line}`,
            background: HP_TOKENS.card, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: HP_TOKENS.blueSoft,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>👥</div>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div style={{ ...HP_TEXT.h, fontSize: 15 }}>Grup Chat</div>
              <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 2 }}>Pilih per divisi atau gabung beberapa orang</div>
            </div>
            <HPGlyph name="chevronRight" size={16} color={HP_TOKENS.inkMute} />
          </button>

          {/* Broadcast — only HR/Manager */}
          {isHRorManager && (
            <button onClick={() => setMode('broadcast')} className="hp-tap" style={{
              padding: '18px 16px', borderRadius: 16,
              border: `1.5px solid #F59E0B30`,
              background: 'linear-gradient(135deg, #FFF7ED, #FFFBEB)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ width: 48, height: 48, borderRadius: 14,
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📢</div>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ ...HP_TEXT.h, fontSize: 15 }}>Pesan Siaran</div>
                <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 2 }}>Kirim pesan penting ke divisi tertentu atau semua</div>
              </div>
              <HPGlyph name="chevronRight" size={16} color="#D97706" />
            </button>
          )}
        </div>
      </Modal>
    );
  }

  // ── Broadcast Mode ──────────────────────────────────────────────────────
  if (mode === 'broadcast') {
    const allSelected = selectedDepts.length === departments.length;
    const noneSelected = selectedDepts.length === 0;
    const filteredDepts = departments.filter(d =>
      d.toLowerCase().includes(search.toLowerCase())
    );
    const targetLabel = noneSelected || allSelected
      ? 'Semua Divisi'
      : `${selectedDepts.length} divisi dipilih`;

    return (
      <Modal onClose={onClose} title="📢 Pesan Siaran">
        {/* Title */}
        <input value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)}
          placeholder="Judul siaran (opsional)..."
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${HP_TOKENS.line}`,
            fontFamily: HP_FONT, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontWeight: 700, marginBottom: 10 }} />

        {/* Content */}
        <textarea value={broadcastContent} onChange={e => setBroadcastContent(e.target.value)}
          placeholder="Tulis pesan siaran..."
          rows={3}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${HP_TOKENS.line}`,
            fontFamily: HP_FONT, fontSize: 14, outline: 'none', boxSizing: 'border-box', resize: 'vertical', marginBottom: 14 }} />

        {/* Target Departments Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ ...HP_TEXT.h, fontSize: 13 }}>🎯 Target Divisi</div>
          <div style={{
            ...HP_TEXT.tiny, fontSize: 11, color: '#D97706', fontWeight: 700,
            padding: '2px 8px', borderRadius: 6, background: '#FEF3C7',
          }}>
            {targetLabel}
          </div>
        </div>

        {/* Search departments */}
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Cari divisi..."
          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${HP_TOKENS.line}`,
            fontFamily: HP_FONT, fontSize: 12, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />

        {/* Select All toggle */}
        <button onClick={selectAllDepts} className="hp-tap" style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
          background: allSelected ? '#FFF7ED' : HP_TOKENS.lineSoft,
          border: `1.5px solid ${allSelected ? '#F59E0B40' : 'transparent'}`,
          marginBottom: 4,
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: 5,
            border: `2px solid ${allSelected ? '#F59E0B' : HP_TOKENS.line}`,
            background: allSelected ? '#F59E0B' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {allSelected && <HPGlyph name="check" size={12} color="#fff" />}
          </div>
          <div style={{ ...HP_TEXT.h, fontSize: 13, flex: 1, textAlign: 'left' }}>Semua Divisi</div>
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontSize: 10 }}>{departments.length} divisi</div>
        </button>

        {/* Scrollable department list */}
        <div style={{
          maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2,
          marginBottom: 10, borderRadius: 10, border: `1px solid ${HP_TOKENS.line}`,
          padding: 4,
        }}>
          {filteredDepts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 16, color: HP_TOKENS.inkMute, ...HP_TEXT.small }}>
              Divisi tidak ditemukan
            </div>
          ) : (
            filteredDepts.map(dept => {
              const sel = selectedDepts.includes(dept);
              const deptUserCount = users.filter(u => u.department === dept).length;
              return (
                <button key={dept} onClick={() => toggleDeptForBroadcast(dept)} className="hp-tap" style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '9px 10px', borderRadius: 8, cursor: 'pointer',
                  background: sel ? '#FFF7ED' : 'transparent',
                  border: 'none',
                  transition: 'background 0.15s',
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 5,
                    border: `2px solid ${sel ? '#F59E0B' : HP_TOKENS.line}`,
                    background: sel ? '#F59E0B' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {sel && <HPGlyph name="check" size={10} color="#fff" />}
                  </div>
                  <div style={{ ...HP_TEXT.h, fontSize: 13, flex: 1, textAlign: 'left',
                    color: sel ? '#92400E' : HP_TOKENS.ink }}>
                    {dept}
                  </div>
                  <div style={{
                    ...HP_TEXT.tiny, fontSize: 10, color: HP_TOKENS.inkMute,
                    padding: '1px 6px', borderRadius: 4, background: HP_TOKENS.lineSoft,
                  }}>
                    {deptUserCount} orang
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Selected chips summary */}
        {selectedDepts.length > 0 && !allSelected && (
          <div style={{
            display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10,
            padding: '6px 8px', borderRadius: 8, background: '#FEF3C7',
          }}>
            {selectedDepts.map(d => (
              <span key={d} onClick={() => toggleDeptForBroadcast(d)} style={{
                padding: '3px 8px', borderRadius: 6, background: '#F59E0B',
                color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: HP_FONT,
              }}>{d} ✕</span>
            ))}
          </div>
        )}

        <button onClick={handleSendBroadcast}
          disabled={!broadcastContent.trim() || creating}
          className="hp-tap"
          style={{
            width: '100%', padding: 16, borderRadius: 14, border: 'none',
            background: broadcastContent.trim() ? 'linear-gradient(135deg, #F59E0B, #D97706)' : HP_TOKENS.lineSoft,
            color: broadcastContent.trim() ? '#fff' : HP_TOKENS.inkMute,
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer',
            opacity: creating || !broadcastContent.trim() ? 0.5 : 1,
            boxShadow: broadcastContent.trim() ? '0 4px 16px rgba(245,158,11,0.3)' : 'none',
          }}>
          {creating ? 'Mengirim...' : `📢 Kirim Siaran`}
        </button>
      </Modal>
    );
  }

  // ── DM Mode ─────────────────────────────────────────────────────────────
  if (mode === 'dm') {
    return (
      <Modal onClose={onClose} title="👤 Pilih Kontak">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Cari nama atau departemen..."
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${HP_TOKENS.line}`,
            fontFamily: HP_FONT, fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
        <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20, color: HP_TOKENS.inkMute }}>Memuat...</div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: HP_TOKENS.inkMute }}>Tidak ditemukan</div>
          ) : (
            filteredUsers.map(u => (
              <button key={u.id} onClick={() => handleStartDM(u.id)} disabled={creating}
                className="hp-tap" style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12,
                  background: 'transparent', border: '1.5px solid transparent',
                  cursor: 'pointer', width: '100%', textAlign: 'left', opacity: creating ? 0.5 : 1,
                }}>
                <HPAvatar name={u.name} size={38} />
                <div style={{ flex: 1 }}>
                  <div style={{ ...HP_TEXT.h, fontSize: 14 }}>{u.name}</div>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 1 }}>
                    {u.jobTitle || u.role}{u.department ? ` · ${u.department}` : ''}
                  </div>
                </div>
                <HPGlyph name="arrow" size={14} color={HP_TOKENS.inkMute} />
              </button>
            ))
          )}
        </div>
      </Modal>
    );
  }

  // ── Group Mode (with department grouping) ───────────────────────────────
  const deptNames = Object.keys(usersByDept).sort();

  return (
    <Modal onClose={onClose} title="👥 Buat Grup Chat">
      {/* Group name & emoji */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: HP_TOKENS.blueSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
            cursor: 'pointer', flexShrink: 0 }}
            onClick={() => {
              const idx = GROUP_EMOJIS.indexOf(groupEmoji);
              setGroupEmoji(GROUP_EMOJIS[(idx + 1) % GROUP_EMOJIS.length]);
            }}>
            {groupEmoji}
          </div>
          <input value={groupName} onChange={e => setGroupName(e.target.value)}
            placeholder="Nama grup..."
            style={{ flex: 1, padding: '12px 14px', borderRadius: 12,
              border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT,
              fontSize: 14, outline: 'none', fontWeight: 700 }} />
        </div>
        {selectedUsers.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '8px 10px',
            borderRadius: 10, background: HP_TOKENS.blueWash }}>
            {selectedUsers.map(uid => {
              const u = users.find(x => x.id === uid);
              return u ? (
                <span key={uid} onClick={() => toggleUser(uid)} style={{
                  ...chipStyle, background: HP_TOKENS.blue, color: '#fff',
                }}>{u.name.split(' ')[0]} ✕</span>
              ) : null;
            })}
          </div>
        )}
      </div>

      {/* Search */}
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Cari nama atau departemen..."
        style={{ width: '100%', padding: '12px 14px', borderRadius: 12,
          border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT,
          fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />

      {/* Department-grouped user list */}
      <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, color: HP_TOKENS.inkMute }}>Memuat...</div>
        ) : deptNames.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: HP_TOKENS.inkMute }}>Tidak ditemukan</div>
        ) : (
          deptNames.map(dept => {
            const deptUsers = usersByDept[dept];
            const isCollapsed = collapsedDepts.has(dept);
            const allInDeptSelected = deptUsers.every(u => selectedUsers.includes(u.id));
            const someInDeptSelected = deptUsers.some(u => selectedUsers.includes(u.id));

            return (
              <div key={dept} style={{ marginBottom: 4 }}>
                {/* Department header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 10,
                  background: HP_TOKENS.lineSoft,
                }}>
                  <button onClick={() => toggleDeptCollapse(dept)} className="hp-tap" style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    display: 'flex', alignItems: 'center',
                    transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0)',
                    transition: 'transform 0.2s',
                  }}>
                    <HPGlyph name="chevronLeft" size={12} color={HP_TOKENS.inkMute}
                      style={{ transform: 'rotate(-90deg)' }} />
                  </button>
                  <div style={{ flex: 1, ...HP_TEXT.h, fontSize: 12, color: HP_TOKENS.inkMute, letterSpacing: 0.5 }}>
                    {dept} ({deptUsers.length})
                  </div>
                  <button onClick={() => selectAllInDept(dept)} className="hp-tap" style={{
                    ...chipStyle, padding: '3px 10px',
                    background: allInDeptSelected ? HP_TOKENS.blue : someInDeptSelected ? `${HP_TOKENS.blue}30` : HP_TOKENS.card,
                    color: allInDeptSelected ? '#fff' : HP_TOKENS.blue,
                    border: `1.5px solid ${HP_TOKENS.blue}40`,
                  }}>
                    {allInDeptSelected ? '✓ Semua' : 'Pilih Semua'}
                  </button>
                </div>

                {/* Users in this department */}
                {!isCollapsed && deptUsers.map(u => {
                  const isSelected = selectedUsers.includes(u.id);
                  return (
                    <button key={u.id} onClick={() => toggleUser(u.id)} disabled={creating}
                      className="hp-tap" style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '8px 12px 8px 28px', borderRadius: 10,
                        background: isSelected ? HP_TOKENS.blueWash : 'transparent',
                        border: isSelected ? `1.5px solid ${HP_TOKENS.blue}30` : '1.5px solid transparent',
                        cursor: 'pointer', width: '100%', textAlign: 'left',
                      }}>
                      <HPAvatar name={u.name} size={32} />
                      <div style={{ flex: 1 }}>
                        <div style={{ ...HP_TEXT.h, fontSize: 13 }}>{u.name}</div>
                        <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontSize: 10 }}>
                          {u.jobTitle || u.role}
                        </div>
                      </div>
                      <div style={{
                        width: 20, height: 20, borderRadius: 6,
                        border: `2px solid ${isSelected ? HP_TOKENS.blue : HP_TOKENS.line}`,
                        background: isSelected ? HP_TOKENS.blue : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isSelected && <HPGlyph name="check" size={11} color="#fff" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Create Group Button */}
      <button onClick={handleCreateGroup}
        disabled={!groupName.trim() || selectedUsers.length < 1 || creating}
        className="hp-tap"
        style={{
          width: '100%', padding: 16, borderRadius: 14, border: 'none',
          background: groupName.trim() && selectedUsers.length > 0 ? HP_TOKENS.blue : HP_TOKENS.lineSoft,
          color: groupName.trim() && selectedUsers.length > 0 ? '#fff' : HP_TOKENS.inkMute,
          fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer',
          marginTop: 14,
          opacity: creating || !groupName.trim() || selectedUsers.length < 1 ? 0.5 : 1,
          boxShadow: groupName.trim() && selectedUsers.length > 0 ? `0 4px 16px ${HP_TOKENS.blue}30` : 'none',
        }}>
        {creating ? 'Membuat...' : `Buat Grup (${selectedUsers.length} anggota)`}
      </button>
    </Modal>
  );
}
