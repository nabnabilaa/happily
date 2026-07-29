"use client";

import React from "react";
import {
  HP_TOKENS,
  HP_TEXT,
  HPCard,
  HPButton,
  HPChip,
  HPBar,
  HPGlyph,
  HPAvatar,
  Stack,
  Row,
  Spacer,
  Divider,
} from "@/components/ui";

interface UserProfileCardProps {
  user: any;
  levelProgress: number;
  openModal: (name: string, props?: any) => void;
}

/**
 * Who you are and how far along you are.
 *
 * This lives in a 340px rail, which is what the previous version got wrong: it
 * put the name and the level chips on one row (a `.hp-profile-name-group`
 * helper, now deleted with its last caller), and
 * with the avatar, guide button and streak chip beside them the name was pushed
 * out of the card entirely. Everything that can grow now has `minWidth: 0`, and
 * the identity stacks instead of competing for the same line.
 */
export default function UserProfileCard({ user, levelProgress, openModal }: UserProfileCardProps) {
  if (!user) return null;

  const pct = Math.round(Math.max(0, Math.min(1, levelProgress)) * 100);

  return (
    <HPCard padding={18}>
      <Row gap={3} align="flex-start">
        {/* The identity is the button — the controls beside it are their own,
            so nothing nests inside anything clickable. */}
        <button
          type="button"
          onClick={() => openModal("profile_editor")}
          className="hp-tap"
          aria-label="Buka profil"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flex: 1,
            minWidth: 0,
            padding: 0,
            background: "transparent",
            border: "none",
            font: "inherit",
            color: "inherit",
            textAlign: "left",
            cursor: "pointer",
            borderRadius: HP_TOKENS.radiusSm,
          }}
        >
          <HPAvatar name={user.name} size={52} rank={user.rank} levelProgress={levelProgress} />

          <Stack gap={1} style={{ minWidth: 0 }}>
            <span
              style={{
                ...HP_TEXT.h,
                fontSize: 17,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.name.split(" ")[0]}
            </span>
            <Row gap={2} wrap>
              <HPChip tone="primary">Lv.{user.level}</HPChip>
              <span style={{ ...HP_TEXT.small }}>Class {user.rank || "E"}</span>
            </Row>
          </Stack>
        </button>

        <Row gap={2} style={{ flexShrink: 0 }}>
          <HPChip tone="honey" size="lg">
            <HPGlyph name="zap" size={13} color="currentColor" />
            {user.streak}
          </HPChip>
          <HPButton
            size="sm"
            iconOnly
            icon="book"
            aria-label="Riwayat & Logbook"
            onClick={() => openModal("logbook")}
          />
          <HPButton
            size="sm"
            iconOnly
            icon="sparkle"
            aria-label="Panduan sistem"
            onClick={() => openModal("system_guide")}
          />
        </Row>
      </Row>

      <Divider spacing={4} />

      <Row gap={4} align="flex-end">
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Row gap={2}>
            <span style={{ ...HP_TEXT.tiny }}>Level progress</span>
            <Spacer />
            <span style={{ ...HP_TEXT.small, fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
          </Row>
          <HPBar value={pct} tone="honey" height={6} label={`Progres ke level ${user.level + 1}`} />
        </Stack>

        <Stack gap={1} align="flex-end" style={{ flexShrink: 0 }}>
          <span style={{ ...HP_TEXT.tiny }}>Total poin</span>
          <span style={{ ...HP_TEXT.title, fontVariantNumeric: "tabular-nums" }}>
            {Number(user.points || 0).toLocaleString("id-ID")}
          </span>
        </Stack>
      </Row>
    </HPCard>
  );
}
