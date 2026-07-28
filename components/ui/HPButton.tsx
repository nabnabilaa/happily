"use client";

import React from "react";
import { HP_TOKENS, HP_FONT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface HPButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children?: React.ReactNode;
  variant?: Variant;
  size?: Size;
  /** Glyph name rendered before the label. */
  icon?: string;
  /** Glyph name rendered after the label. */
  iconEnd?: string;
  loading?: boolean;
  fullWidth?: boolean;
  /** Icon-only button. Requires `aria-label`. */
  iconOnly?: boolean;
}

const SIZES: Record<Size, { minHeight: number; padding: string; fontSize: number; icon: number }> = {
  // Every size clears the 44px minimum touch target.
  sm: { minHeight: 44, padding: "8px 14px", fontSize: 13, icon: 15 },
  md: { minHeight: 48, padding: "12px 20px", fontSize: 14.5, icon: 17 },
  lg: { minHeight: 54, padding: "15px 28px", fontSize: 16, icon: 19 },
};

function skin(variant: Variant, disabled: boolean): React.CSSProperties {
  if (disabled) {
    return {
      background: variant === "ghost" ? "transparent" : HP_TOKENS.sunken,
      color: HP_TOKENS.inkFade,
      border: "1px solid transparent",
    };
  }
  switch (variant) {
    case "primary":
      return { background: HP_TOKENS.primary, color: HP_TOKENS.onPrimary, border: "1px solid transparent" };
    case "danger":
      return { background: HP_TOKENS.dangerSoft, color: HP_TOKENS.danger, border: `1px solid transparent` };
    case "ghost":
      return { background: "transparent", color: HP_TOKENS.inkSoft, border: "1px solid transparent" };
    case "secondary":
    default:
      return { background: HP_TOKENS.card, color: HP_TOKENS.ink, border: `1px solid ${HP_TOKENS.border}` };
  }
}

export default function HPButton({
  children,
  variant = "secondary",
  size = "md",
  icon,
  iconEnd,
  loading = false,
  fullWidth = false,
  iconOnly = false,
  disabled = false,
  style,
  ...rest
}: HPButtonProps) {
  const s = SIZES[size];
  const isOff = disabled || loading;

  return (
    <button
      type="button"
      disabled={isOff}
      // Announce the busy state rather than leaving screen readers with a
      // button whose label silently stopped working.
      aria-busy={loading || undefined}
      className="hp-tap"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minHeight: s.minHeight,
        minWidth: iconOnly ? s.minHeight : undefined,
        padding: iconOnly ? 0 : s.padding,
        borderRadius: HP_TOKENS.radiusPill,
        fontFamily: HP_FONT,
        fontSize: s.fontSize,
        fontWeight: variant === "primary" ? 650 : 600,
        letterSpacing: "-0.01em",
        lineHeight: 1.2,
        whiteSpace: "nowrap",
        width: fullWidth ? "100%" : undefined,
        transition: "background-color 140ms var(--hp-ease), border-color 140ms var(--hp-ease), color 140ms var(--hp-ease)",
        ...skin(variant, isOff),
        ...style,
      }}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden
          style={{
            width: s.icon,
            height: s.icon,
            borderRadius: "50%",
            border: "2px solid currentColor",
            borderTopColor: "transparent",
            opacity: 0.7,
            animation: "hpSpin 700ms linear infinite",
          }}
        />
      ) : (
        icon && <HPGlyph name={icon} size={s.icon} color="currentColor" />
      )}
      {!iconOnly && children}
      {!loading && iconEnd && <HPGlyph name={iconEnd} size={s.icon} color="currentColor" />}
    </button>
  );
}
