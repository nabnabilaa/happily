"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_FONT, HP_TOKENS, HP_TEXT, Row, Stack, HPButton, IconBadge, HPGlyph, EmptyState } from "@/components/ui";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/home/SectionHeader";
import PointsHeroCard from "@/components/recognize/PointsHeroCard";
import RewardGrid from "@/components/recognize/RewardGrid";
import RedeemHistoryList from "@/components/recognize/RedeemHistoryList";

interface Props {
  openModal: (name: string, props?: any) => void;
}

/**
 * Manager rewards. Same catalogue as employee, plus a section showing
 * pending reward approvals from their team (e.g. Cuti category).
 */
export default function ManagerRecognizeScreen({ openModal }: Props) {
  const { state, updateState, user, notify } = useHP();
  const [pendingRedemptions, setPendingRedemptions] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  if (!state) return null;

  const rewards = state.rewards || [];
  const history = state.rewardHistory || [];
  const wishlistId = state.wishlistId || null;
  // Saldo belanja adalah `coins`; `points` adalah XP seumur hidup yang tidak
  // pernah berkurang saat menukar. Lihat catatan di RecognizeScreen.tsx.
  const points = state.coins ?? state.points ?? 0;

  const toggleWishlist = (r: any) =>
    updateState((s: any) => ({ ...s, wishlistId: s.wishlistId === r.id ? null : r.id }));

  const fetchPending = useCallback(async () => {
    if (!user) return;
    setLoadingPending(true);
    try {
      const res = await fetch(`/api/rewards/redemptions?userId=${user.id}&role=manager`);
      const data = await res.json();
      setPendingRedemptions(
        (data.redemptions || []).filter((r: any) => r.status === "pending_manager")
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPending(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleApprove = async (id: string) => {
    setBusy(id);
    try {
      const res = await fetch("/api/rewards/redemptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redemptionId: id,
          status: "pending_hr",
          reviewerNotes: "Disetujui oleh Manager",
          reviewerId: user?.id,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      notify("Berhasil", "Permintaan reward disetujui dan diteruskan ke HR.", "success");
      await fetchPending();
    } catch (e: any) {
      notify("Gagal", e.message || "Gagal menyetujui.", "error");
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectNotes.trim()) {
      notify("Perhatian", "Alasan penolakan wajib diisi.", "error");
      return;
    }
    setBusy(id);
    try {
      const res = await fetch("/api/rewards/redemptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redemptionId: id,
          status: "rejected",
          reviewerNotes: rejectNotes,
          reviewerId: user?.id,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      notify("Ditolak", "Permintaan reward ditolak dan poin dikembalikan.", "success");
      setRejectingId(null);
      setRejectNotes("");
      await fetchPending();
    } catch (e: any) {
      notify("Gagal", e.message || "Gagal menolak.", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={{ padding: "0 16px 120px", fontFamily: HP_FONT }}>
      <ScreenHeader title="Rewards" subtitle="Tukarkan poin atau pantau wishlist kamu" />

      <PointsHeroCard
        points={points}
        rewards={rewards}
        wishlistId={wishlistId}
        redeemedCount={history.length}
      />

      {/* Manager approval section */}
      {pendingRedemptions.length > 0 && (
        <>
          <SectionHeader icon="check" label="Persetujuan Reward Tim" count={String(pendingRedemptions.length)} />
          <Stack gap={2} style={{ marginBottom: 24 }}>
            {pendingRedemptions.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: 14,
                  border: `1px solid ${HP_TOKENS.line}`,
                  borderRadius: HP_TOKENS.radiusSm,
                  background: HP_TOKENS.card,
                }}
              >
                <Row gap={3} align="flex-start">
                  <IconBadge size={40} tone={HP_TOKENS.warningWash}>
                    <HPGlyph name="gift" size={20} color={HP_TOKENS.warning} />
                  </IconBadge>
                  <Stack gap={1} style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ ...HP_TEXT.sub, fontSize: 14 }}>{r.reward_title}</span>
                    <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkSoft }}>
                      Oleh: <b>{r.user_name}</b> · {r.points_spent} Poin · {new Date(r.created_at).toLocaleDateString("id-ID")}
                    </span>
                    {r.user_notes && (
                      <div style={{ marginTop: 6, padding: 6, background: HP_TOKENS.infoWash, borderRadius: 6, ...HP_TEXT.tiny }}>
                        <b>Catatan:</b> {r.user_notes}
                      </div>
                    )}

                    {rejectingId === r.id ? (
                      <div style={{ marginTop: 10 }}>
                        <textarea
                          className="hp-input"
                          placeholder="Alasan penolakan (wajib)..."
                          value={rejectNotes}
                          onChange={(e) => setRejectNotes(e.target.value)}
                          rows={2}
                          style={{ width: "100%", marginBottom: 8, fontSize: 13 }}
                        />
                        <Row gap={2}>
                          <HPButton size="sm" variant="danger" disabled={!rejectNotes.trim() || busy === r.id} loading={busy === r.id} onClick={() => handleReject(r.id)}>
                            Konfirmasi Tolak
                          </HPButton>
                          <HPButton size="sm" onClick={() => { setRejectingId(null); setRejectNotes(""); }}>
                            Batal
                          </HPButton>
                        </Row>
                      </div>
                    ) : (
                      <Row gap={2} style={{ marginTop: 10 }}>
                        <HPButton size="sm" variant="primary" icon="check" disabled={busy === r.id} loading={busy === r.id} onClick={() => handleApprove(r.id)}>
                          Setujui
                        </HPButton>
                        <HPButton size="sm" variant="danger" icon="close" disabled={busy === r.id} onClick={() => setRejectingId(r.id)}>
                          Tolak
                        </HPButton>
                      </Row>
                    )}
                  </Stack>
                </Row>
              </div>
            ))}
          </Stack>
        </>
      )}

      <SectionHeader icon="gift" label="Reward tersedia" count={String(rewards.length)} />
      <RewardGrid
        rewards={rewards}
        points={points}
        wishlistId={wishlistId}
        onToggleWishlist={toggleWishlist}
        onRedeem={(r) => openModal("all_rewards", { selected: r.id })}
      />

      <SectionHeader icon="history" label="Riwayat penukaran" />
      <RedeemHistoryList history={history} />
    </div>
  );
}
