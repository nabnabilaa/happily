"use client";

import React, { useState } from "react";
import { useHP } from "@/lib/HPContext";
import {
  HP_TOKENS,
  HP_TEXT,
  Stack,
  Row,
  Modal,
  HPButton,
  HPInput,
  HPTextarea,
  HPGlyph,
  EmptyState,
} from "@/components/ui";
import { SHOW_EMPLOYEE_PENDING_REVIEW, SHOW_EMPLOYEE_REVIEW_OUTCOME } from "@/lib/featureFlags";

/**
 * The small pill that carries a task's metadata (KPI, status, attachments).
 * There are up to six of these on one card, so they stay quiet: wash
 * background, no border, icon + one or two words.
 */
function Tag({
  icon,
  tone = HP_TOKENS.inkMute,
  bg = HP_TOKENS.sunken,
  children,
}: {
  icon: string;
  tone?: string;
  bg?: string;
  children: React.ReactNode;
}) {
  return (
    <Row
      gap={1}
      style={{
        background: bg,
        padding: "3px 8px",
        borderRadius: HP_TOKENS.radiusXs,
        maxWidth: "100%",
      }}
    >
      <HPGlyph name={icon} size={11} color={tone} />
      <span
        style={{
          ...HP_TEXT.tiny,
          color: tone,
          textTransform: "none",
          letterSpacing: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
    </Row>
  );
}

/** Labelled block used to present one piece of saved evidence. */
function ProofBlock({
  icon,
  label,
  tone,
  bg,
  children,
}: {
  icon: string;
  label: string;
  tone?: string;
  bg?: string;
  children: React.ReactNode;
}) {
  return (
    <Stack
      gap={2}
      style={{
        padding: "12px 14px",
        borderRadius: HP_TOKENS.radiusSm,
        background: bg ?? HP_TOKENS.sunken,
        border: `1px solid ${HP_TOKENS.lineSoft}`,
      }}
    >
      <Row gap={2}>
        <HPGlyph name={icon} size={13} color={tone ?? HP_TOKENS.inkMute} />
        <span style={{ ...HP_TEXT.tiny, color: tone ?? HP_TOKENS.inkMute }}>{label}</span>
      </Row>
      {children}
    </Stack>
  );
}

interface PriorityCardProps {
  p: any;
  onToggle: () => void;
  openModal?: (name: string, props?: any) => void;
  onDelete?: () => void;
  onEdit?: () => void;
  /**
   * Poin yang benar-benar dibayar server untuk penyelesaian yang BARU SAJA
   * terjadi pada kartu ini. Undefined selama tidak ada apa-apa yang baru
   * diselesaikan; 0 berarti server tidak membayar (kuota penuh, task ini sudah
   * pernah dibayar) dan tidak ada yang perlu ditampilkan.
   *
   * Dulu angkanya diambil dari `p.points`, field yang tidak pernah ada di tabel
   * `daily_priorities` — jadi SETIAP task jatuh ke fallback dan mengiklankan
   * "+30 poin" untuk aksi yang bernilai 20.
   */
  awardedPoints?: number;
}

export default function PriorityCard({ p, onToggle, openModal, onDelete, onEdit, awardedPoints }: PriorityCardProps) {
  const { state, updateState } = useHP();
  const [showPoints, setShowPoints] = useState(false);
  const [showFocusToast, setShowFocusToast] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [editingBukti, setEditingBukti] = useState(false);
  const [editProofLinks, setEditProofLinks] = useState<string[]>(['']);
  const [editNotes, setEditNotes] = useState('');
  const [savingBukti, setSavingBukti] = useState(false);

  const handleEditBukti = () => {
    setEditProofLinks(p.proof_links?.length ? [...p.proof_links] : ['']);
    setEditNotes(p.completion_notes || p.proof_notes || '');
    setEditingBukti(true);
  };

  const handleSaveBukti = async () => {
    setSavingBukti(true);
    const cleanLinks = editProofLinks.filter(l => l.trim().length > 0);
    try {
      await fetch('/api/priorities/complete', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: p.id, done: true, partialProgress: 100, status: 'pending_review',
          proofLinks: cleanLinks, notes: editNotes || undefined,
          completedAt: p.completed_at || new Date().toISOString(),
        }),
      });
      updateState((s: any) => {
        const idx = s.priorities.findIndex((t: any) => String(t.id) === String(p.id));
        if (idx === -1) return s;
        const newP = [...s.priorities];
        newP[idx] = { ...newP[idx], proof_links: cleanLinks, completion_notes: editNotes || null };
        return { ...s, priorities: newP };
      });
      setEditingBukti(false);
    } catch (e) {
      console.error('Gagal menyimpan bukti:', e);
    } finally {
      setSavingBukti(false);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  const executeDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
    setShowDeleteModal(false);
  };

  // Pil poin hanya muncul saat task benar-benar berpindah dari belum ke selesai
  // DAN server benar-benar membayar. Penyelesaian yang bernilai nol — kuota
  // harian habis, task ini sudah pernah dibayar — lewat tanpa pil sama sekali;
  // pesan sebenarnya sudah disampaikan toast kuota dan overlay perayaan.
  const prevDoneRef = React.useRef(p.done);
  React.useEffect(() => {
    if (!prevDoneRef.current && p.done && (awardedPoints ?? 0) > 0) {
      setShowPoints(true);
      setTimeout(() => setShowPoints(false), 1200);
    }
    prevDoneRef.current = p.done;
  }, [p.done, awardedPoints]);

  React.useEffect(() => {
    if (!p.timer_started_at) {
      setElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      const startTime = new Date(p.timer_started_at).getTime();
      const diffSeconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      setElapsed(diffSeconds);
    }, 1000);

    // Initial run
    const startTime = new Date(p.timer_started_at).getTime();
    setElapsed(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));

    return () => clearInterval(interval);
  }, [p.timer_started_at]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (p.done) {
      // Task sudah selesai — tampilkan hasil kerja
      setEditingBukti(false);
      setShowResults(true);
      return;
    }

    // Task belum done (partial atau fresh) — buka completion modal
    let updatedPriorities = (state?.priorities || []).map((item: any) => {
      if (item.id === p.id && item.timer_started_at) {
        const startTime = new Date(item.timer_started_at).getTime();
        const sessionSeconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
        return { ...item, time_tracked: (item.time_tracked || 0) + sessionSeconds, timer_started_at: null };
      }
      return item;
    });
    updateState({ priorities: updatedPriorities });
    onToggle();
  };

  const toggleTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!state) return;
    
    const updatedPriorities = state.priorities.map((item: any) => {
      if (item.id === p.id) {
        if (item.timer_started_at) {
          // Pause timer
          const startTime = new Date(item.timer_started_at).getTime();
          const sessionSeconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
          return {
            ...item,
            time_tracked: (item.time_tracked || 0) + sessionSeconds,
            timer_started_at: null
          };
        } else {
          // Start timer
          return {
            ...item,
            timer_started_at: new Date().toISOString()
          };
        }
      } else {
        return item;
      }
    });

    updateState({ priorities: updatedPriorities });
  };

  const formatTrackedTime = (seconds: number, timerStartedAt?: string) => {
    const totalSeconds = seconds + (timerStartedAt ? elapsed : 0);
    if (totalSeconds <= 0) return "0d";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    const parts = [];
    if (h > 0) parts.push(`${h}j`);
    if (m > 0 || h > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}d`);
    return parts.join(" ");
  };

  const setAsFocus = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateState({ intention: p.title, focusTaskId: p.id, focusProgress: p.progress || 0 });
    setShowFocusToast(true);
    setTimeout(() => setShowFocusToast(false), 2000);

    // Sync with Chrome Extension
    if (typeof window !== "undefined") {
      window.postMessage({
        type: "FLOWBEE_SET_FOCUS",
        goal: p.title,
        progress: p.progress || 0
      }, "*");
    }
  };
  
  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '12px 14px',
      padding: 16,
      // The focused task is marked with a border, not a coloured glow — it has
      // to stand out in a list without shouting over the task titles.
      background: HP_TOKENS.card,
      border: `1px solid ${state?.focusTaskId === p.id ? HP_TOKENS.yellow : HP_TOKENS.line}`,
      borderRadius: HP_TOKENS.radius,
      opacity: p.done ? 0.7 : 1,
      transition: 'border-color 220ms var(--hp-ease), opacity 220ms var(--hp-ease)',
    }}>
      {/* Points earned */}
      {showPoints && (
        <div style={{
          position: 'absolute', top: -10, right: 18,
          background: HP_TOKENS.ink, color: HP_TOKENS.paper,
          fontSize: 11, fontWeight: 650,
          padding: '4px 10px', borderRadius: HP_TOKENS.radiusPill,
          animation: 'hpRise 1.2s var(--hp-ease-out) forwards',
          pointerEvents: 'none', zIndex: 10,
        }}>
          +{awardedPoints} poin
        </div>
      )}

      {/* Focus confirmation */}
      {showFocusToast && (
        <div
          role="status"
          style={{
            position: 'absolute', top: -38, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 6,
            background: HP_TOKENS.ink, color: HP_TOKENS.paper,
            fontSize: 11.5, fontWeight: 600,
            padding: '6px 12px', borderRadius: HP_TOKENS.radiusPill,
            animation: 'hpRise 300ms var(--hp-ease-out)',
            zIndex: 20, whiteSpace: 'nowrap',
          }}
        >
          <HPGlyph name="target" size={12} color="currentColor" />
          Jadi fokus utama
        </div>
      )}

      {/*
        Real checkbox semantics so screen readers announce the state. The box
        reads as 26px but the button is 44px — the hit area grows with padding,
        never the mark itself.
      */}
      <button
        onClick={handleToggle}
        className="hp-tap"
        role="checkbox"
        aria-checked={!!p.done}
        aria-label={p.done ? `Batalkan penyelesaian: ${p.title}` : `Tandai selesai: ${p.title}`}
        style={{
          width: 44,
          height: 44,
          marginLeft: -9,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          border: "none",
          padding: 0,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 26,
            height: 26,
            borderRadius: HP_TOKENS.radiusXs,
            border: `2px solid ${p.done ? HP_TOKENS.success : HP_TOKENS.lineStrong}`,
            background: p.done ? HP_TOKENS.success : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition:
              "background-color 180ms var(--hp-ease), border-color 180ms var(--hp-ease)",
          }}
        >
          {p.done && <HPGlyph name="check" size={15} color="#fff" stroke={3} />}
        </span>
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          ...HP_TEXT.sub,
          fontSize: 14.5,
          lineHeight: 1.4,
          textDecorationLine: p.done ? 'line-through' : 'none',
          textDecorationColor: HP_TOKENS.inkFade,
        }}>
          {p.title}
        </div>

        {p.description && (
          <p style={{
            ...HP_TEXT.small,
            fontSize: 12.5,
            marginTop: 3,
          }}>
            {p.description}
          </p>
        )}
        
        <Row gap={2} wrap style={{ marginTop: 6 }}>
          {/* KPI this task rolls up to */}
          {(() => {
            const goalId = p.goal_id || p.kpi_id;
            const fallbackTitle = p.kpi_title || p.goal;
            if (!goalId && !fallbackTitle) return null;

            const goal = state?.goals?.find((g: any) => String(g.id) === String(goalId));
            const parent = goal?.parent_id
              ? state?.goals?.find((g: any) => String(g.id) === String(goal.parent_id))
              : null;
            const label = !goal
              ? fallbackTitle || "KPI"
              : parent
                ? `${goal.title} → ${parent.title}`
                : goal.title;

            return (
              <Tag
                icon="target"
                tone={p.done ? HP_TOKENS.inkMute : HP_TOKENS.info}
                bg={p.done ? HP_TOKENS.sunken : HP_TOKENS.infoWash}
              >
                {label}
              </Tag>
            );
          })()}

          {/* Menunggu keputusan atasan: tidak ada yang bisa dikerjakan karyawan,
              jadi disembunyikan di alur personal. Lihat SHOW_EMPLOYEE_PENDING_REVIEW. */}
          {SHOW_EMPLOYEE_PENDING_REVIEW && p.status === "pending_review" && (
            <Tag icon="hourglass" tone={HP_TOKENS.warning} bg={HP_TOKENS.warningWash}>
              Menunggu review
            </Tag>
          )}
          {/* Hasil yang menuntut tindakan tetap tampil — task-nya mundur jadi
              belum-selesai dan poinnya ditarik, jadi kartunya harus mengatakan
              kenapa. Lihat SHOW_EMPLOYEE_REVIEW_OUTCOME. */}
          {SHOW_EMPLOYEE_REVIEW_OUTCOME && p.status === "revision" && (
            <Tag icon="pencil" tone={HP_TOKENS.danger} bg={HP_TOKENS.dangerWash}>
              Revisi
            </Tag>
          )}
          {SHOW_EMPLOYEE_REVIEW_OUTCOME && p.status === "rejected" && (
            <Tag icon="close" tone={HP_TOKENS.danger} bg={HP_TOKENS.dangerWash}>
              Ditolak
            </Tag>
          )}

          {p.proof_links && p.proof_links.length > 0 && (
            <Tag icon="paperclip" tone={HP_TOKENS.success} bg={HP_TOKENS.successWash}>
              {p.proof_links.length} bukti
            </Tag>
          )}

          {p.is_project && <Tag icon="folder">Project</Tag>}

          {p.targetDate && <Tag icon="calendar">{p.targetDate}</Tag>}

          {/* Time tracked. A running timer is the one thing here that animates. */}
          {(p.time_tracked > 0 || p.timer_started_at) && (
            <Tag
              icon={p.timer_started_at ? "clock" : "history"}
              tone={p.timer_started_at ? HP_TOKENS.success : HP_TOKENS.inkMute}
              bg={p.timer_started_at ? HP_TOKENS.successWash : HP_TOKENS.sunken}
            >
              {p.timer_started_at ? "Sedang kerja " : ""}
              {formatTrackedTime(p.time_tracked || 0, p.timer_started_at)}
            </Tag>
          )}

          {!p.done && (p.partial_progress || 0) > 0 && (
            <Tag icon="chart" tone={HP_TOKENS.info} bg={HP_TOKENS.infoWash}>
              {p.partial_progress}% progress
            </Tag>
          )}
        </Row>

        {/* Progress — partial completion, or the focus task's live progress. */}
        {(!p.done && (p.partial_progress || 0) > 0) || state?.focusTaskId === p.id ? (
          <div
            style={{
              width: "100%",
              height: 4,
              background: HP_TOKENS.lineSoft,
              borderRadius: HP_TOKENS.radiusPill,
              marginTop: 8,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${
                  state?.focusTaskId === p.id
                    ? state?.focusProgress || 0
                    : p.partial_progress || p.progress || 0
                }%`,
                height: "100%",
                background: state?.focusTaskId === p.id ? HP_TOKENS.yellow : HP_TOKENS.info,
                borderRadius: HP_TOKENS.radiusPill,
                transition: "width 320ms var(--hp-ease)",
              }}
            />
          </div>
        ) : null}
      </div>

      {/* Row actions. Icon-only, so each carries an explicit label. */}
      <Row gap={1} className="hp-priority-actions">
        {!p.done && (
          <>
            <HPButton
              size="sm"
              variant="ghost"
              iconOnly
              icon={p.timer_started_at ? "pause" : "play"}
              onClick={toggleTimer}
              aria-label={p.timer_started_at ? "Jeda pekerjaan" : "Mulai pekerjaan"}
              aria-pressed={!!p.timer_started_at}
              style={{
                background: p.timer_started_at ? HP_TOKENS.successWash : HP_TOKENS.sunken,
                color: p.timer_started_at ? HP_TOKENS.success : HP_TOKENS.inkSoft,
              }}
            />
            <HPButton
              size="sm"
              variant="ghost"
              iconOnly
              icon="sparkle"
              onClick={setAsFocus}
              aria-label="Jadikan fokus utama hari ini"
              aria-pressed={state?.focusTaskId === p.id}
              style={{
                background: HP_TOKENS.yellowWash,
                color: HP_TOKENS.yellowInk,
              }}
            />
          </>
        )}

        {onEdit && (!p.done || p.status === "revision" || p.status === "rejected") && (
          <HPButton
            size="sm"
            variant="ghost"
            iconOnly
            icon="edit"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            aria-label={`Edit task: ${p.title}`}
            style={{ background: HP_TOKENS.infoWash, color: HP_TOKENS.infoInk }}
          />
        )}

        <HPButton
          size="sm"
          variant="ghost"
          iconOnly
          icon="trash"
          onClick={handleDelete}
          aria-label={`Hapus task: ${p.title}`}
          style={{ background: HP_TOKENS.dangerWash, color: HP_TOKENS.dangerInk }}
        />
      </Row>

      {/* Hasil Kerja — muncul saat click task yang sudah selesai */}
      {showResults && (
        <Modal
          onClose={() => {
            setShowResults(false);
            setEditingBukti(false);
          }}
          title={editingBukti ? "Edit bukti kerja" : "Hasil kerja"}
          description={p.title}
          footer={
            editingBukti ? (
              <>
                <HPButton fullWidth onClick={() => setEditingBukti(false)}>
                  Batal
                </HPButton>
                <HPButton
                  variant="primary"
                  fullWidth
                  loading={savingBukti}
                  onClick={handleSaveBukti}
                >
                  Simpan perubahan
                </HPButton>
              </>
            ) : (
              <>
                <HPButton icon="edit" fullWidth onClick={handleEditBukti}>
                  Edit bukti
                </HPButton>
                <HPButton
                  variant="danger"
                  icon="undo"
                  fullWidth
                  onClick={() => {
                    setShowResults(false);
                    setShowUndoConfirm(true);
                  }}
                >
                  Reset
                </HPButton>
              </>
            )
          }
        >
          {editingBukti ? (
            <Stack gap={5}>
              <Stack gap={2}>
                {editProofLinks.map((link, i) => (
                  <Row key={i} gap={2} align="flex-end">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <HPInput
                        type="url"
                        inputMode="url"
                        label={i === 0 ? "Link hasil kerja" : undefined}
                        aria-label={i === 0 ? undefined : `Link hasil kerja #${i + 1}`}
                        value={link}
                        onChange={(e) => {
                          const next = [...editProofLinks];
                          next[i] = e.target.value;
                          setEditProofLinks(next);
                        }}
                        placeholder="https://…"
                      />
                    </div>
                    {editProofLinks.length > 1 && (
                      <HPButton
                        variant="ghost"
                        iconOnly
                        icon="close"
                        aria-label={`Hapus link #${i + 1}`}
                        onClick={() =>
                          setEditProofLinks(editProofLinks.filter((_, j) => j !== i))
                        }
                        style={{ color: HP_TOKENS.dangerInk }}
                      />
                    )}
                  </Row>
                ))}
                <HPButton
                  variant="ghost"
                  icon="plus"
                  onClick={() => setEditProofLinks([...editProofLinks, ""])}
                  style={{ alignSelf: "flex-start", color: HP_TOKENS.primaryInk }}
                >
                  Tambah link
                </HPButton>
              </Stack>

              <HPTextarea
                label="Catatan"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Catatan singkat…"
              />
            </Stack>
          ) : (
            <Stack gap={3}>
              {p.completed_at && (
                <ProofBlock
                  icon="check"
                  label="Selesai"
                  tone={HP_TOKENS.success}
                  bg={HP_TOKENS.successWash}
                >
                  <span style={{ ...HP_TEXT.bodyStrong, color: HP_TOKENS.ink }}>
                    {new Date(p.completed_at).toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </ProofBlock>
              )}

              {p.metric_value != null && (
                <ProofBlock
                  icon="chart"
                  label="Pencapaian"
                  tone={HP_TOKENS.info}
                  bg={HP_TOKENS.infoWash}
                >
                  <span style={{ ...HP_TEXT.bodyStrong, color: HP_TOKENS.ink }}>
                    {p.metric_value}
                  </span>
                </ProofBlock>
              )}

              {(p.completion_notes || p.proof_notes) && (
                <ProofBlock icon="note" label="Catatan">
                  <p style={{ ...HP_TEXT.body, color: HP_TOKENS.ink, margin: 0 }}>
                    {p.completion_notes || p.proof_notes}
                  </p>
                </ProofBlock>
              )}

              {((p.proof_links && p.proof_links.length > 0) || p.proof_link) && (
                <ProofBlock icon="paperclip" label="Bukti kerja">
                  <Stack gap={2}>
                    {(p.proof_links?.length > 0 ? p.proof_links : [p.proof_link])
                      .filter(Boolean)
                      .map((link: string, i: number) => (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            ...HP_TEXT.small,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            color: HP_TOKENS.primaryInk,
                            minHeight: 32,
                            minWidth: 0,
                          }}
                        >
                          <HPGlyph name="link" size={13} color="currentColor" />
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {link}
                          </span>
                        </a>
                      ))}
                  </Stack>
                </ProofBlock>
              )}

              {!p.completed_at &&
                !p.metric_value &&
                !p.proof_links?.length &&
                !p.proof_link &&
                !p.completion_notes &&
                !p.proof_notes && (
                  <EmptyState
                    compact
                    icon="paperclip"
                    title="Belum ada bukti kerja"
                    description="Lampirkan link atau catatan supaya hasil task ini bisa ditinjau."
                    action={
                      <HPButton variant="primary" icon="plus" onClick={handleEditBukti}>
                        Tambah bukti
                      </HPButton>
                    }
                  />
                )}
            </Stack>
          )}
        </Modal>
      )}

      {/* Undo confirmation — reached from Reset in the results sheet */}
      {showUndoConfirm && (
        <Modal
          onClose={() => setShowUndoConfirm(false)}
          title="Reset progress?"
          description={p.title}
          footer={
            <>
              <HPButton fullWidth onClick={() => setShowUndoConfirm(false)}>
                Batal
              </HPButton>
              <HPButton
                variant="danger"
                icon="undo"
                fullWidth
                onClick={() => {
                  setShowUndoConfirm(false);
                  onToggle();
                }}
              >
                Ya, reset
              </HPButton>
            </>
          }
        >
          <p style={{ ...HP_TEXT.body, margin: 0 }}>
            Task dikembalikan ke belum selesai dan semua progress direset.
          </p>
        </Modal>
      )}

      {showDeleteModal && (
        <Modal
          onClose={() => setShowDeleteModal(false)}
          title="Hapus task?"
          description={p.title}
          footer={
            <>
              <HPButton fullWidth onClick={() => setShowDeleteModal(false)}>
                Batal
              </HPButton>
              <HPButton variant="danger" icon="trash" fullWidth onClick={executeDelete}>
                Ya, hapus
              </HPButton>
            </>
          }
        >
          <p style={{ ...HP_TEXT.body, margin: 0 }}>
            Task ini akan dihapus permanen, termasuk waktu dan bukti kerja yang sudah
            tercatat.
          </p>
        </Modal>
      )}
    </div>
  );
}
