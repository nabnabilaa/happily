import React, { useState, useMemo } from 'react';
import { HP_TOKENS, HP_FONT, HP_TEXT } from '@/lib/constants';
import HPGlyph from '@/components/ui/HPGlyph';
import HPCard from '@/components/ui/HPCard';
import HPAvatar from '@/components/ui/HPAvatar';
import SectionHeader from '@/components/home/SectionHeader';

interface ManagerMembersViewProps {
  membersList: any[];
}

export default function ManagerMembersView({ membersList }: ManagerMembersViewProps) {
  const [currentPageMembers, setCurrentPageMembers] = useState(1);
  const membersPerPage = 10;
  const totalPagesMembers = Math.ceil(membersList.length / membersPerPage);
  const activePageMembers = Math.min(currentPageMembers, Math.max(1, totalPagesMembers));
  
  const paginatedMembers = useMemo(() => {
    const start = (activePageMembers - 1) * membersPerPage;
    return membersList.slice(start, start + membersPerPage);
  }, [membersList, activePageMembers]);

  return (
    <>
      <SectionHeader icon="people" label="Anggota Tim" count={String(membersList.length)} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {paginatedMembers.map((m: any) => (
          <HPCard key={m.id} padding={14}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <HPAvatar name={m.name} size={44} />
              <div style={{ flex: 1 }}>
                <div style={{ ...HP_TEXT.h, fontSize: 14 }}>{m.name}</div>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2 }}>{m.role}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <HPGlyph name={m.mood === 'joy' ? 'sparkle' : m.mood === 'stress' ? 'zap' : 'activity'} size={14} color={HP_TOKENS.ink} />
                  </div>
                  <div style={{ flex: 1, height: 4, background: HP_TOKENS.lineSoft, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${m.wellbeing}%`, height: '100%', background: m.wellbeing > 70 ? HP_TOKENS.sage : m.wellbeing > 40 ? HP_TOKENS.yellow : HP_TOKENS.coral, borderRadius: 2 }} />
                  </div>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>
                    {m.wellbeing > 80 ? '😊' : m.wellbeing > 60 ? '🙂' : m.wellbeing > 40 ? '😐' : '😟'} WB {m.wellbeing}%
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 10, fontFamily: HP_FONT,
                  background: m.statusTone === 'sage' ? HP_TOKENS.sageSoft : m.statusTone === 'yellow' ? HP_TOKENS.yellowSoft : HP_TOKENS.coralSoft,
                  color: m.statusTone === 'sage' ? HP_TOKENS.sage : m.statusTone === 'yellow' ? '#8A6814' : HP_TOKENS.coral,
                  marginBottom: 4,
                }}>
                  {m.status}
                </div>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>
                  Task {m.tasks?.done || 0}/{m.tasks?.total || 0}
                </div>
              </div>
            </div>
          </HPCard>
        ))}
      </div>

      {totalPagesMembers > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <button 
            onClick={() => setCurrentPageMembers(p => Math.max(1, p - 1))}
            disabled={activePageMembers === 1}
            style={{
              padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
              background: activePageMembers === 1 ? HP_TOKENS.lineSoft : '#fff',
              color: activePageMembers === 1 ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
              fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, 
              cursor: activePageMembers === 1 ? 'default' : 'pointer',
              opacity: activePageMembers === 1 ? 0.6 : 1, transition: 'all 0.2s'
            }}
          >Sebelumnya</button>
          <span style={{ fontFamily: HP_FONT, fontSize: 13, fontWeight: 700, color: HP_TOKENS.inkSoft }}>
            {activePageMembers} / {totalPagesMembers}
          </span>
          <button 
            onClick={() => setCurrentPageMembers(p => Math.min(totalPagesMembers, p + 1))}
            disabled={activePageMembers === totalPagesMembers}
            style={{
              padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
              background: activePageMembers === totalPagesMembers ? HP_TOKENS.lineSoft : '#fff',
              color: activePageMembers === totalPagesMembers ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
              fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, 
              cursor: activePageMembers === totalPagesMembers ? 'default' : 'pointer',
              opacity: activePageMembers === totalPagesMembers ? 0.6 : 1, transition: 'all 0.2s'
            }}
          >Berikutnya</button>
        </div>
      )}
    </>
  );
}
