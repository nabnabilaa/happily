"use client";

import React from "react";
import { HP_TOKENS, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import { FadeIn } from "@/components/ui/motion";

interface EmptyStateProps {
  /** Glyph name. Kept muted — the message carries the meaning, not the icon. */
  icon?: string;
  title: string;
  /** One sentence explaining what will appear here, or what to do next. */
  description?: string;
  /** Primary next step. An empty state without an action is a dead end. */
  action?: React.ReactNode;
  compact?: boolean;
}

export default function EmptyState({
  icon = "sparkle",
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <FadeIn
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 6,
        padding: compact ? "28px 20px" : "48px 24px",
      }}
    >
      <div
        aria-hidden
        style={{
          width: compact ? 44 : 56,
          height: compact ? 44 : 56,
          borderRadius: "50%",
          background: HP_TOKENS.sunken,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        }}
      >
        <HPGlyph name={icon} size={compact ? 20 : 24} color={HP_TOKENS.inkMute} />
      </div>

      <h3 style={{ ...HP_TEXT.h, fontSize: compact ? 16 : 18, margin: 0 }}>{title}</h3>

      {description && (
        <p style={{ ...HP_TEXT.body, maxWidth: "38ch", margin: 0 }}>{description}</p>
      )}

      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </FadeIn>
  );
}
