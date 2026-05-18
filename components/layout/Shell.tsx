"use client";

import React from "react";
import { HP_TOKENS } from "@/lib/constants";

interface ShellProps {
  children: React.ReactNode;
}

export default function Shell({ children }: ShellProps) {
  return (
    <div style={{ width: '100vw', height: '100dvh', overflow: 'hidden' }}>
      {children}
    </div>
  );
}

