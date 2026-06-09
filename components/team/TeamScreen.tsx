"use client";

import React, { useMemo } from "react";
import { useHP, calculateLevelProgress } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import BlobBackground from "@/components/home/BlobBackground";
import SectionHeader from "@/components/home/SectionHeader";
import PresenceBoard from "@/components/home/PresenceBoard";
import LeaderboardWidget from "@/components/home/LeaderboardWidget";
import MoodWall from "@/components/home/MoodWall";

interface TeamScreenProps {
  openModal: (name: string, props?: any) => void;
}

export default function TeamScreen({ openModal }: TeamScreenProps) {
  const { state, user } = useHP();

  if (!state || !user) return null;

  return (
    <div style={{ position: 'relative', minHeight: '100%', paddingBottom: 120, fontFamily: HP_FONT }}>
      <BlobBackground colors={[HP_TOKENS.blueWash, HP_TOKENS.sageWash, HP_TOKENS.paper]}/>
      
      <div style={{ position: 'relative', zIndex: 1, padding: '0 16px', paddingTop: 72 }} className="hp-stagger">
        <div style={{ marginBottom: 24 }}>
          <div style={{ ...HP_TEXT.h, fontSize: 28, color: HP_TOKENS.ink, letterSpacing: -0.5 }}>
            Status Tim & Komunitas
          </div>
          <div style={{ ...HP_TEXT.body, color: HP_TOKENS.inkMute, marginTop: 4 }}>
            Lihat siapa yang sedang online dan pantau leaderboard!
          </div>
        </div>

        {/* Presence Board — Team status */}
        <div style={{ marginTop: 24 }}>
          <SectionHeader icon="people" label="Kehadiran Tim" />
          <PresenceBoard openModal={openModal} />
        </div>

        {/* Leaderboard */}
        <div style={{ marginTop: 32 }}>
          <LeaderboardWidget currentUserId={user.id} />
        </div>

        {/* Anonymous Mood Wall */}
        <div style={{ marginTop: 32 }}>
          <MoodWall />
        </div>
      </div>
    </div>
  );
}
