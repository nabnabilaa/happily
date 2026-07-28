"use client";

import React, { useState, useEffect } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_TEXT } from "@/lib/constants";
import Modal from "@/components/ui/Modal";
import { Row, Stack, HPButton, IconBadge } from "@/components/ui";
import HPGlyph from "@/components/ui/HPGlyph";

interface RewardFulfillmentModalProps {
  onClose: () => void;
}

export default function RewardFulfillmentModal({ onClose }: RewardFulfillmentModalProps) {
  const { user, notify } = useHP();
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // States for fulfillment form
  const [activeItem, setActiveItem] = useState<any | null>(null);
  const [proofLink, setProofLink] = useState("");
  const [reviewerNotes, setReviewerNotes] = useState("");

  const fetchRedemptions = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const role = user.role === 'hr' ? 'hr' : (user.role === 'manager' ? 'manager' : 'employee');
      const res = await fetch(`/api/rewards/redemptions?userId=${user.id}&role=${role}`);
      const data = await res.json();
      setRedemptions(data.redemptions || []);
    } catch (e) {
      console.error(e);
      notify("Error", "Gagal memuat data penukaran reward", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRedemptions();
  }, [user]);

  const handleUpdateStatus = async (id: string, status: string) => {
    setBusy(id);
    try {
      const res = await fetch("/api/rewards/redemptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redemptionId: id,
          status,
          proofLink,
          reviewerNotes,
          reviewerId: user?.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      notify("Berhasil", `Status berhasil diubah menjadi ${status}.`, "success");
      setProofLink("");
      setReviewerNotes("");
      setActiveItem(null);
      await fetchRedemptions();
    } catch (e: any) {
      notify("Gagal", e.message || "Gagal mengubah status.", "error");
    } finally {
      setBusy(null);
    }
  };

  const pendingItems = redemptions.filter(r => r.status.startsWith('pending'));
  const finishedItems = redemptions.filter(r => !r.status.startsWith('pending'));

  if (activeItem) {
    return (
      <Modal title="Proses Penukaran Reward" onClose={() => setActiveItem(null)}>
        <div style={{ padding: 16 }}>
          <HPCard padding={16} style={{ marginBottom: 16, background: HP_TOKENS.paper }}>
            <Row gap={3} align="flex-start">
              <IconBadge size={40} tone={HP_TOKENS.blueSoft}>
                <HPGlyph name="gift" size={20} color={HP_TOKENS.blue} />
              </IconBadge>
              <Stack gap={1} style={{ flex: 1 }}>
                <span style={{ ...HP_TEXT.h, fontSize: 16 }}>{activeItem.reward_title}</span>
                <span style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft }}>
                  Diminta oleh: <b>{activeItem.user_name}</b> ({activeItem.points_spent} Poin)
                </span>
                {activeItem.user_notes && (
                  <div style={{ marginTop: 8, padding: 8, background: HP_TOKENS.infoWash, borderRadius: 6, ...HP_TEXT.small }}>
                    <b>Catatan Karyawan:</b> {activeItem.user_notes}
                  </div>
                )}
              </Stack>
            </Row>
          </HPCard>

          <Stack gap={3}>
            <div className="hp-form-row">
              <label style={HP_TEXT.label}>Catatan Anda (Opsional)</label>
              <textarea
                className="hp-input"
                placeholder="Misal: Sudah ditransfer ke rekening BNI..."
                value={reviewerNotes}
                onChange={e => setReviewerNotes(e.target.value)}
                rows={2}
              />
            </div>
            
            <div className="hp-form-row">
              <label style={HP_TEXT.label}>Link Bukti / Kode e-Voucher (Wajib untuk Selesai)</label>
              <input
                type="text"
                className="hp-input"
                placeholder="https://... atau Kode Voucher ABCD-1234"
                value={proofLink}
                onChange={e => setProofLink(e.target.value)}
              />
            </div>

            <Row gap={2} style={{ marginTop: 12 }}>
              <HPButton 
                variant="primary" 
                icon="check" 
                fullWidth 
                disabled={!proofLink || busy === activeItem.id}
                loading={busy === activeItem.id && activeItem.status !== 'rejected'}
                onClick={() => handleUpdateStatus(activeItem.id, 'fulfilled')}
              >
                Tandai Selesai & Kirim Bukti
              </HPButton>
              <HPButton 
                variant="danger" 
                icon="close" 
                fullWidth 
                disabled={!reviewerNotes.trim() || busy === activeItem.id}
                loading={busy === activeItem.id && activeItem.status === 'rejected'}
                onClick={() => {
                  if(confirm('Yakin ingin menolak penukaran ini? Poin karyawan akan dikembalikan.')) {
                    handleUpdateStatus(activeItem.id, 'rejected');
                  }
                }}
              >
                Tolak (Refund)
              </HPButton>
            </Row>
            {!reviewerNotes.trim() && (
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, marginTop: 6, textAlign: 'center' }}>
                * Isi catatan di atas untuk mengaktifkan tombol Tolak
              </div>
            )}
          </Stack>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Pengelolaan Reward (Fulfillment)" onClose={onClose}>
      <div style={{ padding: 16 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 20, color: HP_TOKENS.inkSoft }}>Memuat data...</div>
        ) : (
          <Stack gap={4}>
            <div>
              <div style={{ ...HP_TEXT.h, fontSize: 16, marginBottom: 12 }}>Menunggu Diproses ({pendingItems.length})</div>
              {pendingItems.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', background: HP_TOKENS.paper, borderRadius: 8, color: HP_TOKENS.inkSoft }}>
                  Tidak ada antrean penukaran saat ini.
                </div>
              ) : (
                <Stack gap={2}>
                  {pendingItems.map(r => (
                    <div key={r.id} style={{ padding: 12, border: `1px solid ${HP_TOKENS.line}`, borderRadius: 8, background: HP_TOKENS.card }}>
                      <Row justify="space-between" align="center">
                        <Stack gap={1} style={{ flex: 1 }}>
                          <span style={{ ...HP_TEXT.h, fontSize: 14 }}>{r.reward_title}</span>
                          <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkSoft }}>
                            Oleh: <b>{r.user_name}</b> • {r.points_spent} Poin • {new Date(r.created_at).toLocaleDateString()}
                          </span>
                          <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.warning, background: HP_TOKENS.warningWash, padding: '2px 6px', borderRadius: 4, width: 'fit-content' }}>
                            {r.status === 'pending_manager' ? 'Menunggu Manager' : 'Menunggu HR'}
                          </span>
                        </Stack>
                        <HPButton size="sm" variant="primary" onClick={() => setActiveItem(r)}>
                          Proses
                        </HPButton>
                      </Row>
                    </div>
                  ))}
                </Stack>
              )}
            </div>

            <div style={{ borderTop: `1px solid ${HP_TOKENS.lineSoft}`, paddingTop: 16 }}>
              <div style={{ ...HP_TEXT.h, fontSize: 16, marginBottom: 12 }}>Riwayat Selesai & Ditolak</div>
              {finishedItems.slice(0, 10).map(r => (
                <div key={r.id} style={{ padding: 12, borderBottom: `1px solid ${HP_TOKENS.lineSoft}` }}>
                  <Row justify="space-between">
                    <Stack gap={1}>
                      <span style={{ ...HP_TEXT.sub, fontSize: 14 }}>{r.reward_title}</span>
                      <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkSoft }}>{r.user_name} • {new Date(r.created_at).toLocaleDateString()}</span>
                    </Stack>
                    <span style={{ 
                      ...HP_TEXT.tiny, fontWeight: 'bold', 
                      color: r.status === 'fulfilled' ? HP_TOKENS.success : HP_TOKENS.danger 
                    }}>
                      {r.status.toUpperCase()}
                    </span>
                  </Row>
                </div>
              ))}
              {finishedItems.length === 0 && (
                <div style={{ color: HP_TOKENS.inkSoft, fontSize: 13 }}>Belum ada riwayat.</div>
              )}
            </div>
          </Stack>
        )}
      </div>
    </Modal>
  );
}

// A simple local card wrapper since HPCard is not imported
function HPCard({ children, padding = 16, style = {} }: any) {
  return <div style={{ padding, borderRadius: HP_TOKENS.radiusLg, border: `1px solid ${HP_TOKENS.line}`, ...style }}>{children}</div>;
}
