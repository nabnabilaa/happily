"use client";

import React from "react";
import { useHP } from "@/lib/HPContext";
import {
  HP_TOKENS,
  HP_TEXT,
  HP_CATEGORICAL,
  HPCard,
  HPButton,
  HPChip,
  HPBar,
  HPGlyph,
  Stack,
  Row,
  Spacer,
  Divider,
  IconBadge,
} from "@/components/ui";

interface RewardCardProps {
  title: string;
  points: number;
  /** Stored colour name. Only steers which categorical hue the icon gets. */
  tone?: string;
  glyph?: string;
  category?: string;
  description?: string;
  stock?: number;
  isWishlist?: boolean;
  onToggleWishlist?: (e: React.MouseEvent) => void;
  onRedeem?: () => void;
}

/**
 * A reward is not a status, so it never borrows `success`/`danger`. It gets one
 * categorical hue, and only on its icon — the card itself stays on the neutral
 * surface like every other card in the app. Depth is the hairline border.
 */

/** Tone names in the data, folded onto the eight categorical hues. */
const TONE_HUE: Record<string, number> = {
  blue: 0, indigo: 0,
  teal: 5, sage: 1, green: 1,
  orange: 2, amber: 2, yellow: 2,
  purple: 3, lavender: 3,
  magenta: 4, pink: 4, coral: 4, red: 4,
  slate: 7, grey: 7, gray: 7,
};

/** Stable per-title hue, so a reward keeps its colour across pages and filters. */
function hueFor(tone: string | undefined, title: string) {
  if (tone && tone !== "blue" && TONE_HUE[tone] !== undefined) return TONE_HUE[tone];
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) % 997;
  return h % HP_CATEGORICAL.length;
}

/** Glyph names only — emoji render differently per platform and can't be themed. */
const GLYPH_BY_KEY: Record<string, string> = {
  gift: "gift", trophy: "trophy", star: "star", heart: "heart", zap: "zap",
  tree: "tree", book: "book", leaf: "leaf", target: "target", medal: "medal",
  refresh: "book", people: "people", coffee: "sparkle", food: "heart",
  ticket: "ticket", shirt: "shirt", card: "ticket", headset: "zap",
  bag: "gift", car: "car",
};

const GLYPH_BY_KEYWORD: [RegExp, string][] = [
  [/gofood|makan|lunch|food|snack/, "heart"],
  [/tiket|cinema|bioskop|ticket|voucher|saldo|pulsa|wallet|tokopedia/, "ticket"],
  [/tumbler|kopi|coffee|drink|minum/, "sparkle"],
  [/hoodie|baju|kaos|jaket|merch/, "shirt"],
  [/headset|audio|bluetooth|gadget/, "zap"],
  [/cuti|libur|leave|wfh/, "tree"],
  [/donasi|sosial|charity/, "leaf"],
  [/kelas|workshop|kursus|training|buku/, "book"],
  [/wellness|sehat|spa|massage|yoga/, "people"],
  [/transport|ojek|grab|bensin/, "car"],
];

function glyphFor(title: string, glyphKey?: string, category?: string) {
  if (glyphKey && GLYPH_BY_KEY[glyphKey]) return GLYPH_BY_KEY[glyphKey];
  const haystack = `${title} ${category ?? ""}`.toLowerCase();
  for (const [re, name] of GLYPH_BY_KEYWORD) if (re.test(haystack)) return name;
  return "gift";
}

