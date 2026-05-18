"use client";

import React from "react";
import { useHP } from "@/lib/HPContext";
import { 
  HP_TOKENS, 
  HP_FONT, 
  HP_TEXT 
} from "@/lib/constants";
import Modal from "@/components/ui/Modal";
import HPPlaceholder from "@/components/ui/HPPlaceholder";

interface LearningDetailModalProps {
  onClose: () => void;
}

export default function LearningDetailModal({ onClose }: LearningDetailModalProps) {
  const { updateUser, syncSkillProgress } = useHP();

  const handleFinish = () => {
    // Award Points
    updateUser((u: any) => ({ ...u, points: u.points + 100 }));
    // Sync Skill (Simulating AI analysis of the 'Leadership' tag)
    syncSkillProgress("Leadership", 10);
    onClose();
  };

  return (
    <Modal onClose={onClose} title="Learning Detail">
      <div style={{ marginTop: 4 }}>
        <HPPlaceholder label="Course Thumbnail" h={180} tone="blue"/>
        <div style={{ ...HP_TEXT.h, fontSize: 20, marginTop: 20 }}>Mastering Influence without Authority</div>
        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 6 }}>Leadership · 8 menit pembacaan</div>
        
        <div style={{ ...HP_TEXT.body, fontSize: 14, color: HP_TOKENS.ink, marginTop: 16, lineHeight: 1.6 }}>
          Dalam modul ini, kamu akan mempelajari teknik persuasi dan negosiasi yang efektif meskipun kamu tidak memiliki otoritas struktural. Sangat berguna untuk Product Designer saat melakukan alignment dengan stakeholder.
        </div>

        <button 
          onClick={handleFinish} 
          style={{
            width: '100%', marginTop: 32, padding: '16px', borderRadius: 99,
            background: HP_TOKENS.sage, color: '#fff', border: 'none',
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer',
            boxShadow: `0 8px 24px ${HP_TOKENS.sageSoft}`,
          }}
          className="hp-tap"
        >
          Selesai Belajar 🌱
        </button>
      </div>
    </Modal>
  );
}
