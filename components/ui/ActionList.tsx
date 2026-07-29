"use client";

/**
 * A group of shortcuts, as one card of rows.
 *
 * Home used to spend a full-width card on each of these — "Riwayat & Logbook",
 * "Butuh jeda sejenak?", "Kelola survey" — so a 40px action occupied the same
 * visual weight as the day's task list, and on desktop its button ended up a
 * long way from its label. Collapsed into rows, five shortcuts cost about what
 * one card used to.
 *
 *   <ActionList
 *     title="Lainnya"
 *     items={[
 *       { icon: "book", label: "Riwayat & logbook", onClick: … },
 *       { icon: "leaf", label: "Jeda 1 menit", hint: "Box breathing", onClick: … },
 *     ]}
 *   />
 */

import React from "react";
import { HP_TOKENS, HP_TEXT } from "@/lib/constants";
import HPGlyph from "./HPGlyph";
import HPCard from "./HPCard";

export interface ActionItem {
  icon: string;
  label: string;
  /** One short line under the label. Skip it when the label says enough. */
  hint?: string;
  onClick: () => void;
  /** Tints the icon. Use only when the row carries real status. */
  tone?: string;
  /** Trailing count or short status, e.g. "3 baru". */
  badge?: string;
}

export default function ActionList({
  title,
  items,
}: {
  title?: string;
  items: ActionItem[];
}) {
  return (
    <HPCard padding={0} style={{ overflow: "hidden" }}>
      {title && (
        <div style={{ padding: "14px 16px 8px" }}>
          <h2 style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, margin: 0 }}>{title}</h2>
        </div>
      )}

      <div role="list">
        {items.map((item, i) => (
          <button
            key={item.label}
            type="button"
            role="listitem"
            onClick={item.onClick}
            className="hp-tap"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
              minHeight: 52,
              padding: "10px 16px",
              background: "transparent",
              border: "none",
              // Separators between rows only — the card's own edge closes the group.
              borderTop: i === 0 ? "none" : `1px solid ${HP_TOKENS.lineSoft}`,
              textAlign: "left",
            }}
          >
            <HPGlyph name={item.icon} size={17} color={item.tone ?? HP_TOKENS.inkMute} />

            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ ...HP_TEXT.bodyStrong, display: "block", color: HP_TOKENS.ink }}>
                {item.label}
              </span>
              {item.hint && (
                <span style={{ ...HP_TEXT.small, display: "block", marginTop: 1 }}>
                  {item.hint}
                </span>
              )}
            </span>

            {item.badge && (
              <span
                style={{
                  ...HP_TEXT.tiny,
                  flexShrink: 0,
                  padding: "3px 8px",
                  borderRadius: HP_TOKENS.radiusPill,
                  background: HP_TOKENS.primaryWash,
                  color: HP_TOKENS.primaryInk,
                }}
              >
                {item.badge}
              </span>
            )}

            <HPGlyph name="chevronRight" size={16} color={HP_TOKENS.inkFade} />
          </button>
        ))}
      </div>
    </HPCard>
  );
}
