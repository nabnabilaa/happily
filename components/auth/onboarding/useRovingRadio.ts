"use client";

import React from "react";

/**
 * Keyboard behaviour for a single-select group of answers.
 *
 * Onboarding has two of these — the generic option group and the department
 * picker — and they must behave identically, so the behaviour lives here rather
 * than being written twice and drifting.
 *
 * Follows the radio-group pattern: the group is one tab stop (roving tabindex
 * on whichever answer is checked, or the first when none is), arrow keys move
 * *and* select, Home/End jump to the ends. Number keys 1–9 are a convenience on
 * top, matching the shortcut hint shown on pointer devices.
 *
 * Before this, every answer was its own tab stop with no arrow support, so a
 * five-option step cost five presses just to reach the continue button.
 */
export function useRovingRadio(
  labels: string[],
  selected: string | null,
  onSelect: (label: string) => void,
) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const selectedIndex = labels.indexOf(selected ?? "");
  const tabIndex = selectedIndex === -1 ? 0 : selectedIndex;

  const pick = React.useCallback(
    (i: number) => {
      if (i < 0 || i >= labels.length) return;
      onSelect(labels[i]);
      refs.current[i]?.focus();
    },
    [labels, onSelect],
  );

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (labels.length === 0) return;
      const from = selectedIndex === -1 ? 0 : selectedIndex;

      switch (e.key) {
        case "ArrowDown":
        case "ArrowRight":
          e.preventDefault();
          pick((from + 1) % labels.length);
          return;
        case "ArrowUp":
        case "ArrowLeft":
          e.preventDefault();
          pick((from - 1 + labels.length) % labels.length);
          return;
        case "Home":
          e.preventDefault();
          pick(0);
          return;
        case "End":
          e.preventDefault();
          pick(labels.length - 1);
          return;
      }

      // Past the ninth option a shortcut stops being discoverable, and a step
      // that long should have been split.
      if (/^[1-9]$/.test(e.key)) {
        const i = Number(e.key) - 1;
        if (i < labels.length) {
          e.preventDefault();
          pick(i);
        }
      }
    },
    [labels, selectedIndex, pick],
  );

  const setRef = React.useCallback(
    (i: number) => (el: HTMLButtonElement | null) => {
      refs.current[i] = el;
    },
    [],
  );

  return { onKeyDown, tabIndex, setRef };
}
