"use client";

import React from "react";
import { HP_TEXT, HP_TOKENS } from "@/lib/constants";
import { FadeIn } from "@/components/ui/motion";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Small uppercase line above the title. Keep to 1–3 words. */
  eyebrow?: string;
  /** Trailing controls — filter, settings, primary action. */
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * The one large title on a screen. Renders as an <h1> so the page has a real
 * document outline for screen readers and the browser's heading navigation.
 */
export default function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  action,
  style,
}: ScreenHeaderProps) {
  return (
    <FadeIn
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
        padding: "4px 0 24px",
        ...style,
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        {eyebrow && (
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.primary, marginBottom: 8 }}>
            {eyebrow}
          </div>
        )}
        <h1 style={{ ...HP_TEXT.display, margin: 0 }}>{title}</h1>
        {subtitle && (
          <p style={{ ...HP_TEXT.body, marginTop: 8, maxWidth: "60ch" }}>{subtitle}</p>
        )}
      </div>

      {action && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, paddingTop: 4 }}>
          {action}
        </div>
      )}
    </FadeIn>
  );
}
