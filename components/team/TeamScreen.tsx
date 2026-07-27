"use client";

import React from "react";
import { useHP } from "@/lib/HPContext";
import { HP_FONT, PageGrid } from "@/components/ui";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/home/SectionHeader";
import PresenceBoard from "@/components/home/PresenceBoard";
import LeaderboardWidget from "@/components/home/LeaderboardWidget";
import MoodWall from "@/components/home/MoodWall";

interface TeamScreenProps {
  openModal: (name: string, props?: any) => void;
}

/**
 * Team status. One centred column via `PageGrid` — the presence board, the
 * leaderboard podium and the mood wall all want a real measure, and none of
 * them is narrow enough to earn a side rail.
 *
 * What this replaces: a hand-rolled full-bleed column that ran the whole 1100px
 * of the screen container, sat on decorative colour blobs, and reserved 72px of
 * top padding for an app bar that has been sticky (and therefore self-spacing)
 * for a while now.
 */
export default function TeamScreen({ openModal }: TeamScreenProps) {
  const { state, user } = useHP();

  if (!state || !user) return null;

  return (
    <div style={{ fontFamily: HP_FONT }} className="hp-stagger">
      <PageGrid
        gap={6}
        main={<>
          <ScreenHeader
            title="Status Tim & Komunitas"
            subtitle="Lihat siapa yang sedang online dan pantau leaderboard"
          />

          <section>
            <SectionHeader tight icon="people" label="Kehadiran Tim" />
            <PresenceBoard openModal={openModal} />
          </section>

          <LeaderboardWidget currentUserId={user.id} />

          <MoodWall />
        </>}
      />
    </div>
  );
}
