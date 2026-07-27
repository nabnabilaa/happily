"use client";

import React from "react";
import { HP_TOKENS, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import { CountUp } from "@/components/ui/motion";

type Trend = "up" | "down" | "flat";

interface StatTileProps {
  /** What the number measures. Always present — a bare figure means nothing. */
  label: string;
  value: number | string;
  /** Appended to the value, e.g. "%" or "jam". */
  unit?: string;
  /** Extra context under the value, e.g. "dari 12 target". */
  hint?: string;
  icon?: string;
  /**
   * Direction of change. `good` says whether up is positive — burnout rising
   * is bad, completion rising is good — so the colour can't be inferred from
   * direction alone.
   */
  trend?: Trend;
  trendValue?: string;
  upIsGood?: boolean;
  /** Animate the number on mount. Only for values that actually change. */
  animate?: boolean;
  onClick?: () => void;
}

/**
 * A single figure in a dashboard row. Uses tabular numerals so digits don't
 * shift width as values update.
 */
export default function StatTile({
  label,
  value,
  unit,
  hint,
  icon,
  trend,
  trendValue,
  upIsGood = true,
  animate = false,
  onClick,
}: StatTileProps) {
  const isNum = typeof value === "number";

  const trendTone =
    trend === "flat" || !trend
      ? HP_TOKENS.inkMute
      : (trend === "up") === upIsGood
      ? HP_TOKENS.success
      : HP_TOKENS.danger;

  const body = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
        {icon && <HPGlyph name={icon} size={14} color={HP_TOKENS.inkMute} stroke={2} />}
        <span
          style={{
            ...HP_TEXT.small,
            fontWeight: 550,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 8 }}>
        <span style={{ ...HP_TEXT.metric, fontSize: 26 }}>
          {animate && isNum ? <CountUp value={value as number} /> : value}
        </span>
        {unit && (
          <span style={{ ...HP_TEXT.small, fontWeight: 600, color: HP_TOKENS.inkMute }}>
            {unit}
          </span>
        )}
      </div>

      {(hint || trendValue) && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
          {trendValue && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 2,
                color: trendTone,
                fontSize: 12,
                fontWeight: 650,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {/* Arrow carries the direction, so colour is never the only cue. */}
              {trend && trend !== "flat" && (
                <HPGlyph name={trend === "up" ? "arrowUp" : "arrowDown"} size={11} color="currentColor" />
              )}
              {trendValue}
            </span>
          )}
          {hint && <span style={{ ...HP_TEXT.small, fontSize: 12 }}>{hint}</span>}
        </div>
      )}
    </>
  );

  const surface: React.CSSProperties = {
    background: HP_TOKENS.card,
    border: `1px solid ${HP_TOKENS.line}`,
    borderRadius: HP_TOKENS.radiusMd,
    padding: 15,
    minWidth: 0,
  };

  if (!onClick) return <div style={surface}>{body}</div>;

  return (
    <button
      type="button"
      onClick={onClick}
      className="hp-tap"
      style={{ ...surface, textAlign: "left", width: "100%", font: "inherit", color: "inherit" }}
    >
      {body}
    </button>
  );
}
