"use client";

import React from "react";
import {
  HP_TOKENS,
  HP_TEXT,
  HPGlyph,
  IconBadge,
  ListRow,
  ListGroup,
  EmptyState,
} from "@/components/ui";

interface RedeemHistoryListProps {
  history: any[];
  /** Cap the list; the rest stays in the record but off-screen. */
  limit?: number;
}

/**
 * Dates arrive in two shapes: a timestamp from the API, and the `id-ID` short
 * string (`27/7/2026`) an older version wrote locally. `new Date()` reads the
 * latter as US month-first, so it gets parsed by hand.
 */
function toTime(value: unknown): number {
  if (!value) return -Infinity;
  const raw = String(value).trim();

  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return new Date(+dmy[3], +dmy[2] - 1, +dmy[1]).getTime();

  const parsed = new Date(raw).getTime();
  return Number.isNaN(parsed) ? -Infinity : parsed;
}

function formatDate(value: unknown) {
  const t = toTime(value);
  if (t === -Infinity) return value ? String(value) : "";
  return new Date(t).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function RedeemHistoryList({ history, limit = 10 }: RedeemHistoryListProps) {
  if (!history || history.length === 0) {
    return (
      <EmptyState
        icon="history"
        title="Belum ada penukaran"
        description="Reward yang kamu tukar akan tercatat di sini beserta poin yang terpakai."
        compact
      />
    );
  }

  // The API sends newest-first but locally-appended redemptions land at the
  // end, so the array is only sorted by accident. Sort it for real.
  const rows = [...history].sort((a, b) => toTime(b?.date) - toTime(a?.date)).slice(0, limit);

  return (
    <ListGroup>
      {rows.map((h: any, i: number) => (
        <ListRow
          key={h.id ?? i}
          leading={
            <IconBadge size={40} tone={HP_TOKENS.sunken}>
              <HPGlyph name={h.glyph || "gift"} size={19} color={HP_TOKENS.inkSoft} />
            </IconBadge>
          }
          title={h.title}
          subtitle={formatDate(h.date)}
          trailing={
            <span
              style={{
                ...HP_TEXT.bodyStrong,
                color: HP_TOKENS.inkMute,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              −{Number(h.points).toLocaleString("id-ID")}
            </span>
          }
        />
      ))}
    </ListGroup>
  );
}
