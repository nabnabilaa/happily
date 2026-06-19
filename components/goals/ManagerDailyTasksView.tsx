import React, { useState, useMemo, useEffect } from 'react';
import { HP_TOKENS, HP_FONT, HP_TEXT } from '@/lib/constants';
import HPGlyph from '@/components/ui/HPGlyph';
import HPCard from '@/components/ui/HPCard';
import HPAvatar from '@/components/ui/HPAvatar';
import SectionHeader from '@/components/home/SectionHeader';

interface ManagerDailyTasksViewProps {
  teamTasks: any[];
  membersList: any[];
  handleVerifyTask: (taskId: string, goalId: string) => void;
  handleRejectTask: (taskId: string, goalId: string, action: 'reject' | 'revision') => void;
}

type FilterMode = 'all' | 'active' | 'done' | 'verified';

export default function ManagerDailyTasksView({
  teamTasks,
  membersList,
  handleVerifyTask,
  handleRejectTask,
}: ManagerDailyTasksViewProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());

  const ITEMS_PER_PAGE = 5;

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterMode, selectedMember, searchQuery]);

  // Group tasks by member
  const tasksByMember = useMemo(() => {
    const grouped: Record<string, { name: string; tasks: any[] }> = {};

    for (const t of teamTasks) {
      const memberId = String(t.userId);
      if (!grouped[memberId]) {
        const member = membersList.find((m: any) => String(m.id) === memberId);
        grouped[memberId] = {
          name: member?.name || t.userName || 'Team Member',
          tasks: [],
        };
      }
      grouped[memberId].tasks.push(t);
    }

    return grouped;
  }, [teamTasks, membersList]);

  // Filtered tasks
  const filteredTasksByMember = useMemo(() => {
    const result: Record<string, { name: string; tasks: any[] }> = {};
    const query = searchQuery.toLowerCase().trim();

    for (const [memberId, data] of Object.entries(tasksByMember)) {
      if (selectedMember !== 'all' && memberId !== selectedMember) continue;

      const memberNameMatches = data.name.toLowerCase().includes(query);

      const filtered = data.tasks.filter((t: any) => {
        const taskTitleMatches = t.title.toLowerCase().includes(query);
        const matchesSearch = query === '' ? true : (memberNameMatches || taskTitleMatches);

        if (!matchesSearch) return false;

        switch (filterMode) {
          case 'active': return !t.done;
          case 'done': return t.done && !t.verified;
          case 'verified': return t.verified;
          default: return true;
        }
      });

      if (filtered.length > 0) {
        result[memberId] = { name: data.name, tasks: filtered };
      }
    }

    return result;
  }, [tasksByMember, filterMode, selectedMember, searchQuery]);

  const filteredMemberEntries = useMemo(() => {
    return Object.entries(filteredTasksByMember);
  }, [filteredTasksByMember]);

  const totalPages = Math.ceil(filteredMemberEntries.length / ITEMS_PER_PAGE);
  const paginatedEntries = filteredMemberEntries.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Stats
  const stats = useMemo(() => {
    const total = teamTasks.length;
    const active = teamTasks.filter(t => !t.done).length;
    const done = teamTasks.filter(t => t.done && !t.verified).length;
    const verified = teamTasks.filter(t => t.verified).length;
    return { total, active, done, verified };
  }, [teamTasks]);

  const toggleExpandMember = (memberId: string) => {
    setExpandedMembers(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  // Auto-expand all by default
  const isMemberExpanded = (memberId: string) => {
    if (expandedMembers.size === 0) return true; // all expanded initially
    return expandedMembers.has(memberId);
  };

  const filters: { key: FilterMode; label: string; count: number; color: string }[] = [
    { key: 'all', label: 'Semua', count: stats.total, color: HP_TOKENS.blue },
    { key: 'active', label: 'Aktif', count: stats.active, color: HP_TOKENS.yellow },
    { key: 'done', label: 'Selesai', count: stats.done, color: HP_TOKENS.sage },
    { key: 'verified', label: 'Verified', count: stats.verified, color: HP_TOKENS.lavender },
  ];

  const memberOptions = useMemo(() => {
    const opts = Object.entries(tasksByMember).map(([id, data]) => ({
      id,
      name: data.name,
      taskCount: data.tasks.length,
    }));
    opts.sort((a, b) => a.name.localeCompare(b.name));
    return opts;
  }, [tasksByMember]);

  return (
    <>
      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8,
        marginBottom: 16,
      }}>
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilterMode(f.key)}
            className="hp-tap"
            style={{
              padding: '12px 8px',
              borderRadius: 16,
              border: filterMode === f.key ? `2px solid ${f.color}` : `1.5px solid ${HP_TOKENS.lineSoft}`,
              background: filterMode === f.key ? `${f.color}12` : HP_TOKENS.card,
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.2s',
              boxShadow: filterMode === f.key ? `0 4px 12px ${f.color}20` : 'none',
            }}
          >
            <div style={{
              ...HP_TEXT.h,
              fontSize: 20,
              color: filterMode === f.key ? f.color : HP_TOKENS.ink,
              transition: 'color 0.2s',
            }}>
              {f.count}
            </div>
            <div style={{
              ...HP_TEXT.tiny,
              fontSize: 9,
              color: filterMode === f.key ? f.color : HP_TOKENS.inkMute,
              marginTop: 2,
            }}>
              {f.label}
            </div>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Cari nama anggota atau judul tugas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 40px',
              borderRadius: 14,
              border: `1.5px solid ${HP_TOKENS.line}`,
              background: HP_TOKENS.card,
              fontFamily: HP_FONT,
              fontWeight: 500,
              fontSize: 13,
              color: HP_TOKENS.ink,
              outline: 'none',
              transition: 'all 0.2s',
            }}
          />
          <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
            <HPGlyph name="search" size={16} color={HP_TOKENS.inkMute} />
          </div>
        </div>

        {/* Member Filter Dropdown */}
        <select
          value={selectedMember}
          onChange={(e) => setSelectedMember(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 14,
            border: `1.5px solid ${HP_TOKENS.line}`,
            background: HP_TOKENS.card,
            fontFamily: HP_FONT,
            fontWeight: 700,
            fontSize: 13,
            color: HP_TOKENS.ink,
            cursor: 'pointer',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 5l3 3 3-3'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 16px center',
          }}
        >
          <option value="all">👥 Semua Anggota ({Object.keys(tasksByMember).length})</option>
          {memberOptions.map(m => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.taskCount} task)
            </option>
          ))}
        </select>
      </div>

      <SectionHeader
        icon="activity"
        label="Tugas Harian Tim"
        count={String(Object.values(filteredTasksByMember).reduce((sum, d) => sum + d.tasks.length, 0))}
      />

      {/* Tasks grouped by member */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {Object.entries(filteredTasksByMember).length === 0 && (
          <HPCard padding={32}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <div style={{ ...HP_TEXT.h, fontSize: 16, marginBottom: 4 }}>Tidak ada tugas</div>
              <div style={{ ...HP_TEXT.body, color: HP_TOKENS.inkMute, fontSize: 13 }}>
                {filterMode === 'all'
                  ? 'Belum ada tugas harian dari anggota tim.'
                  : `Tidak ada tugas dengan status "${filters.find(f => f.key === filterMode)?.label}".`}
              </div>
            </div>
          </HPCard>
        )}

        {paginatedEntries.map(([memberId, data]) => {
          const memberInfo = membersList.find((m: any) => String(m.id) === memberId);
          const doneTasks = data.tasks.filter(t => t.done).length;
          const totalTasks = data.tasks.length;
          const completionPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
          const isExpanded = isMemberExpanded(memberId);

          return (
            <div key={memberId}>
              {/* Member Header */}
              <button
                onClick={() => {
                  // On first click, collapse all and toggle this one
                  if (expandedMembers.size === 0) {
                    const allIds = new Set(Object.keys(filteredTasksByMember));
                    allIds.delete(memberId);
                    setExpandedMembers(allIds);
                  } else {
                    toggleExpandMember(memberId);
                  }
                }}
                className="hp-tap"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: isExpanded ? '18px 18px 0 0' : 18,
                  border: `1.5px solid ${HP_TOKENS.line}`,
                  borderBottom: isExpanded ? 'none' : `1.5px solid ${HP_TOKENS.line}`,
                  background: HP_TOKENS.card,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'all 0.2s',
                }}
              >
                <HPAvatar name={data.name} size={36} />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ ...HP_TEXT.h, fontSize: 14 }}>{data.name}</div>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2, fontSize: 9 }}>
                    {memberInfo?.role || 'Team Member'}
                  </div>
                </div>

                {/* Progress pill */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <div style={{
                    padding: '4px 10px',
                    borderRadius: 10,
                    background: completionPct === 100 ? HP_TOKENS.sageSoft : completionPct > 50 ? HP_TOKENS.yellowSoft : HP_TOKENS.lineSoft,
                    color: completionPct === 100 ? HP_TOKENS.sage : completionPct > 50 ? '#8A6814' : HP_TOKENS.inkMute,
                    fontFamily: HP_FONT,
                    fontWeight: 900,
                    fontSize: 11,
                  }}>
                    {doneTasks}/{totalTasks}
                  </div>

                  {/* Mini progress bar */}
                  <div style={{
                    width: 48,
                    height: 4,
                    borderRadius: 2,
                    background: HP_TOKENS.lineSoft,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${completionPct}%`,
                      height: '100%',
                      borderRadius: 2,
                      background: completionPct === 100 ? HP_TOKENS.sage : completionPct > 50 ? HP_TOKENS.yellow : HP_TOKENS.blue,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>

                  {/* Chevron */}
                  <div style={{
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                  }}>
                    <HPGlyph name="chevron-down" size={14} color={HP_TOKENS.inkMute} />
                  </div>
                </div>
              </button>

              {/* Task List */}
              {isExpanded && (
                <div style={{
                  border: `1.5px solid ${HP_TOKENS.line}`,
                  borderTop: 'none',
                  borderRadius: '0 0 18px 18px',
                  overflow: 'hidden',
                }}>
                  {data.tasks.map((t, idx) => {
                    const isLast = idx === data.tasks.length - 1;
                    const isPendingAcc = t.done && !t.verified;

                    return (
                      <div
                        key={t.id}
                        style={{
                          padding: '14px 16px',
                          background: isPendingAcc ? `${HP_TOKENS.yellow}08` : HP_TOKENS.card,
                          borderBottom: isLast ? 'none' : `1px solid ${HP_TOKENS.lineSoft}`,
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                          transition: 'background 0.15s',
                        }}
                      >
                        {/* Status indicator */}
                        <div style={{
                          width: 28,
                          height: 28,
                          borderRadius: 9,
                          background: t.verified
                            ? HP_TOKENS.sageSoft
                            : t.done
                            ? HP_TOKENS.yellowSoft
                            : HP_TOKENS.lineSoft,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: 2,
                        }}>
                          <HPGlyph
                            name={t.verified ? 'check' : t.done ? 'zap' : 'activity'}
                            size={14}
                            color={t.verified ? HP_TOKENS.sage : t.done ? '#8A6814' : HP_TOKENS.inkMute}
                          />
                        </div>

                        {/* Task content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: HP_TOKENS.ink,
                            fontFamily: HP_FONT,
                            textDecoration: t.verified ? 'line-through' : 'none',
                            opacity: t.verified ? 0.6 : 1,
                          }}>
                            {t.title}
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            marginTop: 5,
                            flexWrap: 'wrap',
                          }}>
                            {/* Status badge */}
                            <div style={{
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 9,
                              fontWeight: 900,
                              fontFamily: HP_FONT,
                              letterSpacing: '0.03em',
                              background: t.verified
                                ? HP_TOKENS.sageSoft
                                : t.done
                                ? HP_TOKENS.yellowSoft
                                : t.status === 'revision'
                                ? HP_TOKENS.coralSoft
                                : HP_TOKENS.lineSoft,
                              color: t.verified
                                ? HP_TOKENS.sage
                                : t.done
                                ? '#8A6814'
                                : t.status === 'revision'
                                ? HP_TOKENS.coral
                                : HP_TOKENS.inkMute,
                            }}>
                              {t.verified
                                ? '✓ VERIFIED'
                                : t.done
                                ? '⏳ MENUNGGU ACC'
                                : t.status === 'revision'
                                ? '↻ REVISI'
                                : '○ AKTIF'}
                            </div>

                            {/* Energy */}
                            {t.energy && (
                              <div style={{
                                padding: '2px 6px',
                                borderRadius: 5,
                                background: HP_TOKENS.lineSoft,
                                fontSize: 9,
                                fontWeight: 800,
                                color: HP_TOKENS.inkFade,
                                fontFamily: HP_FONT,
                              }}>
                                ⚡ {t.energy?.toUpperCase()}
                              </div>
                            )}

                            {/* Estimated time */}
                            {t.est && (
                              <div style={{
                                padding: '2px 6px',
                                borderRadius: 5,
                                background: HP_TOKENS.lineSoft,
                                fontSize: 9,
                                fontWeight: 800,
                                color: HP_TOKENS.inkFade,
                                fontFamily: HP_FONT,
                              }}>
                                🕐 {t.est}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions for pending verification */}
                        {isPendingAcc && (
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleVerifyTask(t.id, t.goalId); }}
                              className="hp-tap"
                              style={{
                                padding: '7px 14px',
                                borderRadius: 10,
                                border: 'none',
                                background: HP_TOKENS.sage,
                                color: '#F4F7F9',
                                fontSize: 11,
                                fontWeight: 900,
                                fontFamily: HP_FONT,
                                cursor: 'pointer',
                                boxShadow: `0 3px 8px ${HP_TOKENS.sage}30`,
                              }}
                            >
                              ACC
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRejectTask(t.id, t.goalId, 'revision'); }}
                              className="hp-tap"
                              style={{
                                padding: '7px 10px',
                                borderRadius: 10,
                                border: `1px solid ${HP_TOKENS.yellow}`,
                                background: HP_TOKENS.card,
                                color: '#8A6814',
                                fontSize: 11,
                                fontWeight: 900,
                                fontFamily: HP_FONT,
                                cursor: 'pointer',
                              }}
                            >
                              Revisi
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRejectTask(t.id, t.goalId, 'reject'); }}
                              className="hp-tap"
                              style={{
                                padding: '7px 10px',
                                borderRadius: 10,
                                border: `1px solid ${HP_TOKENS.coral}`,
                                background: HP_TOKENS.card,
                                color: HP_TOKENS.coral,
                                fontSize: 11,
                                fontWeight: 900,
                                fontFamily: HP_FONT,
                                cursor: 'pointer',
                              }}
                            >
                              Tolak
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 16 }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="hp-tap"
            style={{ 
              padding: '8px 16px', 
              borderRadius: 10, 
              background: HP_TOKENS.card, 
              border: `1.5px solid ${HP_TOKENS.line}`, 
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer', 
              opacity: currentPage === 1 ? 0.5 : 1,
              fontFamily: HP_FONT,
              fontWeight: 700,
              fontSize: 13,
              color: HP_TOKENS.ink
            }}
          >
            Prev
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: HP_TOKENS.inkSoft, fontFamily: HP_FONT }}>
            Halaman {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="hp-tap"
            style={{ 
              padding: '8px 16px', 
              borderRadius: 10, 
              background: HP_TOKENS.card, 
              border: `1.5px solid ${HP_TOKENS.line}`, 
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', 
              opacity: currentPage === totalPages ? 0.5 : 1,
              fontFamily: HP_FONT,
              fontWeight: 700,
              fontSize: 13,
              color: HP_TOKENS.ink
            }}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
