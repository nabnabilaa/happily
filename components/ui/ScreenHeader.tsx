"use client";

import React from "react";
import { HP_TEXT } from "@/lib/constants";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
}

export default function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  return (
    <div style={{ padding: '20px 4px 16px' }}>
      <div style={{ ...HP_TEXT.display, fontSize: 28 }}>{title}</div>
      {subtitle && <div style={{ ...HP_TEXT.body, fontSize: 14, marginTop: 4 }}>{subtitle}</div>}
    </div>
  );
}
