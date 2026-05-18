"use client";

import React from "react";

interface BlobBackgroundProps {
  colors: string[];
}

export default function BlobBackground({ colors }: BlobBackgroundProps) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <div style={{
        position: 'absolute', 
        top: -60, 
        right: -40, 
        width: 220, 
        height: 220,
        background: colors[0], 
        filter: 'blur(80px)', 
        opacity: 0.3,
      }}/>
      <div style={{
        position: 'absolute', 
        top: 140, 
        left: -60, 
        width: 200, 
        height: 200,
        background: colors[1], 
        filter: 'blur(100px)', 
        opacity: 0.25,
      }}/>
    </div>
  );
}
