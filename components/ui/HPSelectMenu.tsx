"use client";

import React from "react";
import { HP_TOKENS, HP_TEXT, HP_FONT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import { motion, AnimatePresence, useReducedMotion } from "@/components/ui/motion";

export interface SelectMenuOption {
  value: string;
  label: string;
  /** Trailing count or note, e.g. how many people are in a division. */
  meta?: string | number;
}

interface HPSelectMenuProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectMenuOption[];
  /** Required — the trigger shows a value, not a label. */
  ariaLabel: string;
  /** Glyph shown at the start of the trigger. */
  icon?: string;
  /** Shown when `value` matches no option. */
  placeholder?: string;
  /**
   * Tints the trigger. Use for filters: an at-a-glance signal that this control
   * is currently narrowing what the user sees.
   */
  active?: boolean;
  fullWidth?: boolean;
  /** Panel width. Defaults to matching the trigger, growing to fit labels. */
  menuWidth?: number;
}

/**
 * Dropdown built on the listbox pattern.
 *
 * A native `<select>` is the correct default and this deliberately isn't one —
 * it exists because the filter controls sit next to tokenised pills and fields,
 * and the UA widget can't take our radius, border or type. Everything the
 * native element gave us for free is re-implemented here: arrow-key roving,
 * Home/End, Escape-to-close with focus returned to the trigger, type-ahead by
 * first letter, click-outside, and `aria-activedescendant`-free real focus so
 * screen readers announce each option as it is reached.
 */
export default function HPSelectMenu({
  value,
  onChange,
  options,
  ariaLabel,
  icon,
  placeholder = "Pilih…",
  active = false,
  fullWidth = false,
  menuWidth,
}: HPSelectMenuProps) {
  const [open, setOpen] = React.useState(false);
  const reduce = useReducedMotion();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const optionRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const listId = React.useId();

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  // Focus the current option when the panel opens, so the keyboard lands
  // somewhere meaningful rather than at the top of an arbitrary list.
  React.useEffect(() => {
    if (!open) return;
    const i = selectedIndex >= 0 ? selectedIndex : 0;
    requestAnimationFrame(() => optionRefs.current[i]?.focus());
  }, [open, selectedIndex]);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  const pick = (v: string) => {
    onChange(v);
    close();
  };

  const moveTo = (i: number) => {
    const next = (i + options.length) % options.length;
    optionRefs.current[next]?.focus();
  };

  const onListKeyDown = (e: React.KeyboardEvent, i: number) => {
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); moveTo(i + 1); break;
      case "ArrowUp": e.preventDefault(); moveTo(i - 1); break;
      case "Home": e.preventDefault(); moveTo(0); break;
      case "End": e.preventDefault(); moveTo(options.length - 1); break;
      case "Escape": e.preventDefault(); close(); break;
      case "Tab": close(false); break;
      default: {
        // Type-ahead: jump to the next option starting with the typed letter.
        if (e.key.length !== 1 || e.altKey || e.ctrlKey || e.metaKey) return;
        const ch = e.key.toLowerCase();
        const order = options.map((_, n) => (i + 1 + n) % options.length);
        const hit = order.find((n) => options[n].label.toLowerCase().startsWith(ch));
        if (hit !== undefined) { e.preventDefault(); moveTo(hit); }
      }
    }
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
    }
  };

  return (
    <div
      ref={rootRef}
      style={{ position: "relative", width: fullWidth ? "100%" : undefined, minWidth: 0 }}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
        className="hp-tap"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: fullWidth ? "100%" : undefined,
          minWidth: 0,
          minHeight: 44,
          padding: "0 12px 0 14px",
          borderRadius: HP_TOKENS.radiusPill,
          background: active ? HP_TOKENS.primarySoft : HP_TOKENS.card,
          border: `1px solid ${active ? "transparent" : HP_TOKENS.border}`,
          color: active ? HP_TOKENS.primary : HP_TOKENS.ink,
          fontFamily: HP_FONT,
          cursor: "pointer",
          transition:
            "background-color 140ms var(--hp-ease), border-color 140ms var(--hp-ease), color 140ms var(--hp-ease)",
        }}
      >
        {icon && (
          <HPGlyph
            name={icon}
            size={15}
            color={active ? HP_TOKENS.primary : HP_TOKENS.inkMute}
          />
        )}
        <span
          style={{
            ...HP_TEXT.label,
            color: "inherit",
            flex: 1,
            minWidth: 0,
            textAlign: "left",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {selected ? selected.label : placeholder}
        </span>
        <motion.span
          aria-hidden
          animate={{ rotate: open ? 180 : 0 }}
          transition={reduce ? { duration: 0.01 } : { duration: 0.18 }}
          style={{ display: "flex", flexShrink: 0 }}
        >
          <HPGlyph
            name="chevron-down"
            size={15}
            color={active ? HP_TOKENS.primary : HP_TOKENS.inkMute}
          />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            id={listId}
            aria-label={ariaLabel}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: reduce ? 0.01 : 0.16, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              zIndex: 60,
              minWidth: menuWidth ?? "100%",
              maxWidth: 300,
              maxHeight: 320,
              overflowY: "auto",
              padding: "6px",
              background: HP_TOKENS.card,
              border: `1px solid ${HP_TOKENS.line}`,
              borderRadius: HP_TOKENS.radiusMd,
              boxShadow: HP_TOKENS.shadowLg,
              transformOrigin: "top left",
            }}
          >
            {/* Section header */}
            <div style={{
              padding: "4px 10px 8px",
              borderBottom: `1px solid ${HP_TOKENS.lineSoft}`,
              marginBottom: 4,
            }}>
              <span style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: HP_TOKENS.inkFade,
                fontFamily: HP_FONT,
              }}>
                Filter Divisi
              </span>
            </div>
            {options.map((o, i) => {
              const isSelected = o.value === value;
              return (
                <button
                  key={o.value}
                  ref={(el) => { optionRefs.current[i] = el; }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => pick(o.value)}
                  onKeyDown={(e) => onListKeyDown(e, i)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    minHeight: 44,
                    padding: "0 12px",
                    borderRadius: HP_TOKENS.radiusSm,
                    background: isSelected ? HP_TOKENS.primarySoft : "transparent",
                    color: isSelected ? HP_TOKENS.primary : HP_TOKENS.ink,
                    font: "inherit",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "background-color 120ms var(--hp-ease)",
                    border: isSelected ? `1px solid ${HP_TOKENS.primaryLight}` : "1px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = HP_TOKENS.primaryWash;
                      e.currentTarget.style.borderColor = HP_TOKENS.line;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.borderColor = "transparent";
                    }
                  }}
                >
                  <span
                    style={{
                      ...HP_TEXT.label,
                      fontWeight: isSelected ? 650 : 500,
                      color: "inherit",
                      flex: 1,
                      minWidth: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {o.label}
                  </span>

                  {o.meta !== undefined && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                        flexShrink: 0,
                        minWidth: 20,
                        height: 20,
                        padding: "0 6px",
                        borderRadius: 999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: isSelected ? HP_TOKENS.primary : HP_TOKENS.sunken,
                        color: isSelected ? HP_TOKENS.onPrimary : HP_TOKENS.inkMute,
                      }}
                    >
                      {o.meta}
                    </span>
                  )}

                  {isSelected && (
                    <HPGlyph name="check" size={15} color={HP_TOKENS.primary} stroke={2.6} />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
