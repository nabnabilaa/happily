"use client";

import React, { useState } from "react";
import { useHP } from "@/lib/HPContext";
import { 
  HP_TOKENS, 
  HP_FONT, 
  HP_TEXT 
} from "@/lib/constants";
import Modal from "@/components/ui/Modal";

interface ScheduleCoachingModalProps {
  onClose: () => void;
}

export default function ScheduleCoachingModal({ onClose }: ScheduleCoachingModalProps) {
  const { state, updateState } = useHP();
  const [coach, setCoach] = useState(state?.coaching?.coachName || "");
  const [time, setTime] = useState(state?.coaching?.time || "");
  const [meetLink, setMeetLink] = useState(state?.coaching?.meetLink || "");

  const save = () => {
    updateState((s: any) => ({
      ...s,
      coaching: { ...s.coaching, coachName: coach, time, meetLink }
    }));
    onClose();
  };

  return (
    <Modal onClose={onClose} title="Schedule 1-on-1">
      <div style={{ marginTop: 4 }}>
        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700 }}>COACH / MANAGER</div>
        <input 
          type="text" 
          value={coach} 
          onChange={e => setCoach(e.target.value)}
          placeholder="Nama coach kamu"
          style={{
            width: '100%', marginTop: 10, padding: 14, borderRadius: 14,
            border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontSize: 14,
            color: HP_TOKENS.ink, outline: 'none', background: HP_TOKENS.card, boxSizing: 'border-box',
          }}
        />

        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700, marginTop: 20 }}>WAKTU SESI</div>
        <input 
          type="text" 
          value={time} 
          onChange={e => setTime(e.target.value)}
          placeholder="Misal: Kamis, 10:00"
          style={{
            width: '100%', marginTop: 10, padding: 14, borderRadius: 14,
            border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontSize: 14,
            color: HP_TOKENS.ink, outline: 'none', background: HP_TOKENS.card, boxSizing: 'border-box',
          }}
        />

        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700, marginTop: 20 }}>GOOGLE MEET LINK</div>
        <input 
          type="text" 
          value={meetLink} 
          onChange={e => setMeetLink(e.target.value)}
          placeholder="https://meet.google.com/..."
          style={{
            width: '100%', marginTop: 10, padding: 14, borderRadius: 14,
            border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontSize: 14,
            color: HP_TOKENS.ink, outline: 'none', background: HP_TOKENS.card, boxSizing: 'border-box',
          }}
        />


        <button 
          onClick={save} 
          style={{
            width: '100%', marginTop: 32, padding: '16px', borderRadius: 99,
            background: HP_TOKENS.blue, color: '#fff', border: 'none',
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer',
            boxShadow: `0 8px 24px ${HP_TOKENS.blueSoft}`,
          }}
          className="hp-tap"
        >
          Update Jadwal 📅
        </button>
      </div>
    </Modal>
  );
}
