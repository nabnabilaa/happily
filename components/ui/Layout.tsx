"use client";

/**
 * Layout primitives.
 *
 * These exist so screens stop hand-rolling the same flex objects. Before this,
 * `display:flex; alignItems:center; gap:12` appeared in well over a hundred
 * places, each free to drift by a pixel or two.
 *
 * Spacing props take **scale steps**, not pixels:
 *   1=4px  2=8px  3=12px  4=16px  5=20px  6=24px  8=32px  10=40px  12=48px
 * Passing a raw number outside the scale is possible via `style`, but if you
 * need that, the design probably wants a scale value instead.
 */

import React from "react";
import { HP_TOKENS } from "@/lib/constants";

/** Spacing scale steps → pixels. */
const STEP: Record<number, number> = {
  0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48,
};

export type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;

const px = (s?: Step) => (s === undefined ? undefined : STEP[s]);

type Tag = "div" | "section" | "article" | "header" | "footer" | "aside" | "ul" | "li" | "nav";

interface BoxProps extends React.HTMLAttributes<HTMLElement> {
  as?: Tag;
  children?: React.ReactNode;
}

/* ── Stack: vertical flow ──────────────────────────────────────────── */

interface StackProps extends BoxProps {
  /** Gap between children, in scale steps. */
  gap?: Step;
  align?: React.CSSProperties["alignItems"];
  justify?: React.CSSProperties["justifyContent"];
  /** Padding, in scale steps. */
  p?: Step;
}

export function Stack({
  as: Tag = "div",
  gap = 3,
  align,
  justify,
  p,
  style,
  children,
  ...rest
}: StackProps) {
  return (
    <Tag
      style={{
        display: "flex",
        flexDirection: "column",
        gap: px(gap),
        alignItems: align,
        justifyContent: justify,
        padding: px(p),
        minWidth: 0,
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* ── Row: horizontal flow ──────────────────────────────────────────── */

interface RowProps extends BoxProps {
  gap?: Step;
  align?: React.CSSProperties["alignItems"];
  justify?: React.CSSProperties["justifyContent"];
  p?: Step;
  wrap?: boolean;
  /**
   * Collapse to a column below 500px. Use for rows that pair text with a
   * button — they overflow on small phones otherwise.
   */
  stackOnMobile?: boolean;
}

export function Row({
  as: Tag = "div",
  gap = 3,
  align = "center",
  justify,
  p,
  wrap = false,
  stackOnMobile = false,
  style,
  className,
  children,
  ...rest
}: RowProps) {
  return (
    <Tag
      className={[stackOnMobile ? "hp-form-row" : "", className].filter(Boolean).join(" ") || undefined}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: align,
        justifyContent: justify,
        gap: px(gap),
        padding: px(p),
        flexWrap: wrap ? "wrap" : undefined,
        minWidth: 0,
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Pushes whatever follows it to the far end of a Row. */
export function Spacer() {
  return <div style={{ flex: 1, minWidth: 0 }} aria-hidden />;
}

/* ── Grid ──────────────────────────────────────────────────────────── */

interface GridProps extends BoxProps {
  /**
   * Minimum column width in px. Columns wrap automatically — no breakpoint
   * juggling needed.
   */
  min?: number;
  gap?: Step;
  /** Fixed column count instead of auto-fit. */
  columns?: number;
}

export function Grid({
  as: Tag = "div",
  min = 150,
  gap = 3,
  columns,
  style,
  children,
  ...rest
}: GridProps) {
  return (
    <Tag
      style={{
        display: "grid",
        gridTemplateColumns: columns
          ? `repeat(${columns}, minmax(0, 1fr))`
          : `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`,
        gap: px(gap),
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* ── Divider ───────────────────────────────────────────────────────── */

export function Divider({
  vertical = false,
  spacing = 0,
  style,
}: {
  vertical?: boolean;
  spacing?: Step;
  style?: React.CSSProperties;
}) {
  const m = px(spacing);
  return (
    <div
      aria-hidden
      style={{
        flexShrink: 0,
        background: HP_TOKENS.line,
        ...(vertical
          ? { width: 1, alignSelf: "stretch", margin: `0 ${m}px` }
          : { height: 1, width: "100%", margin: `${m}px 0` }),
        ...style,
      }}
    />
  );
}

/* ── IconBadge ─────────────────────────────────────────────────────── */

/**
 * The rounded-square icon holder used beside titles all over the app.
 * Previously copy-pasted with drifting sizes (32/34/36/40/44px) and radii.
 */
export function IconBadge({
  children,
  size = 40,
  tone = HP_TOKENS.sunken,
  style,
}: {
  children: React.ReactNode;
  size?: 28 | 32 | 36 | 40 | 44 | 52;
  /** Background fill. Pass a `*Soft` token. */
  tone?: string;
  style?: React.CSSProperties;
}) {
  // Radius tracks size so the squircle keeps its proportions.
  const radius = Math.round(size * 0.3);
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: tone,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
