"use client";

import React from "react";
import { HP_TEXT } from "@/lib/constants";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
}

export default function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  return (
    <div style={{ padding: '24px 8px 16px' }}>
      <div style={{ ...HP_TEXT.display }}>{title}</div>
      {subtitle && <div style={{ ...HP_TEXT.body, marginTop: 8 }}>{subtitle}</div>}
    </div>
  );
}
