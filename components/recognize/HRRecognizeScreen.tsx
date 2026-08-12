"use client";

import React from "react";
import { useHP } from "@/lib/HPContext";
import { HP_FONT } from "@/components/ui";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/home/SectionHeader";
import PointsHeroCard from "@/components/recognize/PointsHeroCard";
import RewardGrid from "@/components/recognize/RewardGrid";
import RedeemHistoryList from "@/components/recognize/RedeemHistoryList";
import RewardInventoryList from "@/components/recognize/RewardInventoryList";

interface Props {
  openModal: (name: string, props?: any) => void;
}

/**
 * HR rewards: the same catalogue everyone else sees, plus the one thing that is
 * genuinely HR-only — managing the inventory behind it.
 */
export default function HRRecognizeScreen({ openModal }: Props) {
  const { state, updateState } = useHP();
  if (!state) return null;

  const rewards = state.rewards || [];
  const history = state.rewardHistory || [];
  const wishlistId = state.wishlistId || null;
  // Saldo belanja adalah `coins`; `points` adalah XP seumur hidup yang tidak
  // pernah berkurang saat menukar. Lihat catatan di RecognizeScreen.tsx.
  const points = state.coins ?? state.points ?? 0;

  const toggleWishlist = (r: any) =>
    updateState((s: any) => ({ ...s, wishlistId: s.wishlistId === r.id ? null : r.id }));

  const handleAdd = () =>
    openModal("reward_editor", {
      onSave: (newReward: any) => updateState({ rewards: [...rewards, newReward] }),
    });

  const handleEdit = (r: any) =>
    openModal("reward_editor", {
      reward: r,
      onSave: (updated: any) =>
        updateState({
          rewards: rewards.map((item: any) => (item.id === r.id ? updated : item)),
        }),
    });

  const handleDelete = (id: number | string) => {
    if (confirm("Hapus reward ini dari inventory?")) {
      updateState({ rewards: rewards.filter((r: any) => r.id !== id) });
    }
  };

  return (
    <div style={{ padding: "0 16px 120px", fontFamily: HP_FONT }}>
      <ScreenHeader title="Rewards" subtitle="Tukarkan poin atau kelola katalog reward" />

      <PointsHeroCard
        points={points}
        rewards={rewards}
        wishlistId={wishlistId}
        redeemedCount={history.length}
      />

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

      <SectionHeader
        icon="trophy"
        label="Kelola inventory"
        count={String(rewards.length)}
        action="Tambah reward"
        onAction={handleAdd}
      />
      <RewardInventoryList
        rewards={rewards}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
