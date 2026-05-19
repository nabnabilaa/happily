"use client";

import { HP_TOKENS, HP_FONT } from "@/lib/constants";
import { useHP } from "@/lib/HPContext";

interface HPAvatarProps {
  name: string;
  size?: number;
  color?: string;
  levelProgress?: number; // 0 to 1
  rank?: string;
  image?: string;
}

export default function HPAvatar({ 
  name, 
  size = 36, 
  color,
  levelProgress = 0,
  rank,
  image
}: HPAvatarProps) {
  const { user: currentUser } = useHP();
  
  // Use provided image, or if none, only use currentUser's image if this avatar is for the currentUser
  // But wait, it's safer to just use the 'image' prop if provided.
  const avatarToDisplay = image || (name === currentUser?.name ? currentUser?.avatarImage : null);

  const initials = name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
  const palette = [HP_TOKENS.sage, HP_TOKENS.blue, HP_TOKENS.coral, HP_TOKENS.lavender, '#B5884A'];
  const bg = color || palette[name.charCodeAt(0) % palette.length];
  
  const ringSize = size + 8;
  const stroke = 3;
  const radius = (ringSize - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (levelProgress * circumference);

  return (
    <div style={{ position: 'relative', width: ringSize, height: ringSize, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {levelProgress > 0 && (
        <svg 
          width={ringSize} 
          height={ringSize} 
          style={{ position: 'absolute', transform: 'rotate(-90deg)' }}
        >
          <circle
            cx={ringSize/2}
            cy={ringSize/2}
            r={radius}
            fill="transparent"
            stroke={HP_TOKENS.line}
            strokeWidth={stroke}
          />
          <circle
            cx={ringSize/2}
            cy={ringSize/2}
            r={radius}
            fill="transparent"
            stroke={HP_TOKENS.yellow}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
      )}
      <div style={{
        width: size, 
        height: size, 
        borderRadius: size / 2,
        background: avatarToDisplay ? 'transparent' : bg, 
        color: '#fff',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontFamily: HP_FONT, 
        fontWeight: 800, 
        fontSize: size * 0.38,
        flexShrink: 0, 
        letterSpacing: 0.2,
        position: 'relative',
        zIndex: 1,
        overflow: 'hidden',
      }}>
        {avatarToDisplay ? (
          <img 
            src={avatarToDisplay} 
            alt={name} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        ) : (
          initials
        )}
      </div>
      {rank && (
        <div style={{
          position: 'absolute', bottom: 4, right: 4, width: 22, height: 22, borderRadius: 11,
          background: HP_TOKENS.yellow, color: '#8A6814', fontSize: 11, fontWeight: 900,
          display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff',
          zIndex: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          animation: 'hpPop 0.3s ease-out'
        }}>
          {rank.substring(0, 1).toUpperCase()}
        </div>
      )}
    </div>
  );
}
