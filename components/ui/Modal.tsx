"use client";

import React from "react";
import { createPortal } from "react-dom";
import { HP_TOKENS, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import { motion, AnimatePresence, useReducedMotion, SPRING_SOFT, EASE } from "@/components/ui/motion";

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  title?: string;
  /** Supporting line under the title. */
  description?: string;
  /** Pinned action row at the bottom, outside the scroll area. */
  footer?: React.ReactNode;
  noPadding?: boolean;
  /** @deprecated the sheet follows the app theme now */
  dark?: boolean;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({
  children,
  onClose,
  title,
  description,
  footer,
  noPadding,
}: ModalProps) {
  const reduce = useReducedMotion();
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const descId = React.useId();

  // The sheet is portalled to <body>. Rendering it in place inherits whatever
  // the trigger's subtree is doing — a card with `opacity: .7` for a finished
  // task makes the whole dialog translucent, and any opacity/transform on an
  // ancestor traps our z-index in its stacking context so sibling cards paint
  // over the sheet. Escaping to the body is the only reliable fix.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Lock background scroll while the sheet is open, compensating for the
  // scrollbar so the page behind doesn't shift.
  React.useEffect(() => {
    const { body } = document;
    const prevOverflow = body.style.overflow;
    const prevPad = body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;

    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPad;
    };
  }, []);

  // Escape closes; Tab cycles inside the sheet instead of escaping to the page.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !sheetRef.current) return;

      const items = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  // Move focus into the sheet on open, and hand it back to the trigger on close.
  // Waits for `mounted` because the sheet only exists after the portal renders.
  React.useEffect(() => {
    if (!mounted) return;

    const trigger = document.activeElement as HTMLElement | null;
    const target = sheetRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    (target ?? sheetRef.current)?.focus({ preventScroll: true });

    return () => trigger?.focus?.({ preventScroll: true });
  }, [mounted]);

  const closeBtn = (
    <button
      type="button"
      onClick={onClose}
      aria-label="Tutup"
      style={{
        width: 40,
        height: 40,
        flexShrink: 0,
        borderRadius: "50%",
        background: HP_TOKENS.lineSoft,
        color: HP_TOKENS.inkSoft,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background-color 140ms var(--hp-ease)",
      }}
    >
      <HPGlyph name="close" size={18} color="currentColor" />
    </button>
  );

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="hp-modal-overlay"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={EASE}
      >
        <motion.div
          ref={sheetRef}
          className="hp-modal-content"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descId : undefined}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
          initial={reduce ? { opacity: 0 } : { y: "100%" }}
          animate={reduce ? { opacity: 1 } : { y: 0 }}
          exit={reduce ? { opacity: 0 } : { y: "100%" }}
          transition={reduce ? { duration: 0.01 } : SPRING_SOFT}
          style={{ background: HP_TOKENS.card }}
        >
          {/* Drag affordance — mobile only, hidden at desktop by CSS */}
          <div className="hp-modal-handle" aria-hidden />

          {title ? (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                padding: "12px 20px 16px",
                flexShrink: 0,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <h2 id={titleId} style={{ ...HP_TEXT.title, fontSize: 21, margin: 0 }}>
                  {title}
                </h2>
                {description && (
                  <p id={descId} style={{ ...HP_TEXT.small, marginTop: 6 }}>
                    {description}
                  </p>
                )}
              </div>
              {closeBtn}
            </div>
          ) : (
            <div style={{ position: "absolute", top: 14, right: 14, zIndex: 10 }}>
              {closeBtn}
            </div>
          )}

          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overscrollBehavior: "contain",
              padding: noPadding ? 0 : `${title ? 0 : 20}px 20px 24px`,
            }}
          >
            {children}
          </div>

          {footer && (
            <div
              style={{
                flexShrink: 0,
                padding: "14px 20px",
                borderTop: `1px solid ${HP_TOKENS.line}`,
                background: HP_TOKENS.card,
                display: "flex",
                gap: 10,
              }}
            >
              {footer}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
