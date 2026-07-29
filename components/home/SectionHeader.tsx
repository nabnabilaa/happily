"use client";

import React from "react";
import { HP_TOKENS, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";

interface SectionHeaderProps {
  icon: string;
  label: string;
  count?: string;
  action?: string;
  onAction?: () => void;
  /**
   * Drop the large leading gap. Use inside a rail or a card, where the
   * surrounding container already provides the separation and 32px of air
   * above the heading just looks like a mistake.
   */
  tight?: boolean;
}

/**
 * Divides a screen into labelled groups. Renders an <h2> so sections show up
 * in the document outline.
 *
 * The action reads as a text link rather than a filled button: a section
 * header is a signpost, and a solid button here competes with the real
 * primary action inside the section.
 */
export default function SectionHeader({
  icon,
  label,
  count,
  action,
  onAction,
  tight = false,
}: SectionHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: tight ? "0 2px 10px" : "32px 2px 12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
        <HPGlyph name={icon} size={17} color={HP_TOKENS.inkMute} stroke={2} />
        <h2
          style={{
            ...HP_TEXT.h,
            fontSize: 16,
            margin: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </h2>
        {count && (
          <span
            style={{
              ...HP_TEXT.small,
              color: HP_TOKENS.inkFade,
              fontVariantNumeric: "tabular-nums",
              flexShrink: 0,
            }}
          >
            {count}
          </span>
        )}
      </div>

      {action && (
        <button
          type="button"
          onClick={onAction}
          className="hp-tap"
          style={{
            flexShrink: 0,
            // 44px target even though the text is small
            minHeight: 44,
            padding: "0 4px",
            color: HP_TOKENS.primaryInk,
            fontSize: 13.5,
            fontWeight: 600,
            letterSpacing: "-0.005em",
            whiteSpace: "nowrap",
            borderRadius: HP_TOKENS.radiusXs,
          }}
        >
          {action}
        </button>
      )}
    </div>
  );
}
