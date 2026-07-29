"use client";

import React from "react";
import {
  HP_TOKENS,
  HP_TEXT,
  HPCard,
  HPGlyph,
  HPBar,
  Stack,
  Row,
  Spacer,
  Divider,
  IconBadge,
} from "@/components/ui";

interface PointsHeroCardProps {
  points: number;
  rewards: any[];
  /** Which reward the user starred, if any. It becomes the goal shown below. */
  wishlistId?: number | string | null;
  redeemedCount?: number;
}

/**
 * The points balance, and the one reward that balance is heading towards.
 *
 * This used to be a saturated primary banner with a trophy emoji and a text
 * shadow. A screen's biggest surface shouldn't be its loudest — the figure is
 * already the largest thing here, so the card can stay on the normal surface.
 */
export default function PointsHeroCard({
  points,
  rewards,
  wishlistId,
  redeemedCount = 0,
}: PointsHeroCardProps) {
  // The goal is whatever the user starred; failing that, the cheapest reward
  // still out of reach. Once everything is affordable there's nothing to chase.
  const goal = React.useMemo(() => {
    const starred = rewards.find((r) => r.id === wishlistId);
    if (starred) return starred;
    return rewards
      .filter((r) => r.points > points && (r.stock === undefined || r.stock > 0))
      .sort((a, b) => a.points - b.points)[0];
  }, [rewards, wishlistId, points]);

  const short = goal ? Math.max(0, goal.points - points) : 0;
  const affordable = rewards.filter(
    (r) => r.points <= points && (r.stock === undefined || r.stock > 0)
  ).length;

  return (
    <HPCard padding={20}>
      <Row gap={4} align="flex-start">
        <Stack gap={1}>
          <div style={{ ...HP_TEXT.tiny }}>Poin kamu</div>
          <Row gap={2} align="baseline">
            <span style={{ ...HP_TEXT.metric }}>{points.toLocaleString("id-ID")}</span>
            <span style={{ ...HP_TEXT.small }}>poin</span>
          </Row>
        </Stack>

        <Spacer />

        <IconBadge size={44} tone={HP_TOKENS.yellowSoft}>
          <HPGlyph name="trophy" size={22} color={HP_TOKENS.yellowInk} />
        </IconBadge>
      </Row>

      <Row gap={4} wrap style={{ marginTop: 14 }}>
        <Row gap={2}>
          <HPGlyph name="gift" size={15} color={HP_TOKENS.inkMute} />
          <span style={{ ...HP_TEXT.small }}>
            <strong style={{ color: HP_TOKENS.ink }}>{affordable}</strong> reward bisa ditukar
          </span>
        </Row>
        <Row gap={2}>
          <HPGlyph name="history" size={15} color={HP_TOKENS.inkMute} />
          <span style={{ ...HP_TEXT.small }}>
            <strong style={{ color: HP_TOKENS.ink }}>{redeemedCount}</strong> sudah ditukar
          </span>
        </Row>
      </Row>

      {goal && short > 0 && (
        <>
          <Divider spacing={4} />
          <Stack gap={2}>
            <Row gap={3}>
              <span style={{ ...HP_TEXT.small, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Menuju <strong style={{ color: HP_TOKENS.ink }}>{goal.title}</strong>
              </span>
              <Spacer />
              <span style={{ ...HP_TEXT.small, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                {points.toLocaleString("id-ID")} / {goal.points.toLocaleString("id-ID")}
              </span>
            </Row>
            <HPBar
              value={(points / goal.points) * 100}
              tone="honey"
              height={6}
              label={`Progres menuju ${goal.title}`}
            />
            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute }}>
              Kurang {short.toLocaleString("id-ID")} poin lagi.
            </div>
          </Stack>
        </>
      )}
    </HPCard>
  );
}
