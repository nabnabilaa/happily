import React from 'react';
import { HP_TOKENS, HP_TEXT, HP_FONT } from "@/lib/constants";
import HPAvatar from "@/components/ui/HPAvatar";
import HPGlyph from "@/components/ui/HPGlyph";

interface UserProfileCardProps {
  user: any;
  levelProgress: number;
  openModal: (name: string, props?: any) => void;
}

export default function UserProfileCard({ user, levelProgress, openModal }: UserProfileCardProps) {
  if (!user) return null;
  return (
        <div style={{ 
          background: HP_TOKENS.card,
          borderRadius: 24,
          padding: '24px',
          marginTop: 16,
          border: `1px solid ${HP_TOKENS.line}`,
          boxShadow: 'var(--hp-shadow-sm)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div 
            onClick={() => openModal('profile_editor')}
            className="hp-tap"
            style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <HPAvatar 
                  name={user.name} 
                  size={56} 
                  rank={user.rank}
                  levelProgress={levelProgress} 
                />
              </div>
              <div className="hp-profile-name-group">
                <div style={{ ...HP_TEXT.h, fontSize: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.name.split(' ')[0]}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <div style={{ 
                    background: HP_TOKENS.primary, color: '#fff', fontSize: 10, fontWeight: 900, 
                    padding: '2px 8px', borderRadius: 100, letterSpacing: 0.5 
                  }}>
                    Lv.{user.level}
                  </div>
                  <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 800, fontSize: 11 }}>
                    Class {user.rank || 'E'}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, marginLeft: 12 }}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  openModal('system_guide');
                }}
                style={{
                  width: 36, height: 36, borderRadius: 12, border: `1.5px solid ${HP_TOKENS.line}`,
                  background: HP_TOKENS.card, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', boxShadow: '0 2px 8px rgba(26,29,35,0.04)'
                }}
                className="hp-tap"
              >
                <HPGlyph name="book" size={16} color={HP_TOKENS.blue} />
              </button>
              <div className="hp-tap" style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 100,
                background: 'rgba(59, 130, 246, 0.08)', fontFamily: HP_FONT, fontWeight: 900, fontSize: 14, color: HP_TOKENS.primary,
                border: '1.5px solid rgba(59, 130, 246, 0.25)',
              }}>
                <HPGlyph name="zap" size={14} color={HP_TOKENS.primary} />
                <span>{user.streak}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>Level Progress</div>
              <div style={{ width: '100%', height: 6, background: 'var(--hp-border)', borderRadius: 100, overflow: 'hidden' }}>
                <div style={{ 
                  width: `${levelProgress * 100}%`, height: '100%', 
                  background: '#3B82F6', 
                  borderRadius: 100,
                  transition: '1s cubic-bezier(0.2, 0.8, 0.2, 1)',
                }} />
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>Total Point</div>
              <div style={{ ...HP_TEXT.h, fontSize: 24 }}>{user.points.toLocaleString()}</div>
            </div>
          </div>
        </div>
  );
}
