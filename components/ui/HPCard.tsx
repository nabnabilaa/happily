"use client";

import React from "react";
import { HP_TOKENS } from "@/lib/constants";
import { Press } from "@/components/ui/motion";

type CardVariant = "surface" | "soft" | "outline" | "raised";

interface HPCardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  padding?: number;
  onClick?: () => void;
  className?: string;
  /**
   * surface — default card sitting on the page background
   * soft    — recessed group, for nesting inside another card
   * outline — border only, no fill; for low-emphasis grouping
   * raised  — genuinely floating (popovers, drag previews). Use rarely.
   */
  variant?: CardVariant;
  /** @deprecated use `variant="soft"` */
  soft?: boolean;
  /** Draws attention without colouring the whole surface. */
  selected?: boolean;
  as?: "div" | "section" | "article" | "li";
  ariaLabel?: string;
  /** For cards that announce something, e.g. role="status" on a reminder. */
  role?: string;
  "aria-live"?: "off" | "polite" | "assertive";
  id?: string;
}

export default function HPCard({
  children,
  style = {},
  padding = 18,
  onClick,
  className,
  variant,
  soft = false,
  selected = false,
  as: Tag = "div",
  ariaLabel,
  role,
  "aria-live": ariaLive,
  id,
}: HPCardProps) {
  const v: CardVariant = variant ?? (soft ? "soft" : "surface");

  // Depth reads from the surface value and a hairline. Shadow is reserved for
  // `raised`, which is the only variant that actually floats.
  const skin: Record<CardVariant, React.CSSProperties> = {
    surface: {
      background: HP_TOKENS.card,
      border: `1px solid ${HP_TOKENS.line}`,
      boxShadow: "none",
    },
    soft: {
      background: HP_TOKENS.sunken,
      border: `1px solid transparent`,
      boxShadow: "none",
    },
    outline: {
      background: "transparent",
      border: `1px solid ${HP_TOKENS.border}`,
      boxShadow: "none",
    },
    raised: {
      background: HP_TOKENS.cardRaised,
      border: `1px solid ${HP_TOKENS.line}`,
      boxShadow: HP_TOKENS.shadowMd,
    },
  };

  const base: React.CSSProperties = {
    ...skin[v],
    borderRadius: HP_TOKENS.radius,
    padding,
    ...(selected
      ? {
          borderColor: HP_TOKENS.primary,
          background: HP_TOKENS.primarySoft,
        }
      : null),
    ...style,
  };

  if (!onClick) {
    return (
      <Tag
        id={id}
        className={className}
        style={base}
        aria-label={ariaLabel}
        role={role}
        aria-live={ariaLive}
      >
        {children}
      </Tag>
    );
  }

  // Interactive cards are real buttons: keyboard reachable, correct semantics,
  // and a visible focus ring from the global :focus-visible rule.
  return (
    <Press
      scale={0.985}
      style={{ borderRadius: base.borderRadius, display: "block" }}
      className={className}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        aria-pressed={selected || undefined}
        style={{
          ...base,
          width: "100%",
          textAlign: "left",
          font: "inherit",
          color: "inherit",
          display: "block",
          transition:
            "background-color 140ms var(--hp-ease), border-color 140ms var(--hp-ease)",
        }}
      >
        {children}
      </button>
    </Press>
  );
}
