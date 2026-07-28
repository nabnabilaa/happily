"use client";

import React from "react";
import { HP_TOKENS, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import { Press } from "@/components/ui/motion";

interface ListRowProps {
  /** Avatar, icon badge, checkbox — anything that identifies the row. */
  leading?: React.ReactNode;
  title: React.ReactNode;
  /** One line of supporting text. Truncates rather than wrapping. */
  subtitle?: React.ReactNode;
  /** Chips, timestamps, counts. */
  trailing?: React.ReactNode;
  onClick?: () => void;
  /** Show the chevron. Defaults to on when the row is clickable. */
  chevron?: boolean;
  /** Dim the row and block interaction, e.g. a completed task. */
  muted?: boolean;
  /** Let the subtitle wrap to two lines instead of truncating. */
  wrapSubtitle?: boolean;
  ariaLabel?: string;
}

/**
 * The standard "avatar + text + trailing" row. Used for members, tasks,
 * notifications, rewards — anything list-shaped.
 *
 * Rows clear the 44px touch minimum and, when clickable, render as buttons so
 * they're keyboard reachable.
 */
export default function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  onClick,
  chevron,
  muted = false,
  wrapSubtitle = false,
  ariaLabel,
}: ListRowProps) {
  const showChevron = chevron ?? Boolean(onClick);

  const truncate: React.CSSProperties = wrapSubtitle
    ? {
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }
    : { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

  const inner = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        minHeight: 56,
        padding: "10px 2px",
        opacity: muted ? 0.55 : 1,
        transition: "opacity 180ms var(--hp-ease)",
      }}
    >
      {leading && <div style={{ flexShrink: 0, display: "flex" }}>{leading}</div>}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...HP_TEXT.sub, ...truncate, textDecoration: muted ? "line-through" : undefined }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ ...HP_TEXT.small, marginTop: 2, ...truncate }}>{subtitle}</div>
        )}
      </div>

      {trailing && (
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
          {trailing}
        </div>
      )}

      {showChevron && (
        <HPGlyph name="chevronRight" size={16} color={HP_TOKENS.inkFade} />
      )}
    </div>
  );

  if (!onClick) return inner;

  return (
    <Press scale={0.99} style={{ display: "block" }}>
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        style={{
          width: "100%",
          textAlign: "left",
          font: "inherit",
          color: "inherit",
          borderRadius: HP_TOKENS.radiusSm,
        }}
      >
        {inner}
      </button>
    </Press>
  );
}

/**
 * Wraps ListRows in a card with hairline separators between them, so callers
 * don't hand-roll `borderBottom` on every item except the last.
 */
export function ListGroup({
  children,
  padded = true,
}: {
  children: React.ReactNode;
  padded?: boolean;
}) {
  const items = React.Children.toArray(children).filter(Boolean);

  return (
    <div
      style={{
        background: HP_TOKENS.card,
        border: `1px solid ${HP_TOKENS.line}`,
        borderRadius: HP_TOKENS.radius,
        padding: padded ? "2px 16px" : 0,
      }}
    >
      {items.map((child, i) => (
        <div
          key={i}
          style={{
            borderBottom: i < items.length - 1 ? `1px solid ${HP_TOKENS.lineSoft}` : undefined,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
