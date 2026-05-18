"use client";

import React, { useState, useEffect } from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import { useHP } from "@/lib/HPContext";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import HPAvatar from "@/components/ui/HPAvatar";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/home/SectionHeader";

interface AdminConsoleScreenProps {
  openModal: (name: string, props?: any) => void;
}

export default function AdminConsoleScreen({ openModal }: AdminConsoleScreenProps) {
  const { user: currentUser, logout } = useHP();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?adminId=${currentUser?.id}`);
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (e) {
      console.error("Failed to fetch users:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/update-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterId: currentUser?.id,
          targetUserId: userId,
          ...editData
        }),
      });
      if (res.ok) {
        setEditingId(null);
        setEditData({});
        fetchUsers();
      }
    } catch (e) {
      console.error("Failed to update user:", e);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus user ini? Tindakan ini tidak dapat dibatalkan.")) return;
    
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterId: currentUser?.id,
          targetUserId: userId
        }),
      });
      if (res.ok) fetchUsers();
      else {
        const data = await res.json();
        alert(data.error || "Gagal menghapus user");
      }
    } catch (e) {
      console.error("Failed to delete user:", e);
    }
  };

  const startEditing = (user: any) => {
    setEditingId(user.id);
    setEditData({
      name: user.name,
      newRole: user.role,
      jobTitle: user.job_title,
      department: user.department
    });
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '0 16px 120px', fontFamily: HP_FONT }}>
      <ScreenHeader 
        title="Admin Console 🛡️" 
        subtitle="Kelola akun Anda dan seluruh anggota organisasi" 
      />

      {/* ── Section 1: My Account ── */}
      <div style={{ marginBottom: 32 }}>
        <SectionHeader icon="user" label="Akun Saya" />
        <HPCard padding={20} style={{ 
          background: `linear-gradient(135deg, ${HP_TOKENS.paper}, #fff)`,
          border: `1.5px solid ${HP_TOKENS.line}`,
          boxShadow: '0 8px 24px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <HPAvatar name={currentUser?.name || "Admin"} size={60} />
              <div>
                <div style={{ ...HP_TEXT.h, fontSize: 22 }}>{currentUser?.name}</div>
                <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute }}>{currentUser?.email}</div>
                <div style={{ 
                  display: 'inline-block', marginTop: 8, padding: '4px 10px', borderRadius: 8,
                  background: HP_TOKENS.coralSoft, color: HP_TOKENS.coral, fontSize: 10, fontWeight: 900
                }}>
                  ADMINISTRATOR
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button 
                onClick={() => openModal('profile_editor')}
                className="hp-tap"
                style={{
                  padding: '10px 16px', borderRadius: 12, border: `1.5px solid ${HP_TOKENS.line}`,
                  background: '#fff', color: HP_TOKENS.ink, fontFamily: HP_FONT, fontWeight: 800, fontSize: 13,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
                }}
              >
                <HPGlyph name="edit" size={16} color={HP_TOKENS.ink} />
                Edit Profil
              </button>
              <button 
                onClick={logout}
                className="hp-tap"
                style={{
                  padding: '10px 16px', borderRadius: 12, border: 'none',
                  background: HP_TOKENS.coralSoft, color: HP_TOKENS.coral, fontFamily: HP_FONT, fontWeight: 800, fontSize: 13,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
                }}
              >
                <HPGlyph name="refresh" size={16} color={HP_TOKENS.coral} />
                Logout
              </button>
            </div>
          </div>
        </HPCard>
      </div>

      {/* ── Section 2: User Management ── */}
      <div>
        <SectionHeader icon="people" label="User Management" count={String(users.length)} />
        
        {/* Search Bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: HP_TOKENS.lineSoft, borderRadius: 16, padding: '12px 16px', marginBottom: 20,
          border: `1px solid ${HP_TOKENS.line}`
        }}>
          <HPGlyph name="leaf" size={18} color={HP_TOKENS.inkMute} />
          <input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama, email, atau departemen..."
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontFamily: HP_FONT, fontWeight: 600, fontSize: 15, color: HP_TOKENS.ink
            }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: HP_TOKENS.inkMute }}>Memuat data user...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filteredUsers.map(u => (
              <HPCard key={u.id} padding={16} style={{ 
                border: editingId === u.id ? `2px solid ${HP_TOKENS.yellow}` : `1.5px solid ${HP_TOKENS.line}`,
                position: 'relative'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <HPAvatar name={u.name} size={48} />
                  <div style={{ flex: 1 }}>
                    {editingId === u.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 700, marginBottom: 4 }}>NAMA</div>
                          <input 
                            value={editData.name}
                            onChange={e => setEditData({ ...editData, name: e.target.value })}
                            style={{
                              width: '100%', padding: '8px 12px', borderRadius: 10, border: `1px solid ${HP_TOKENS.line}`,
                              fontFamily: HP_FONT, fontSize: 13, fontWeight: 600, outline: 'none'
                            }}
                          />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div>
                            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 700, marginBottom: 4 }}>ROLE</div>
                            <select 
                              value={editData.newRole}
                              onChange={e => setEditData({ ...editData, newRole: e.target.value })}
                              style={{
                                width: '100%', padding: '8px', borderRadius: 10, border: `1px solid ${HP_TOKENS.line}`,
                                fontFamily: HP_FONT, fontSize: 12, fontWeight: 700, outline: 'none', background: '#fff'
                              }}
                            >
                              <option value="employee">Employee</option>
                              <option value="manager">Manager</option>
                              <option value="hr">HR</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                          <div>
                            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 700, marginBottom: 4 }}>DEPT</div>
                            <input 
                              value={editData.department}
                              onChange={e => setEditData({ ...editData, department: e.target.value })}
                              style={{
                                width: '100%', padding: '8px 12px', borderRadius: 10, border: `1px solid ${HP_TOKENS.line}`,
                                fontFamily: HP_FONT, fontSize: 13, fontWeight: 600, outline: 'none'
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 700, marginBottom: 4 }}>JOB TITLE</div>
                          <input 
                            value={editData.jobTitle}
                            onChange={e => setEditData({ ...editData, jobTitle: e.target.value })}
                            style={{
                              width: '100%', padding: '8px 12px', borderRadius: 10, border: `1px solid ${HP_TOKENS.line}`,
                              fontFamily: HP_FONT, fontSize: 13, fontWeight: 600, outline: 'none'
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                          <button 
                            onClick={() => handleSave(u.id)}
                            className="hp-tap"
                            style={{
                              flex: 1, padding: '12px', borderRadius: 12, border: 'none',
                              background: HP_TOKENS.yellow, color: HP_TOKENS.ink,
                              fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, cursor: 'pointer'
                            }}
                          >
                            Save Changes
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            className="hp-tap"
                            style={{
                              padding: '12px 20px', borderRadius: 12, border: `1.5px solid ${HP_TOKENS.line}`,
                              background: '#fff', color: HP_TOKENS.inkMute,
                              fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ ...HP_TEXT.h, fontSize: 16 }}>{u.name}</div>
                            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700 }}>{u.email}</div>
                            <div style={{ 
                              ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, marginTop: 6, 
                              background: HP_TOKENS.lineSoft, padding: '2px 8px', borderRadius: 6,
                              fontFamily: 'monospace', fontSize: 9
                            }}>
                              DB_HASH: {u.password_hash || "NULL"}
                            </div>
                          </div>
                          <div style={{ 
                            padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 900,
                            background: u.role === 'admin' ? HP_TOKENS.coralSoft : u.role === 'hr' ? HP_TOKENS.lavenderSoft : HP_TOKENS.lineSoft,
                            color: u.role === 'admin' ? HP_TOKENS.coral : u.role === 'hr' ? HP_TOKENS.lavender : HP_TOKENS.inkSoft,
                            textTransform: 'uppercase'
                          }}>
                            {u.role}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                          <div>
                            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 700 }}>DEPARTMENT</div>
                            <div style={{ ...HP_TEXT.small, fontWeight: 600 }}>{u.department || "-"}</div>
                          </div>
                          <div>
                            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 700 }}>JOB TITLE</div>
                            <div style={{ ...HP_TEXT.small, fontWeight: 600 }}>{u.job_title || "-"}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                          <button 
                            onClick={() => startEditing(u)}
                            className="hp-tap"
                            style={{
                              flex: 1, padding: '10px', borderRadius: 10, border: `1.5px solid ${HP_TOKENS.line}`,
                              background: '#fff', color: HP_TOKENS.ink,
                              fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                            }}
                          >
                            <HPGlyph name="edit" size={14} color={HP_TOKENS.ink} />
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDelete(u.id)}
                            className="hp-tap"
                            style={{
                              padding: '10px 16px', borderRadius: 10, border: 'none',
                              background: HP_TOKENS.coralSoft, color: HP_TOKENS.coral,
                              fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                            }}
                          >
                            <HPGlyph name="trash" size={14} color={HP_TOKENS.coral} />
                            Hapus
                          </button>
                        </div>
                      </>
                    )}
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
