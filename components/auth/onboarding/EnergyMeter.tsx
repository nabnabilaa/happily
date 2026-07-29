"use client";

import React from "react";
import {
  HP_TOKENS,
  HP_TEXT,
  Row,
  Stack,
  HPGlyph,
  motion,
  AnimatePresence,
  SPRING,
  useReducedMotion,
} from "@/components/ui";
import { ENERGY_PLANS, energyPlan } from "@/lib/onboardingUtils";

/**
 * How heavy the first working day should be.
 *
 * This replaces the tap-the-bee counter, whose own copy admitted it did
 * nothing ("nggak ada gunanya selain seru"). It was the flow's only piece of
 * real interaction and it spent twelve taps of the user's attention on a number
 * nothing ever read.
 *
 * The interaction survives — drag, springs, the bee reacting live — but the
 * value now decides something: how many priorities the app suggests and how
 * long the first focus block runs (`ENERGY_PLANS`). The consequence is printed
 * under the meter as you drag, so it never has to be taken on trust.
 *
 * Five discrete cells rather than a continuous track: a decision this coarse
 * shouldn't pretend to a precision it doesn't have, the cells clear 44px on
 * their own, and filling them is a transform, not a layout animation.
 */

interface Props {
  level: number;
  onChange: (level: number) => void;
}

const MAX = ENERGY_PLANS.length - 1;

export default function EnergyMeter({ level, onChange }: Props) {
  const reduce = useReducedMotion();
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const plan = energyPlan(level);

  const commit = React.useCallback(
    (next: number) => {
      const clamped = Math.min(MAX, Math.max(0, next));
      if (clamped === level) return;
      onChange(clamped);
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(8);
      }
    },
    [level, onChange],
  );

  /** Which cell a pointer at `clientX` is over. */
  const levelAt = React.useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    const ratio = (clientX - rect.left) / rect.width;
    return Math.min(MAX, Math.max(0, Math.floor(ratio * ENERGY_PLANS.length)));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    // Ignore secondary buttons so a right-click doesn't yank the value.
    if (e.button !== 0 && e.pointerType === "mouse") return;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    const next = levelAt(e.clientX);
    if (next !== null) commit(next);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const next = levelAt(e.clientX);
    if (next !== null) commit(next);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        e.preventDefault();
        commit(level + 1);
        return;
      case "ArrowLeft":
      case "ArrowDown":
        e.preventDefault();
        commit(level - 1);
        return;
      case "Home":
        e.preventDefault();
        commit(0);
        return;
      case "End":
        e.preventDefault();
        commit(MAX);
        return;
    }
    if (/^[1-5]$/.test(e.key)) {
      e.preventDefault();
      commit(Number(e.key) - 1);
    }
  };

  return (
    // The readout sits *above* the track on purpose: it is the reason to drag,
    // and a thumb on the track would cover it if it sat underneath. The bee
    // lives on the preview card at the top of the screen and already reacts to
    // this value — a second one here would be the same readout twice.
    <Stack gap={4}>
      <div
        style={{
          borderRadius: HP_TOKENS.radiusMd,
          border: `1px solid ${HP_TOKENS.line}`,
          background: HP_TOKENS.card,
          padding: "14px 16px",
          minHeight: 92,
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={plan.level}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <Stack gap={2}>
              <Row gap={2} align="center">
                <HPGlyph name="zap" size={16} color={HP_TOKENS.primaryInk} />
                <span style={{ ...HP_TEXT.h }}>{plan.label}</span>
              </Row>
              <span style={{ ...HP_TEXT.body, color: HP_TOKENS.inkSoft }}>{plan.blurb}</span>
              <Row gap={2} align="center" wrap>
                <Fact icon="check" text={`${plan.priorities} prioritas`} />
                <Fact icon="clock" text={`Fokus ${plan.focusMinutes} menit`} />
              </Row>
            </Stack>
          </motion.div>
        </AnimatePresence>
      </div>

      <Stack gap={2}>
        <Row justify="space-between" align="center">
          <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>Pelan-pelan</span>
          <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>Gas penuh</span>
        </Row>

        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label="Tingkat energi hari ini"
          aria-valuemin={0}
          aria-valuemax={MAX}
          aria-valuenow={level}
          aria-valuetext={`${plan.label}. ${plan.priorities} prioritas, fokus ${plan.focusMinutes} menit.`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          style={{
            display: "flex",
            gap: 6,
            // Comfortably past the 44px touch floor, and wide enough that
            // dragging across it is the obvious thing to do.
            height: 56,
            padding: 4,
            borderRadius: HP_TOKENS.radiusMd,
            background: HP_TOKENS.sunken,
            border: `1px solid ${HP_TOKENS.lineSoft}`,
            cursor: dragging ? "grabbing" : "pointer",
            touchAction: "none",
            userSelect: "none",
          }}
        >
          {ENERGY_PLANS.map((p) => {
            const on = p.level <= level;
            return (
              <div
                key={p.level}
                aria-hidden
                style={{
                  flex: 1,
                  borderRadius: HP_TOKENS.radiusXs,
                  background: HP_TOKENS.card,
                  border: `1px solid ${HP_TOKENS.lineSoft}`,
                  overflow: "hidden",
                }}
              >
                <motion.div
                  initial={false}
                  animate={{ scaleY: on ? 1 : 0 }}
                  transition={reduce ? { duration: 0.01 } : SPRING}
                  style={{
                    width: "100%",
                    height: "100%",
                    transformOrigin: "bottom",
                    borderRadius: HP_TOKENS.radiusXs,
                    background:
                      p.level === level ? HP_TOKENS.primary : HP_TOKENS.primarySoft,
                  }}
                />
              </div>
            );
          })}
        </div>
      </Stack>
    </Stack>
  );
}

function Fact({ icon, text }: { icon: string; text: string }) {
  return (
    <Row
      gap={1}
      align="center"
      style={{
        padding: "4px 10px",
        borderRadius: HP_TOKENS.radiusPill,
        background: HP_TOKENS.sunken,
      }}
    >
      <HPGlyph name={icon} size={12} color={HP_TOKENS.inkMute} />
      <span style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft }}>{text}</span>
    </Row>
  );
}
