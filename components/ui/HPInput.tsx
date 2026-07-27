"use client";

/**
 * Text inputs.
 *
 * Every modal in the app used to hand-roll `padding: '10px 12px', borderRadius:
 * 10, border: 1.5px solid ...` — with the border width, radius and font size
 * drifting between files. These wrap the same shape once.
 *
 * Always pass a `label`. If the design has no visible label, pass
 * `aria-label` instead — an input with only a placeholder is not labelled.
 */

import React from "react";
import { HP_TOKENS, HP_TEXT, HP_FONT } from "@/lib/constants";

const field: React.CSSProperties = {
  width: "100%",
  // 44px floor: 15px text + 12px padding top/bottom + borders.
  padding: "12px 14px",
  borderRadius: HP_TOKENS.radiusSm,
  border: `1px solid ${HP_TOKENS.border}`,
  background: HP_TOKENS.card,
  color: HP_TOKENS.ink,
  fontFamily: HP_FONT,
  fontSize: 15,
  lineHeight: 1.4,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 140ms var(--hp-ease)",
};

/** Shared label + error + hint chrome. */
function Wrap({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      {label && (
        <label htmlFor={htmlFor} style={{ ...HP_TEXT.label, color: HP_TOKENS.inkSoft }}>
          {label}
        </label>
      )}
      {children}
      {/* Errors take the slot when present — never show both, it doubles the noise. */}
      {error ? (
        <span role="alert" style={{ ...HP_TEXT.small, color: HP_TOKENS.danger }}>
          {error}
        </span>
      ) : (
        hint && <span style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute }}>{hint}</span>
      )}
    </div>
  );
}

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  hint?: string;
  error?: string;
}

export default function HPInput({ label, hint, error, id, style, ...rest }: InputProps) {
  const auto = React.useId();
  const fid = id ?? auto;
  return (
    <Wrap label={label} hint={hint} error={error} htmlFor={fid}>
      <input
        id={fid}
        aria-invalid={error ? true : undefined}
        style={{
          ...field,
          borderColor: error ? HP_TOKENS.danger : HP_TOKENS.border,
          ...style,
        }}
        {...rest}
      />
    </Wrap>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
}

/**
 * A native `<select>` wearing the same field chrome as `HPInput`.
 *
 * Native on purpose: the OS picker is keyboard- and screen-reader-correct for
 * free, and on a phone it opens the platform wheel instead of a custom popup
 * that has to re-solve focus trapping and scroll locking.
 */
export function HPSelect({ label, hint, error, id, style, children, ...rest }: SelectProps) {
  const auto = React.useId();
  const fid = id ?? auto;
  return (
    <Wrap label={label} hint={hint} error={error} htmlFor={fid}>
      <select
        id={fid}
        aria-invalid={error ? true : undefined}
        style={{
          ...field,
          borderColor: error ? HP_TOKENS.danger : HP_TOKENS.border,
          cursor: "pointer",
          // Leaves room for the UA's own arrow so a long option label can't
          // run underneath it.
          paddingRight: 34,
          ...style,
        }}
        {...rest}
      >
        {children}
      </select>
    </Wrap>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function HPTextarea({ label, hint, error, id, rows = 3, style, ...rest }: TextareaProps) {
  const auto = React.useId();
  const fid = id ?? auto;
  return (
    <Wrap label={label} hint={hint} error={error} htmlFor={fid}>
      <textarea
        id={fid}
        rows={rows}
        aria-invalid={error ? true : undefined}
        style={{
          ...field,
          borderColor: error ? HP_TOKENS.danger : HP_TOKENS.border,
          resize: "vertical",
          ...style,
        }}
        {...rest}
      />
    </Wrap>
  );
}
