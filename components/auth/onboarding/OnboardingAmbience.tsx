"use client";

import React from "react";
import { HP_TOKENS, motion, useReducedMotion } from "@/components/ui";

/**
 * The surface every onboarding stage sits on.
 *
 * This used to be three blurred colour blobs drifting under a dot grid. That is
 * the visual language of a landing page, not of a calm productivity app: it
 * competed with the card the user is assembling and it dated the whole flow.
 *
 * What is left is deliberately almost silent — one soft wash behind the viewing
 * area so the preview card has something to lift off, and a hairline grid that
 * fades out before it reaches the controls. The interest in this screen is
 * meant to come from the thing being built, not from the wallpaper.
 *
 * The single slow breath is the only movement, and it stops entirely under
 * reduced motion.
 */
export default function OnboardingAmbience() {
  const reduce = useReducedMotion();

  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {/* Hairline grid, masked to the top so it never sits behind the options. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(circle at 1px 1px, ${HP_TOKENS.line} 1px, transparent 0)`,
          backgroundSize: "28px 28px",
          opacity: 0.4,
          maskImage: "linear-gradient(180deg, black 0%, transparent 46%)",
          WebkitMaskImage: "linear-gradient(180deg, black 0%, transparent 46%)",
        }}
      />

      {/* One wash behind the viewing area. Scale and opacity only. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={reduce ? { opacity: 1 } : { opacity: [0.85, 1, 0.85], scale: [1, 1.05, 1] }}
        transition={
          reduce ? { duration: 0.2 } : { duration: 14, repeat: Infinity, ease: "easeInOut" }
        }
        style={{
          position: "absolute",
          top: "-26%",
          left: "50%",
          width: "150%",
          height: "72%",
          marginLeft: "-75%",
          background: `radial-gradient(ellipse at 50% 60%, ${HP_TOKENS.primaryWash} 0%, transparent 68%)`,
        }}
      />
    </div>
  );
}
