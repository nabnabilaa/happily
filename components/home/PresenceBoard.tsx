"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPCard from "@/components/ui/HPCard";
import HPGlyph from "@/components/ui/HPGlyph";
import HPAvatar from "@/components/ui/HPAvatar";
import { Row, HPButton, HPInput, EmptyState } from "@/components/ui";
import HPSelectMenu, { SelectMenuOption } from "@/components/ui/HPSelectMenu";
import { isNetworkError } from "@/lib/errorUtils";
import SectionHeader from "@/components/home/SectionHeader";

// Styling tambahan untuk animasi list
const styles = `
  .team-row {
    transition: all 0.2s var(--hp-ease);
  }
  .team-row:hover {
    background: var(--hp-primary-wash);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    z-index: 2;
    border-radius: var(--hp-radius-md);
  }
  .team-row-me {
    background: var(--hp-yellow-soft) !important;
    border-radius: var(--hp-radius-md);
  }
`;

interface PresenceBoardProps {
  openModal: (name: string, props?: any) => void;
}

interface UserStatus {
  id: string;
  name: string;
  jobTitle: string;
  avatarImage: string | null;
  role: string;
  team: string;
  /** Org division — "divisi" in the UI. May be empty for unassigned people. */
  department: string;
  points: number;
  level: number;
  status: string;
  statusLabel: string;
  statusEmoji: string;
  statusColor: string;
  reason: string | null;
  checkInType: string | null;
  todayCheckin: string | null;
  /**
   * Sesi fokus yang sedang berjalan, kalau ada. Sengaja hanya jam selesai dan
   * apakah orangnya sedang menjauh — bukan berapa kali ia terganggu. Papan ini
   * untuk kehadiran sosial, bukan untuk mengawasi.
   */
  focus: { roomName: string; mode: string; endsAt: string | null; away: boolean } | null;
}

interface StatusSummary {
  total: number;
  working: number;
  meeting: number;
  break: number;
  sick: number;
  izin: number;
  cuti: number;
  offline: number;
}

const FILTER_LABELS: Record<string, string> = {
  all: 'Semua',
  working: 'Bekerja',
  meeting: 'Meeting',
  break: 'Istirahat',
  absent: 'Absen',
  offline: 'Offline',
};

/** Presence status → glyph. The API also sends an emoji; we don't use it. */
const STATUS_GLYPH: Record<string, string> = {
  working: 'activity',
  meeting: 'video',
  break: 'pause',
  sick: 'heart',
  izin: 'note',
  cuti: 'tree',
  away: 'moon',
  offline: 'moon',
  deep_work: 'target',
  stuck: 'alertCircle',
};

/**
 * People per page. Rows are ~62px, so eight fills a comfortable block without
 * the list running past the fold — expanding the whole roster inline dumped 30+
 * rows onto the screen and pushed everything below it out of reach.
 */
const PAGE_SIZE = 8;

