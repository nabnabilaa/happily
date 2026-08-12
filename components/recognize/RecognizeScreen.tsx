"use client";

import React from "react";
import { useHP } from "@/lib/HPContext";
import { HP_FONT } from "@/components/ui";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/home/SectionHeader";
import PointsHeroCard from "@/components/recognize/PointsHeroCard";
import RewardGrid from "@/components/recognize/RewardGrid";
import RedeemHistoryList from "@/components/recognize/RedeemHistoryList";

interface RecognizeScreenProps {
  openModal: (name: string, props?: any) => void;
}

/**
 * Employee rewards. Composition only — the hero, the catalogue and the history
 * are shared components so manager and HR get every change for free.
 */
export default function RecognizeScreen({ openModal }: RecognizeScreenProps) {
  const { state, updateState } = useHP();
  if (!state) return null;

  const rewards = state.rewards || [];
  const history = state.rewardHistory || [];
  const wishlistId = state.wishlistId || null;

  /*
   * Yang ditampilkan di sini adalah KOIN, bukan poin.
   *
   * Keduanya naik bersamaan saat menyelesaikan pekerjaan, tapi hanya `coins`
   * yang dipotong saat menukar reward (`UPDATE users SET coins = coins - ?` di
   * app/api/rewards/redemptions/route.ts). Jadi `points` adalah XP seumur hidup
   * dan selalu >= saldo belanja yang sebenarnya.
   *
   * Versi sebelumnya membaca `state.points`, dan akibatnya persis keluhan yang
   * dilaporkan: setelah menukar reward, angka di layar tidak berubah — poinnya
   * memang tidak pernah berkurang. Lebih buruk lagi, garis "bisa ditukar" di
   * PointsHeroCard ikut dihitung dari angka yang terlalu besar, jadi reward
   * ditawarkan padahal server akan menolaknya dengan "Koin tidak cukup".
   */
  const points = state.coins ?? state.points ?? 0;

  const toggleWishlist = (r: any) =>
    updateState((s: any) => ({ ...s, wishlistId: s.wishlistId === r.id ? null : r.id }));

  return (
    <div style={{ padding: "0 16px 120px", fontFamily: HP_FONT }}>
      <ScreenHeader title="Rewards" subtitle="Tukarkan poin atau pantau wishlist kamu" />

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
    </div>
  );
}
