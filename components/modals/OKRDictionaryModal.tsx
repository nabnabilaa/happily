"use client";

import React from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import Modal from "@/components/ui/Modal";

interface OKRDictionaryModalProps {
  onClose: () => void;
}

export default function OKRDictionaryModal({ onClose }: OKRDictionaryModalProps) {
  const dictionaryItems = [
    {
      term: "O (Objective)",
      icon: "target",
      tone: HP_TOKENS.blue,
      desc: "Tujuan besar yang ingin dicapai. Sifatnya inspirasional, kualitatif, dan memberikan arah (What do we want to achieve?)."
    },
    {
      term: "KR (Key Result)",
      icon: "activity",
      tone: HP_TOKENS.yellow,
      desc: "Hasil kunci yang bisa diukur. Sifatnya kuantitatif, memiliki metrik yang jelas, dan membuktikan apakah Objective sudah tercapai (How do we know we've achieved it?)."
    },
    {
      term: "Alignment (Keselarasan)",
      icon: "link",
      tone: HP_TOKENS.sage,
      desc: "Sejauh mana OKR Personal atau Tim kamu terhubung dan mendukung pencapaian OKR Perusahaan yang lebih besar."
    },
    {
      term: "Scope (Cakupan)",
      icon: "people",
      tone: HP_TOKENS.lavender,
      desc: "Menentukan siapa yang bertanggung jawab atas OKR ini. Bisa berupa 'Saya' (Personal), 'Tim', atau 'Perusahaan'."
    },
    {
      term: "Realisasi (Task / Quest)",
      icon: "check",
      tone: HP_TOKENS.coral,
      desc: "Tugas, aktivitas, atau inisiatif sehari-hari yang dilakukan untuk mencapai Key Results."
    }
  ];

  return (
    <Modal onClose={onClose} title="Kamus OKR">
      <div style={{ marginTop: 8 }}>
        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginBottom: 16, lineHeight: 1.5 }}>
          OKR (Objectives and Key Results) adalah kerangka kerja untuk menetapkan target perusahaan, tim, dan individu agar semuanya selaras dan terukur.
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {dictionaryItems.map((item, idx) => (
            <div key={idx} style={{ 
              display: 'flex', 
              gap: 16, 
              padding: 16, 
              borderRadius: 16, 
              background: HP_TOKENS.card,
              border: `1.5px solid ${HP_TOKENS.line}`
            }}>
              <div style={{ 
                width: 40, height: 40, borderRadius: 12, 
                background: `${item.tone}20`, // 20% opacity wash
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <HPGlyph name={item.icon} size={20} color={item.tone} />
              </div>
              <div>
                <div style={{ ...HP_TEXT.h, fontSize: 15, color: HP_TOKENS.ink }}>
                  {item.term}
                </div>
                <div style={{ ...HP_TEXT.body, fontSize: 13, color: HP_TOKENS.inkSoft, marginTop: 4, lineHeight: 1.5 }}>
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={onClose}
          className="hp-tap"
          style={{
            marginTop: 24, padding: 14, borderRadius: 12, border: 'none',
            background: HP_TOKENS.ink, color: '#fff', width: '100%',
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer'
          }}
        >
          Mengerti
        </button>
      </div>
    </Modal>
  );
}
