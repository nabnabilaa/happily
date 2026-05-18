import React from "react";
import { HP_TOKENS } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";

interface MascotProps {
  mood?: 'joy' | 'calm' | 'neutral' | 'tired' | 'stress';
  size?: number;
  float?: boolean;
}

export default function Mascot({ 
  size = 64, 
  float = true 
}: MascotProps) {
  return (
    <div style={{
      width: size, 
      height: size, 
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      animation: float ? 'hpFloat 3s ease-in-out infinite' : 'none',
    }}>
      <HPGlyph name="bee" size={size} color={HP_TOKENS.yellow} stroke={1.5} />
    </div>
  );
}
