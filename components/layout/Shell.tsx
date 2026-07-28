"use client";

import React from "react";

interface ShellProps {
  children: React.ReactNode;
}

export default function Shell({ children }: ShellProps) {
  // 100% rather than 100vw: vw includes the scrollbar gutter on desktop, which
  // pushed the layout wider than the viewport and caused horizontal scroll.
  return (
    <div style={{ width: "100%", height: "100dvh", overflow: "hidden" }}>
      {children}
    </div>
  );
}
