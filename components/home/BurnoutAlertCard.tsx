"use client";

import React from 'react';
import { useHP } from '@/lib/HPContext';
import HPCard from '@/components/ui/HPCard';
import HPGlyph from '@/components/ui/HPGlyph';
import { HP_TOKENS, HP_FONT, HP_TEXT } from '@/lib/constants';
import HPAvatar from '@/components/ui/HPAvatar';

export default function BurnoutAlertCard() {
  const { state } = useHP();
  const alerts = state?.hrData?.atRiskEmployees || [];

  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 3;
  const totalPages = Math.ceil(alerts.length / itemsPerPage);

  const paginatedAlerts = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return alerts.slice(start, start + itemsPerPage);
  }, [alerts, currentPage]);

  if (alerts.length === 0) {
    return (
      <div style={{ marginTop: 24 }}>
        <HPCard padding={16} style={{ 
          background: HP_TOKENS.sageSoft,
          border: `1.5px solid ${HP_TOKENS.sage}`,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{ fontSize: 24 }}>😊</div>
          <div style={{ flex: 1 }}>
            <div style={{ ...HP_TEXT.h, fontSize: 14, color: HP_TOKENS.sage }}>Kondisi Karyawan Aman</div>
            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 2 }}>
              Tidak ada karyawan yang terdeteksi berisiko burnout saat ini.
            </div>
          </div>
        </HPCard>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <HPGlyph name="alertCircle" size={18} color={HP_TOKENS.coral} />
        <div style={{ ...HP_TEXT.h, fontSize: 16 }}>Burnout Early Warning ({alerts.length})</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {paginatedAlerts.map((alert: any, i: number) => {
          const isHigh = alert.risk === 'high';
          const triggers = [];
          if (alert.wellbeing < 50) {
            triggers.push(`Tingkat wellbeing rendah (Skor ${alert.wellbeing}/100 - Mood: ${alert.mood || 'neutral'})`);
          }
          if (alert.completionRate < 30) {
            triggers.push(`Penyelesaian tugas harian di bawah target (Hanya ${alert.completionRate}%)`);
          }
          if (triggers.length === 0) {
            triggers.push("Penurunan konsistensi performa kerja mingguan");
          }

          return (
            <HPCard key={i} padding={16} style={{ 
              background: isHigh ? HP_TOKENS.coralSoft : HP_TOKENS.yellowWash,
              border: `1.5px solid ${isHigh ? HP_TOKENS.coral : HP_TOKENS.yellow}`
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <HPAvatar name={alert.name} size={40} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ ...HP_TEXT.h, fontSize: 15 }}>{alert.name}</div>
                      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>{alert.dept || alert.department || 'Unassigned'}</div>
                    </div>
                    <div style={{ 
                      padding: '4px 10px', borderRadius: 99, 
                      background: isHigh ? HP_TOKENS.coral : HP_TOKENS.yellow,
                      color: isHigh ? '#fff' : HP_TOKENS.ink,
                      fontSize: 11, fontWeight: 900, fontFamily: HP_FONT
                    }}>
                      Risiko {isHigh ? 'Tinggi' : 'Sedang'}
                    </div>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <div style={{ ...HP_TEXT.tiny, fontWeight: 800, marginBottom: 4, color: HP_TOKENS.ink }}>
                      Indikator:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 20, ...HP_TEXT.small, color: HP_TOKENS.inkSoft, lineHeight: 1.5 }}>
                      {triggers.map((trig: string, idx: number) => (
                        <li key={idx}>{trig}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <div style={{
                      padding: '6px 12px', borderRadius: 8,
                      background: HP_TOKENS.sageSoft, color: HP_TOKENS.sage, fontFamily: HP_FONT, fontSize: 12, fontWeight: 800,
                    }}>
                      ✅ Pesan Otomatis Terkirim
                    </div>
                  </div>
                </div>
              </div>
            </HPCard>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
              background: currentPage === 1 ? HP_TOKENS.lineSoft : '#fff',
              color: currentPage === 1 ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
              fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, 
              cursor: currentPage === 1 ? 'default' : 'pointer',
              opacity: currentPage === 1 ? 0.6 : 1, transition: 'all 0.2s'
            }}
          >
            Sebelumnya
          </button>
          <span style={{ fontFamily: HP_FONT, fontSize: 13, fontWeight: 700, color: HP_TOKENS.inkSoft }}>
            {currentPage} / {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
              background: currentPage === totalPages ? HP_TOKENS.lineSoft : '#fff',
              color: currentPage === totalPages ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
              fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, 
              cursor: currentPage === totalPages ? 'default' : 'pointer',
              opacity: currentPage === totalPages ? 0.6 : 1, transition: 'all 0.2s'
            }}
          >
            Berikutnya
          </button>
        </div>
      )}
    </div>
  );
}
