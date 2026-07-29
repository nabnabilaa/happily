"use client";

import React from "react";
import {
  HP_TOKENS,
  HP_TEXT,
  HPCard,
  HPButton,
  HPGlyph,
  Stack,
  Row,
  IconBadge,
  motion,
  useReducedMotion,
} from "@/components/ui";

/**
 * The one-minute breathing session, surfaced as a real card.
 *
 * This used to be one row in an "Lainnya" shortcut list at the bottom of the
 * rail — i.e. the very last thing on the page on a phone, filed next to
 * "Panduan sistem". A regulated breath is the fastest thing this app can do
 * for someone having a bad afternoon, so it gets a card of its own.
 *
 * Two things were wrong with the previous card:
 *
 * 1. It advertised box breathing, 4-4-4-4. `PauseModal` — the thing the button
 *    actually opens — runs 4-7-8 ("Pojok Tenang · Metode 4-7-8"). The card was
 *    describing a session the app doesn't have. The modal is the feature, so
 *    the card follows the modal.
 * 2. The rhythm was four equal tiles reading "4 4 4 4". Four identical numbers
 *    in four identical boxes carry no information — they look like a rendering
 *    bug, and they use the widest possible layout to say one number.
 *
 * The strip is now a single track whose three segments are *proportional to
 * their seconds* (4 : 7 : 8), so the shape itself says the exhale is twice the
 * inhale — which is the entire point of the technique. A sweep fills across it
 * on the real 19s cycle, and the ring on the glyph inflates, holds and
 * releases on that same clock, so the card previews the session rather than
 * describing it.
 */

/** The cycle `PauseModal` actually runs. Keep these in step with it. */
const PHASES = [
  { label: "Tarik", secs: 4 },
  { label: "Tahan", secs: 7 },
  { label: "Buang", secs: 8 },
] as const;

const CYCLE = PHASES.reduce((n, p) => n + p.secs, 0); // 19s

/** Cumulative cycle position, 0–1, at the start of each phase. */
const STARTS = PHASES.reduce<number[]>((acc, p, i) => {
  acc.push((acc[i - 1] ?? 0) + (i === 0 ? 0 : PHASES[i - 1].secs / CYCLE));
  return acc;
}, []);

interface BreathingCardProps {
  openModal: (name: string, props?: any) => void;
  /** Compact form for the rail. Keeps the track, drops the phase labels. */
  compact?: boolean;
}

export default function BreathingCard({ openModal, compact = false }: BreathingCardProps) {
  const reduced = useReducedMotion();

  const loop = { duration: CYCLE, repeat: Infinity, ease: "linear" as const };

  return (
    <HPCard
      padding={compact ? 16 : 18}
      style={{ background: HP_TOKENS.successWash, border: `1px solid ${HP_TOKENS.successSoft}` }}
    >
      <Stack gap={compact ? 3 : 4}>
        <Row gap={3}>
          {/* Ring on the 4-7-8 clock: 4s to inflate, 7s holding at full, 8s to
              release. The card breathes at the speed you will. */}
          <div
            style={{
              position: "relative",
              width: 44,
              height: 44,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <motion.span
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: `1.5px solid ${HP_TOKENS.success}`,
                opacity: 0.35,
              }}
              animate={reduced ? undefined : { scale: [0.68, 1, 1, 0.68] }}
              transition={
                reduced
                  ? undefined
                  : {
                      duration: CYCLE,
                      times: [0, STARTS[1], STARTS[2], 1],
                      repeat: Infinity,
                      ease: "easeInOut",
                    }
              }
            />
            <IconBadge size={28} tone={HP_TOKENS.successSoft}>
              <HPGlyph name="leaf" size={14} color={HP_TOKENS.successInk} />
            </IconBadge>
          </div>

          {/* Text stays ink. `success` clears only ~4.0:1 on white and ~3.8:1 on
              its own wash, so colouring labels with it would fail the 4.5:1
              floor. The tone belongs to the glyph, the track and the surface,
              which are non-text and only need 3:1. */}
          <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
            <span style={{ ...HP_TEXT.tiny }}>Pojok tenang</span>
            <span style={{ ...HP_TEXT.h, marginTop: 2 }}>Napas 4-7-8</span>
          </Stack>
        </Row>

        <p style={{ ...HP_TEXT.small, margin: 0 }}>
          Tarik empat hitungan, tahan tujuh, buang delapan — buangnya sengaja dua
          kali lebih panjang, itu yang menurunkan detak jantung. Lima putaran,
          sekitar satu setengah menit.
        </p>

        {/* Rhythm track. Widths are the seconds: 4 : 7 : 8. Nothing here is
            decoration — the proportion is the instruction. */}
        <Stack gap={2}>
          <Row gap={1} style={{ alignItems: "stretch" }}>
            {PHASES.map((p, i) => (
              <div
                key={i}
                style={{
                  flex: p.secs,
                  minWidth: 0,
                  height: 8,
                  borderRadius: HP_TOKENS.radiusPill,
                  background: HP_TOKENS.card,
                  overflow: "hidden",
                }}
              >
                {/* Each segment fills only during its own phase, then all three
                    clear together at the top of the next cycle. One linear
                    19s timeline drives all of them, so they can't drift apart. */}
                <motion.div
                  aria-hidden
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: HP_TOKENS.radiusPill,
                    background: HP_TOKENS.success,
                    transformOrigin: "left center",
                    scaleX: reduced ? 1 : 0,
                    opacity: reduced ? 0.4 : 1,
                  }}
                  animate={
                    reduced
                      ? undefined
                      : {
                          scaleX:
                            i === 0
                              ? [0, 1, 1]
                              : i === 1
                                ? [0, 0, 1, 1]
                                : [0, 0, 1],
                        }
                  }
                  transition={
                    reduced
                      ? undefined
                      : {
                          ...loop,
                          times:
                            i === 0
                              ? [0, STARTS[1], 1]
                              : i === 1
                                ? [0, STARTS[1], STARTS[2], 1]
                                : [0, STARTS[2], 1],
                        }
                  }
                />
              </div>
            ))}
          </Row>

          {/* Labels sit under their own segment and inherit its width, so the
              number and the length of the bar are the same statement. Dropped
              in the rail, where 4/19 of the column is too narrow for a word. */}
          {!compact && (
            <Row gap={1} style={{ alignItems: "flex-start" }}>
              {PHASES.map((p, i) => (
                <div key={i} style={{ flex: p.secs, minWidth: 0 }}>
                  <div
                    style={{
                      ...HP_TEXT.tiny,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {p.label}
                  </div>
                  <div
                    style={{
                      ...HP_TEXT.bodyStrong,
                      fontSize: 14,
                      color: HP_TOKENS.ink,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {p.secs}
                    <span style={{ ...HP_TEXT.small, marginLeft: 2 }}>dtk</span>
                  </div>
                </div>
              ))}
            </Row>
          )}

          {compact && (
            <span style={{ ...HP_TEXT.small }}>
              Tarik 4 · Tahan 7 · Buang 8 detik
            </span>
          )}
        </Stack>

        {/* Plain primary. Repainting it green would be a second accent *and*
            would put white on `success` at ~4.0:1, under the floor for a 13px
            label. Primary blue on white clears it. */}
        <HPButton variant="primary" size="sm" icon="play" fullWidth onClick={() => openModal("pause")}>
          Mulai sekarang
        </HPButton>
      </Stack>
    </HPCard>
  );
}
