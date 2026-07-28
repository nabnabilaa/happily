"use client";

import React from "react";
import { HP_TOKENS, HP_FONT } from "@/lib/constants";
import { motion, useReducedMotion, SPRING } from "@/components/ui/motion";

interface TabBarOption {
  key: string;
  label: string;
  /** Optional trailing count, e.g. number of items in that tab. */
  count?: number;
}

interface TabBarProps {
  options: TabBarOption[];
  value: string;
  onChange: (value: string) => void;
  /** Accessible name for the group, e.g. "Filter tugas". */
  label?: string;
}

/**
 * Segmented control. The active pill slides between options via a shared
 * layout animation rather than fading, so the eye can follow the selection.
 *
 * Implemented with the tablist/tab roles and roving arrow-key focus.
 */
export default function TabBar({ options, value, onChange, label }: TabBarProps) {
  const reduce = useReducedMotion();
  const groupId = React.useId();
  const refs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = options.findIndex((o) => o.key === value);
    if (i === -1) return;

    let next = i;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % options.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + options.length) % options.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = options.length - 1;
    else return;

    e.preventDefault();
    const key = options[next].key;
    onChange(key);
    refs.current[key]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      style={{
        display: "flex",
        gap: 2,
        background: HP_TOKENS.sunken,
        padding: 3,
        borderRadius: HP_TOKENS.radiusPill,
      }}
    >
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            ref={(el) => {
              refs.current[o.key] = el;
            }}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.key)}
            style={{
              position: "relative",
              flex: 1,
              minWidth: 0,
              // 44pt touch target
              minHeight: 40,
              padding: "9px 12px",
              borderRadius: HP_TOKENS.radiusPill,
              background: "transparent",
              color: active ? HP_TOKENS.ink : HP_TOKENS.inkMute,
              fontFamily: HP_FONT,
              fontWeight: active ? 650 : 550,
              fontSize: 13,
              letterSpacing: "-0.005em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              transition: "color 180ms var(--hp-ease)",
            }}
          >
            {active && (
              <motion.span
                aria-hidden
                layoutId={`tabbar-${groupId}`}
                transition={reduce ? { duration: 0.01 } : SPRING}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: HP_TOKENS.card,
                  borderRadius: HP_TOKENS.radiusPill,
                  boxShadow: HP_TOKENS.shadowSm,
                  zIndex: 0,
                }}
              />
            )}
            <span
              style={{
                position: "relative",
                zIndex: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {o.label}
              {typeof o.count === "number" && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 650,
                    color: active ? HP_TOKENS.primary : HP_TOKENS.inkFade,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {o.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
