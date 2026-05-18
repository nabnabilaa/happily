"use client";

import React from "react";
import { HP_TOKENS } from "@/lib/constants";

export interface AvatarConfig {
  skin: string;
  hairStyle: string;
  hairColor: string;
  clothing: string;
  clothingColor: string;
  expression: string;
}

interface HumanAvatarProps {
  config: AvatarConfig;
  size?: number;
}

export default function HumanAvatar({ config, size = 100 }: HumanAvatarProps) {
  const { skin, hairStyle, hairColor, clothingColor, expression } = config;

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      {/* 1. Neck */}
      <rect x="42" y="65" width="16" height="10" fill={skin} />
      
      {/* 2. Clothing / Body */}
      <path 
        d="M20 100C20 85 30 75 50 75C70 75 80 85 80 100H20Z" 
        fill={clothingColor} 
      />
      
      {/* 3. Head Shape */}
      <circle cx="50" cy="45" r="22" fill={skin} />

      {/* 4. Expression - Eyes */}
      <g transform="translate(42, 42)">
        {renderEyes(expression)}
      </g>
      
      {/* 5. Expression - Mouth */}
      <g transform="translate(46, 52)">
        {renderMouth(expression)}
      </g>

      {/* 6. Hair Style */}
      {renderHair(hairStyle, hairColor)}
    </svg>
  );
}

function renderEyes(expression: string) {
  switch (expression) {
    case 'joy':
      return (
        <>
          <path d="M0 2C0 0 4 0 4 2" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M12 2C12 0 16 0 16 2" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" strokeLinecap="round" />
        </>
      );
    case 'tired':
    case 'stress':
      return (
        <>
          <circle cx="2" cy="2" r="1.5" fill="rgba(0,0,0,0.4)" />
          <circle cx="14" cy="2" r="1.5" fill="rgba(0,0,0,0.4)" />
          <path d="M0 6H4" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
          <path d="M12 6H16" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
        </>
      );
    case 'calm':
    default:
      return (
        <>
          <circle cx="2" cy="2" r="2" fill="rgba(0,0,0,0.7)" />
          <circle cx="14" cy="2" r="2" fill="rgba(0,0,0,0.7)" />
        </>
      );
  }
}

function renderMouth(expression: string) {
  switch (expression) {
    case 'joy':
      return <path d="M0 2C2 5 6 5 8 2" stroke="rgba(0,0,0,0.5)" strokeWidth="2" strokeLinecap="round" />;
    case 'stress':
      return <path d="M0 4C2 2 6 2 8 4" stroke="rgba(0,0,0,0.5)" strokeWidth="2" strokeLinecap="round" />;
    case 'tired':
      return <rect x="2" y="2" width="4" height="1.5" rx="0.75" fill="rgba(0,0,0,0.3)" />;
    case 'calm':
    default:
      return <path d="M1 3C3 4 5 4 7 3" stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" strokeLinecap="round" />;
  }
}

function renderHair(style: string, color: string) {
  switch (style) {
    case 'spiky':
      return <path d="M28 45C28 30 35 22 50 22C65 22 72 30 72 45C72 40 68 35 62 33L58 25L50 30L42 25L38 33C32 35 28 40 28 45Z" fill={color} />;
    case 'long':
      return <path d="M28 45V65C28 70 32 75 50 75C68 75 72 70 72 65V45C72 30 65 22 50 22C35 22 28 30 28 45Z" fill={color} />;
    case 'bob':
      return <path d="M25 45V55C25 58 28 60 50 60C72 60 75 58 75 55V45C75 28 65 20 50 20C35 20 25 28 25 45Z" fill={color} />;
    case 'buzz':
      return <path d="M30 45C30 32 38 25 50 25C62 25 70 32 70 45H30V45Z" fill={color} opacity="0.8" style={{ mixBlendMode: 'multiply' }} />;
    case 'short':
    default:
      return <path d="M28 45C28 28 35 22 50 22C65 22 72 28 72 45H28Z" fill={color} />;
  }
}

export function getExpressionFromMood(mood: string | null): string {
  if (!mood) return 'calm';
  const mapping: Record<string, string> = {
    'joy': 'joy',
    'calm': 'calm',
    'neutral': 'calm',
    'tired': 'tired',
    'stress': 'stress'
  };
  return mapping[mood] || 'calm';
}