export default function RewardCard({
  title,
  points,
  tone,
  glyph,
  category,
  description,
  stock,
  isWishlist = false,
  onToggleWishlist,
  onRedeem,
}: RewardCardProps) {
  const { state, updateState, updateUser, user, notify } = useHP();

  const hue = HP_CATEGORICAL[hueFor(tone, title)];
  const glyphName = glyphFor(title, glyph, category);

  const userCoins = state?.points ?? state?.coins ?? 0;
  const soldOut = stock !== undefined && stock <= 0;
  const short = Math.max(0, points - userCoins);
  const isLocked = short > 0;
  const canRedeem = !isLocked && !soldOut;

  const handleRedeem = () => {
    if (isLocked) {
      notify("Poin Belum Cukup", `Kurang ${short.toLocaleString("id-ID")} poin lagi untuk reward ini.`, "warning");
      return;
    }
    if (onRedeem) return onRedeem();
    if (!state) return;

    if (confirm(`Tukar ${points.toLocaleString("id-ID")} poin dengan "${title}"?`)) {
      const remaining = userCoins - points;
      updateState((s: any) => ({
        ...s,
        points: remaining,
        coins: remaining,
        rewardHistory: [
          ...(s.rewardHistory || []),
          { id: Date.now(), title, points, date: new Date().toISOString(), glyph: glyphName },
        ],
      }));
      updateUser({ points: remaining, coins: remaining });
      notify("Reward Ditukar!", `Kamu berhasil menukarkan ${title}.`, "success");
    }
  };

  return (
    <HPCard
      padding={0}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        // The one place a wishlist card differs: a honey rule, not a louder
        // fill. Set as the full `border` shorthand — a bare `borderColor` here
        // would be spread over HPCard's own `border`, and React clears an
        // `undefined` value, which drops border-color back to `currentColor`
        // (i.e. near-black ink) instead of leaving the token in place.
        ...(isWishlist ? { border: `1px solid ${HP_TOKENS.yellow}` } : null),
      }}
    >
      <Stack gap={3} style={{ padding: 16, flex: 1 }}>
        <Row gap={3} align="flex-start">
          <IconBadge
            size={44}
            tone={`color-mix(in srgb, ${hue} 12%, transparent)`}
          >
            <HPGlyph name={glyphName} size={21} color={hue} />
          </IconBadge>

          <Stack gap={1} style={{ flex: 1 }}>
            {isWishlist && (
              <HPChip tone="honey" style={{ alignSelf: "flex-start" }}>
                Wishlist kamu
              </HPChip>
            )}
            <h3 style={{ ...HP_TEXT.sub, margin: 0 }}>{title}</h3>
            {description && (
              <p
                style={{
                  ...HP_TEXT.small,
                  margin: 0,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {description}
              </p>
            )}
          </Stack>

          {onToggleWishlist && (
            <button
              type="button"
              onClick={onToggleWishlist}
              aria-pressed={isWishlist}
              aria-label={isWishlist ? `Hapus ${title} dari wishlist` : `Jadikan ${title} wishlist`}
              className="hp-tap"
              style={{
                width: 36,
                height: 36,
                marginTop: -4,
                marginRight: -4,
                flexShrink: 0,
                borderRadius: HP_TOKENS.radiusPill,
                background: isWishlist ? HP_TOKENS.yellowSoft : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background-color 140ms var(--hp-ease)",
              }}
            >
              <HPGlyph
                name="star"
                size={17}
                color={isWishlist ? HP_TOKENS.yellowDark : HP_TOKENS.inkFade}
              />
            </button>
          )}
        </Row>

        {/* Progress only appears when it says something the number doesn't.
            `marginTop: auto` parks it directly above the footer rule, so it
            lands on the same line in every card however long the title runs. */}
        {isLocked && !soldOut && (
          <Stack gap={2} style={{ marginTop: "auto" }}>
            <HPBar
              value={(userCoins / points) * 100}
              tone="honey"
              height={5}
              label={`Progres menuju ${title}`}
            />
            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute }}>
              Kurang <strong style={{ color: HP_TOKENS.ink }}>{short.toLocaleString("id-ID")}</strong> poin lagi
            </div>
          </Stack>
        )}
      </Stack>

      <Divider />

      <Row gap={3} style={{ padding: "12px 16px" }}>
        <Row gap={1} align="baseline">
          <HPGlyph name="star" size={14} color={HP_TOKENS.yellowDark} />
          <span style={{ ...HP_TEXT.bodyStrong, fontVariantNumeric: "tabular-nums" }}>
            {points.toLocaleString("id-ID")}
          </span>
          <span style={{ ...HP_TEXT.small }}>poin</span>
        </Row>

        {soldOut ? (
          <HPChip tone="danger">Stok habis</HPChip>
        ) : stock !== undefined && stock <= 5 ? (
          <HPChip tone="warning">Sisa {stock}</HPChip>
        ) : null}

        <Spacer />

        <HPButton
          size="sm"
          variant={canRedeem ? "primary" : "secondary"}
          disabled={!canRedeem}
          onClick={handleRedeem}
          iconEnd={canRedeem ? "arrow" : undefined}
          icon={canRedeem ? undefined : "lock"}
          aria-label={`Tukar ${title} dengan ${points} poin`}
        >
          {soldOut ? "Habis" : isLocked ? "Terkunci" : "Tukar"}
        </HPButton>
      </Row>
    </HPCard>
  );
}
