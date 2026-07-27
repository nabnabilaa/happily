"use client";

/**
 * Dashboard layout.
 *
 * Before this, every screen was one column of full-width cards — sixteen of
 * them on Home — so nothing was more important than anything else and the page
 * ran on forever. On a 1100px desktop a one-line card stretched the whole way,
 * throwing its button far from its label.
 *
 * `PageGrid` splits a screen into the work you came to do and the context
 * around it:
 *
 *   <PageGrid
 *     main={<>…today's tasks, focus, progress…</>}
 *     rail={<>…status, profile, shortcuts…</>}
 *   />
 *
 * Under 1024px it collapses to one column and `main` comes first, so the rail
 * is genuinely secondary at every size. Don't put anything in `rail` that a
 * phone user needs early — on a phone it lands at the bottom.
 */

import React from "react";
import { Stack } from "./Layout";
import type { Step } from "./Layout";

interface PageGridProps {
  main: React.ReactNode;
  /** Secondary column. Omit for a single-column screen with a sane measure. */
  rail?: React.ReactNode;
  /** Vertical gap between blocks within each column. */
  gap?: Step;
}

export default function PageGrid({ main, rail, gap = 4 }: PageGridProps) {
  // No rail: one centred column with real gutters. The screen container is
  // 1100px wide because the dashboard needs two columns; a single column let
  // loose across all of it reads as an unstyled page rather than a laid-out
  // one. Centred at 820 leaves ~140px either side, which is the width doing
  // visible work instead of just running out.
  if (!rail) {
    return (
      <Stack gap={gap} style={{ maxWidth: 820, width: "100%", margin: "0 auto" }}>
        {main}
      </Stack>
    );
  }

  return (
    <div className="hp-page-grid">
      <Stack gap={gap} style={{ minWidth: 0 }}>
        {main}
      </Stack>
      <Stack gap={gap} as="aside" style={{ minWidth: 0 }}>
        {rail}
      </Stack>
    </div>
  );
}
