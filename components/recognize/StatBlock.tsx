"use client";

import React from "react";
import { HP_TOKENS, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";

interface StatBlockProps {
  label: string;
  value: string;
  icon: string;
  tone: 'yellow' | 'coral' | 'sage' | 'blue' | 'lavender';
}

export default function StatBlock({ label, value, icon, tone }: StatBlockProps) {
  const bg = { yellow: HP_TOKENS.yellowSoft, coral: HP_TOKENS.coralSoft, sage: HP_TOKENS.sageSoft, blue: HP_TOKENS.blueSoft, lavender: HP_TOKENS.lavenderSoft }[tone];
  // Ink steps, not the surface tokens: `yellowDark` is 3.1:1 on card and the
  // plain `sage`/`lavender` are under 4.5:1, so a glyph in them sat on the
  // edge of legible against its own soft tint.
  const fg = { yellow: HP_TOKENS.yellowInk, coral: HP_TOKENS.dangerInk, sage: HP_TOKENS.sageInk, blue: HP_TOKENS.blue, lavender: HP_TOKENS.lavenderInk }[tone];
  
  return (
    <div style={{ flex: 1 }}>
      <div style={{ 
        width: 28, 
        height: 28, 
        borderRadius: 8, 
        background: bg, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginBottom: 6 
      }}>
        <HPGlyph name={icon} size={16} color={fg}/>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {label.toLowerCase().includes('poin') && (
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            background: HP_TOKENS.gold,
            border: `2px solid `,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <HPGlyph name="star" size={10} color={HP_TOKENS.yellowInk} />
          </div>
        )}
        <div style={{ ...HP_TEXT.title, fontSize: 22 }}>{value}</div>
      </div>
      <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 600 }}>{label}</div>
    </div>
  );
}
