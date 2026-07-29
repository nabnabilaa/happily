"use client";

import React from "react";
import { motion, useReducedMotion } from "@/components/ui";
import { ONBOARDING_CONFETTI } from "@/lib/palettes";

/**
 * One-shot confetti fall for the final stage.
 *
 * Transform and opacity only, and it renders nothing at all under reduced
 * motion — a celebration is the definition of decorative, so there is no
 * information to preserve when the user has asked for stillness.
 */

interface Piece {
  left: number;
  size: number;
  ratio: number;
  colour: string;
  delay: number;
  duration: number;
  spin: number;
  drift: number;
  round: boolean;
}

function build(count: number): Piece[] {
  return Array.from({ length: count }, (_, i) => {
    const size = 5 + Math.random() * 9;
    const round = Math.random() > 0.62;
    return {
      left: Math.random() * 100,
      size,
      ratio: round ? 1 : 0.42,
      colour: ONBOARDING_CONFETTI[i % ONBOARDING_CONFETTI.length],
      delay: Math.random() * 1.6,
      duration: 2.6 + Math.random() * 2.2,
      spin: (Math.random() - 0.5) * 720,
      drift: (Math.random() - 0.5) * 90,
      round,
    };
  });
}

export default function Confetti({ count = 64 }: { count?: number }) {
  const reduce = useReducedMotion();
  const pieces = React.useMemo(() => build(count), [count]);

  if (reduce) return null;

  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 1 }}>
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          initial={{ y: "-12vh", opacity: 0, rotate: 0 }}
          animate={{ y: "108vh", opacity: [0, 1, 1, 0], x: p.drift, rotate: p.spin }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "linear",
            opacity: { duration: p.duration, delay: p.delay, times: [0, 0.08, 0.75, 1] },
          }}
          style={{
            position: "absolute",
            top: 0,
            left: `${p.left}%`,
            width: p.size,
            height: p.size * p.ratio,
            background: p.colour,
            borderRadius: p.round ? "50%" : 2,
          }}
        />
      ))}
    </div>
  );
}
