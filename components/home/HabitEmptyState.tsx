"use client";

import React from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";

interface Props {
  openModal: (name: string, props?: any) => void;
}

export default function HabitEmptyState({ openModal }: Props) {
  return (
    <div style={{
      padding: '20px',
      borderRadius: 20,
      background: HP_TOKENS.sageWash,
      border: `2px dashed ${HP_TOKENS.sageSoft}`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      cursor: 'pointer'
    }} onClick={() => openModal('manage_habits')} className="hp-tap">
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        boxShadow: '0 4px 12px rgba(133, 179, 137, 0.15)'
      }}>
        <HPGlyph name="leaf" size={24} color={HP_TOKENS.sage} />
      </div>
      <div style={{ ...HP_TEXT.h, fontSize: 16, color: HP_TOKENS.sage }}>Mulai Daily Training</div>
      <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 4, maxWidth: 260 }}>
        Bangun rutinitas kecil setiap hari. Tingkatkan produktivitas dan jaga kesehatan mentalmu dengan menjaga konsistensi (*streak*).
      </div>
      <button style={{
        marginTop: 16,
        padding: '10px 20px',
        borderRadius: 14,
        background: HP_TOKENS.sage,
        color: '#fff',
        border: 'none',
        fontFamily: HP_FONT,
        fontWeight: 800,
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer'
      }}>
        <HPGlyph name="plus" size={14} color="#fff" />
        Tambah Latihan
      </button>
    </div>
  );
}