export default function PresenceBoard({ openModal }: PresenceBoardProps) {
  const { user } = useHP();
  const [users, setUsers] = useState<UserStatus[]>([]);
  const [summary, setSummary] = useState<StatusSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [division, setDivision] = useState('all');
  const [nameSearch, setNameSearch] = useState('');
  const [page, setPage] = useState(1);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fetchPresence = useCallback(async () => {
    if (typeof window !== "undefined" && !navigator.onLine) return;
    try {
      const params = new URLSearchParams();
      if (user?.role === 'manager') params.set('managerId', user.id);
      const res = await fetch(`/api/status?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setUsers(data.users || []);
      setSummary(data.summary || null);
    } catch (e: any) {
      if (isNetworkError(e)) {
        console.warn("Failed to fetch presence (network issue):", e.message || e);
      } else {
        console.error("Failed to fetch presence:", e);
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPresence();

    // Listen to real-time database updates from SSE
    const handleRealtimeUpdate = () => {
      fetchPresence();
    };
    window.addEventListener('hp_db_update', handleRealtimeUpdate);

    // Auto-refresh every 60 seconds (fallback)
    const interval = setInterval(fetchPresence, 60000);

    return () => {
      window.removeEventListener('hp_db_update', handleRealtimeUpdate);
      clearInterval(interval);
    };
  }, [fetchPresence]);

  /**
   * Divisions present in the current roster, alphabetical. Derived from the
   * data rather than fetched separately, so the dropdown can never offer a
   * division that would return nobody.
   */
  const divisions = React.useMemo(() => {
    const seen = new Set<string>();
    for (const u of users) {
      const d = (u.department || '').trim();
      if (d) seen.add(d);
    }
    return [...seen].sort((a, b) => a.localeCompare(b, 'id'));
  }, [users]);

  const filteredUsers = users.filter(u => {
    let matchesFilter = true;
    if (filter === 'all') matchesFilter = true;
    else if (filter === 'absent') matchesFilter = ['sick', 'izin', 'cuti'].includes(u.status);
    else matchesFilter = u.status === filter;

    const dept = (u.department || '').trim();
    const matchesDivision =
      division === 'all' ? true : division === '__none' ? dept === '' : dept === division;

    let matchesSearch = true;
    if (nameSearch.trim() !== '') {
      const q = nameSearch.toLowerCase();
      matchesSearch = u.name.toLowerCase().includes(q) ||
                      (u.jobTitle || '').toLowerCase().includes(q) ||
                      dept.toLowerCase().includes(q) ||
                      (u.team || '').toLowerCase().includes(q);
    }

    return matchesFilter && matchesDivision && matchesSearch;
  });

  /**
   * Presence status → semantic token. Availability reads as success, anything
   * blocking the person reads as danger, and absence drains to muted ink.
   */
  const getStatusDotColor = (status: string) => {
    const map: Record<string, string> = {
      working: HP_TOKENS.success,
      meeting: HP_TOKENS.info,
      break: HP_TOKENS.warning,
      sick: HP_TOKENS.danger,
      izin: HP_TOKENS.primary,
      cuti: HP_TOKENS.info,
      away: HP_TOKENS.inkMute,
      offline: HP_TOKENS.inkFade,
      deep_work: HP_TOKENS.primary,
      stuck: HP_TOKENS.danger,
    };
    return map[status] || HP_TOKENS.inkFade;
  };

  const glyphFor = (status: string) => STATUS_GLYPH[status] || 'user';

  /** Fire-and-forget nudge. All three share one endpoint and one failure path. */
  const sendNudge = async (target: UserStatus, type: 'greet' | 'coffee' | 'help', done: string) => {
    try {
      await fetch('/api/status/greet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user?.id, senderName: user?.name, receiverId: target.id, type,
        }),
      });
      showToast(done);
    } catch {
      showToast('Gagal mengirim, coba lagi.');
    }
  };

  if (loading) {
    return (
      <HPCard padding={20} style={{ textAlign: 'center' }}>
        <div style={{ ...HP_TEXT.small }}>Memuat data tim…</div>
      </HPCard>
    );
  }

  // `current` is derived rather than stored, so a filter that shrinks the list
  // under the current page can't strand the user on an empty page.
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const from = (current - 1) * PAGE_SIZE;
  const visible = filteredUsers.slice(from, from + PAGE_SIZE);

  return (
    <div style={{ position: 'relative', fontFamily: HP_FONT }}>
      {toastMsg && (
        <div
          role="status"
          style={{
            ...HP_TEXT.small,
            position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
            background: HP_TOKENS.ink, color: HP_TOKENS.paper, padding: '12px 20px',
            borderRadius: HP_TOKENS.radiusPill,
            zIndex: 9999, animation: 'hpSlideUp 0.3s var(--hp-ease-out)',
            boxShadow: HP_TOKENS.shadowMd,
          }}
        >
          {toastMsg}
        </div>
      )}

      {/*
        Filters. These were five stacked tiles — icon over an 18px figure over a
        label — about 80px tall and stretched across the full column, for what
        is a filter control. Inline pills say the same in 36px.
      */}
      {summary && (
        <div
          className="hp-scroll-hidden"
          style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 2 }}
        >
          {[
            { key: 'working', count: summary.working, color: HP_TOKENS.successInk },
            { key: 'meeting', count: summary.meeting, color: HP_TOKENS.infoInk },
            { key: 'break',   count: summary.break,   color: HP_TOKENS.warningInk },
            { key: 'absent',  count: summary.sick + summary.izin + summary.cuti, color: HP_TOKENS.dangerInk },
            { key: 'offline', count: summary.offline, color: HP_TOKENS.inkMute },
          ].map(s => {
            const active = filter === s.key;
            const label = FILTER_LABELS[s.key];
            return (
              <button
                key={s.key}
                onClick={() => { setFilter(active ? 'all' : s.key); setPage(1); }}
                className="hp-tap"
                aria-pressed={active}
                aria-label={`${label}: ${s.count} orang`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  flexShrink: 0, minHeight: 36, padding: '0 12px',
                  borderRadius: HP_TOKENS.radiusPill,
                  background: active ? HP_TOKENS.sunken : HP_TOKENS.card,
                  border: `1px solid ${active ? HP_TOKENS.lineStrong : HP_TOKENS.line}`,
                  transition: 'background-color 140ms var(--hp-ease), border-color 140ms var(--hp-ease)',
                }}
              >
                <span aria-hidden style={{
                  width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0,
                }} />
                <span style={{ ...HP_TEXT.bodyStrong, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                  {s.count}
                </span>
                <span style={{ ...HP_TEXT.small, fontSize: 12.5 }}>{label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Search shares its row with the actions. The buttons had a full-width
          flex 2/1/1 strip to themselves, which is a lot of column for three
          controls. */}
      <Row gap={2} wrap style={{ marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <HPInput
            type="search"
            aria-label="Cari nama, jabatan atau divisi"
            placeholder="Cari nama atau jabatan…"
            value={nameSearch}
            onChange={(e) => { setNameSearch(e.target.value); setPage(1); }}
          />
        </div>

        {divisions.length > 0 && (() => {
          // Build options with member count per division
          const divisionOptions: SelectMenuOption[] = [
            {
              value: 'all',
              label: 'Semua divisi',
              meta: users.length,
            },
            ...divisions.map(d => ({
              value: d,
              label: d,
              meta: users.filter(u => (u.department || '').trim() === d).length,
            })),
            ...(users.some(u => !(u.department || '').trim()) ? [{
              value: '__none',
              label: 'Tanpa divisi',
              meta: users.filter(u => !(u.department || '').trim()).length,
            }] : []),
          ];
          return (
            <HPSelectMenu
              ariaLabel="Filter divisi"
              value={division}
              onChange={(v) => { setDivision(v); setPage(1); }}
              options={divisionOptions}
              icon="people"
              active={division !== 'all'}
            />
          );
        })()}

        <HPButton size="sm" variant="primary" icon="activity" onClick={() => openModal('update_status')}>
          Update status
        </HPButton>
        {/* The per-person eye button below only sends a plain 'greet'. This
            opens the full picker — any colleague, not just whoever is on the
            current presence page, plus the coffee/help nudge types. Dropping it
            left SenggolModal registered in page.tsx but unreachable. */}
        <HPButton size="sm" icon="eye" onClick={() => openModal('senggol')}>
          Senggol
        </HPButton>
        <HPButton size="sm" icon="leaf" onClick={() => openModal('appreciate')}>
          Apresiasi
        </HPButton>
      </Row>

      {/*
        One card of hairline-separated rows, not one bordered card per person.
        Each member used to cost ~120px: an identity row, then a second
        full-width row carrying two stretched buttons. Folding the actions into
        icon buttons on the identity line halves that, and the result reads as
        a list rather than as a stack of unrelated cards.
      */}
      {filteredUsers.length === 0 ? (
        <EmptyState
          icon="people"
          title="Tidak ada yang cocok"
          description="Coba ganti filter status atau divisi, atau kosongkan kolom pencarian."
          action={
            <HPButton
              size="sm"
              onClick={() => { setFilter('all'); setDivision('all'); setNameSearch(''); setPage(1); }}
            >
              Reset filter
            </HPButton>
          }
          compact
        />
      ) : (
        <HPCard padding={0} style={{ overflow: 'hidden' }}>
          {visible.map((u, i) => {
            const isMe = u.id === user?.id;
            const statusColor = getStatusDotColor(u.status);
            const firstName = u.name.split(' ')[0];

            return (
              <div
                key={u.id}
                className={`team-row ${isMe ? 'team-row-me' : ''}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  borderTop: (i === 0 || isMe) ? '1px solid transparent' : `1px solid ${HP_TOKENS.lineSoft}`,
                  position: 'relative',
                  margin: '2px 0',
                }}
              >
                <button
                  type="button"
                  onClick={() => openModal('member_tasks', { targetUserId: u.id, targetUserName: u.name })}
                  className="hp-tap"
                  aria-label={`Lihat tugas ${u.name}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    flex: 1, minWidth: 0, padding: '4px 2px',
                    background: 'transparent', border: 'none', font: 'inherit', color: 'inherit',
                    textAlign: 'left', cursor: 'pointer', borderRadius: HP_TOKENS.radiusXs,
                  }}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <HPAvatar name={u.name} size={42} />
                    <span
                      aria-hidden
                      style={{
                        position: 'absolute', bottom: 0, right: -2,
                        width: 14, height: 14, borderRadius: '50%',
                        background: statusColor,
                        border: `2.5px solid ${isMe ? HP_TOKENS.yellowWash : HP_TOKENS.card}`,
                        boxShadow: HP_TOKENS.shadowSm,
                      }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0, paddingLeft: 4 }}>
                    <div style={{
                      ...HP_TEXT.sub, fontSize: 15, fontWeight: 650,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      marginBottom: 2,
                    }}>
                      {u.name}
                      {isMe && (
                        <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.yellowInk, marginLeft: 6, background: HP_TOKENS.yellowSoft, padding: '2px 6px', borderRadius: 4 }}>Kamu</span>
                      )}
                    </div>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      ...HP_TEXT.small, fontSize: 12,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      <span style={{ color: HP_TOKENS.inkFade }}>{[u.jobTitle, (u.department || '').trim()].filter(Boolean).join(' · ')}</span>
                      
                      {/* Level Badge */}
                      <span style={{ 
                        background: HP_TOKENS.sunken, color: HP_TOKENS.inkMute, 
                        padding: '1px 6px', borderRadius: HP_TOKENS.radiusXs, fontSize: 11, fontWeight: 600 
                      }}>
                        Lv {u.level}
                      </span>
                      
                      {/* Points */}
                      <span style={{ color: HP_TOKENS.inkMute, fontWeight: 600 }}>
                        {u.points.toLocaleString('id-ID')} <span style={{ color: HP_TOKENS.inkFade, fontWeight: 500 }}>pts</span>
                      </span>
                    </div>
                  </div>
                </button>

                {/* Status */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  flexShrink: 0, maxWidth: 140, overflow: 'hidden',
                  background: isMe ? HP_TOKENS.card : HP_TOKENS.sunken,
                  padding: '4px 10px',
                  borderRadius: HP_TOKENS.radiusPill,
                  boxShadow: isMe ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                }}>
                  {u.focus ? (
                    <>
                      <span style={{ display: 'flex' }}><HPGlyph name={u.focus.away ? 'pause' : 'target'} size={12} color="currentColor" /></span>
                      <span style={{
                        ...HP_TEXT.small, fontSize: 11, fontWeight: 600,
                        color: u.focus.away ? HP_TOKENS.warning : HP_TOKENS.sage,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {u.focus.away
                          ? 'Menjauh'
                          : u.focus.endsAt
                            ? `Fokus s/d ${new Date(u.focus.endsAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                            : 'Deep work'}
                      </span>
                    </>
                  ) : (
                    <>
                      <HPGlyph name={glyphFor(u.status)} size={12} color={statusColor} />
                      <span style={{
                        ...HP_TEXT.small, fontSize: 11, fontWeight: 600, color: statusColor,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {u.statusLabel}
                      </span>
                    </>
                  )}
                </div>

                {!isMe && (
                  <Row gap={2} style={{ flexShrink: 0, marginLeft: 8 }}>
                    {/* Menyenggol orang yang sedang deep-work adalah persis
                        gangguan yang fitur fokus ini berusaha cegah. */}
                    <HPButton
                      size="sm" iconOnly icon="eye" variant="secondary"
                      disabled={Boolean(u.focus && !u.focus.away)}
                      aria-label={u.focus && !u.focus.away ? `${u.name} sedang fokus` : `Senggol ${u.name}`}
                      onClick={() => sendNudge(u, 'greet', `Kamu menyapa ${firstName}.`)}
                    />
                    <HPButton
                      size="sm" iconOnly icon="leaf" variant="secondary"
                      aria-label={`Apresiasi ${u.name}`}
                      onClick={() => openModal('appreciate', { toUser: u })}
                    />
                    {(u.status === 'break' || u.status === 'away') && (
                      <HPButton
                        size="sm" iconOnly icon="sparkle" variant="secondary"
                        aria-label={`Ajak ngopi ${u.name}`}
                        onClick={() => sendNudge(u, 'coffee', `Ajakan ngopi terkirim ke ${firstName}.`)}
                      />
                    )}
                    {u.status === 'stuck' && (
                      <HPButton
                        size="sm" iconOnly icon="people" variant="danger"
                        aria-label={`Tawarkan bantuan ke ${u.name}`}
                        onClick={() => sendNudge(u, 'help', `Bantuan ditawarkan ke ${firstName}.`)}
                      />
                    )}
                  </Row>
                )}
              </div>
            );
          })}
        </HPCard>
      )}

      {totalPages > 1 && (
        <Row gap={3} style={{ marginTop: 10 }}>
          <HPButton
            size="sm"
            icon="chevronLeft"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            Sebelumnya
          </HPButton>
          <span style={{
            ...HP_TEXT.small, flex: 1, textAlign: 'center',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {from + 1}–{from + visible.length} dari {filteredUsers.length}
          </span>
          <HPButton
            size="sm"
            iconEnd="chevronRight"
            disabled={current === totalPages}
            onClick={() => setPage(current + 1)}
          >
            Berikutnya
          </HPButton>
        </Row>
      )}
    </div>
  );
}
