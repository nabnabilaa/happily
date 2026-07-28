"use client";

import React from "react";
import { HP_TOKENS, HP_TEXT } from "@/lib/constants";

interface HPPlaceholderProps {
  label: string;
  h?: number;
  /** @deprecated placeholders are neutral now — colour is reserved for meaning */
  tone?: "sage" | "blue" | "yellow" | "coral";
  /** Show the shimmer treatment for content that is still loading. */
  loading?: boolean;
}

/**
 * Neutral stand-in for a region that has no content yet. Placeholders stay
 * grey on purpose: a coloured block reads as real content at a glance.
 */
export default function HPPlaceholder({ label, h = 120, loading = false }: HPPlaceholderProps) {
  if (loading) {
    return <div className="hp-skeleton" style={{ height: h, borderRadius: HP_TOKENS.radiusMd }} aria-hidden />;
  }

  return (
    <div
      style={{
        height: h,
        borderRadius: HP_TOKENS.radiusMd,
        background: HP_TOKENS.sunken,
        border: `1px dashed ${HP_TOKENS.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        textAlign: "center",
      }}
    >
      <span style={{ ...HP_TEXT.small, color: HP_TOKENS.inkFade }}>{label}</span>
    </div>
  );
}
