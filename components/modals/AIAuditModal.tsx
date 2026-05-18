"use client";

import React, { useState, useEffect } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import Modal from "@/components/ui/Modal";
import HPGlyph from "@/components/ui/HPGlyph";

interface AIAuditModalProps {
  onClose: () => void;
  type: 'weekly' | 'monthly';
}

export default function AIAuditModal({ onClose, type }: AIAuditModalProps) {
  const { user, state } = useHP();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<string>("");

  useEffect(() => {
    // Simulasi AI memproses laporan
    const processAI = setTimeout(() => {
      if (type === 'weekly') {
        setReport(`**🤖 AI Weekly Summary (${new Date().toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })})**\n\nAnalisa performa tim minggu ini:\n\n- **Project Jangka Panjang (Terdeteksi):** AI mendeteksi beberapa link bukti kerja yang disubmit berulang kali. Ini mengindikasikan tim sedang berfokus pada project besar yang butuh beberapa hari pengerjaan.\n- **Pencapaian Sales/Metrik:** Berdasarkan input nilai metrik harian, tim telah mencapai progres 65% dari target mingguan.\n- **Saran:** Apresiasi tim yang konsisten melaporkan *Proof of Work*. Pertimbangkan untuk mereview kembali beban kerja pada akhir minggu.`);
      } else {
        setReport(`**🔮 AI Monthly KPI Analysis (${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})**\n\nEvaluasi Laporan Bulanan vs KPI:\n\n- **Pencapaian Target Utama:** 85% dari bobot KPI berhasil diselesaikan dengan baik.\n- **Evaluasi Bukti Kerja:** Analisa silang terhadap link bukti kerja menunjukkan konsistensi tinggi dengan laporan yang ditulis.\n- **Rekomendasi:** Berikan bonus performa pada kuartal ini berdasarkan data *Logbook Activity* yang solid.`);
      }
      setLoading(false);
    }, 2500);

    return () => clearTimeout(processAI);
  }, [type]);

  return (
    <Modal onClose={onClose} title={type === 'weekly' ? "Rangkuman Mingguan AI" : "Analisa Bulanan AI"}>
      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ 
            width: 80, height: 80, borderRadius: 40, background: HP_TOKENS.blueWash,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
            animation: 'hpPulse 1.5s infinite'
          }}>
            <HPGlyph name="sparkle" size={40} color={HP_TOKENS.blue}/>
          </div>
          <div style={{ ...HP_TEXT.h, fontSize: 18, color: HP_TOKENS.ink }}>
            {type === 'weekly' ? 'Menganalisa logbook & progres mingguan...' : 'Menyelaraskan laporan bulanan dengan KPI...'}
          </div>
          <div style={{ ...HP_TEXT.body, fontSize: 14, marginTop: 8, color: HP_TOKENS.inkMute }}>
            AI sedang mencari pola kerja dan project jangka panjang.
          </div>
        </div>
      ) : (
        <div style={{ padding: 10 }}>
          <div style={{
            background: HP_TOKENS.paper, padding: 20, borderRadius: 20, border: `1.5px solid ${HP_TOKENS.lineSoft}`,
            whiteSpace: 'pre-wrap', fontFamily: HP_FONT, fontSize: 14, lineHeight: 1.6, color: HP_TOKENS.ink
          }}>
            {report}
          </div>

          <button onClick={onClose} style={{
            marginTop: 24, width: '100%', padding: '16px', borderRadius: 16, border: 'none',
            background: type === 'weekly' ? HP_TOKENS.blue : '#6B5F8E', color: '#fff',
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, cursor: 'pointer',
            boxShadow: `0 8px 24px ${type === 'weekly' ? HP_TOKENS.blueSoft : '#6B5F8E40'}`
          }} className="hp-tap">
            Mengerti & Tutup
          </button>
        </div>
      )}
    </Modal>
  );
}
