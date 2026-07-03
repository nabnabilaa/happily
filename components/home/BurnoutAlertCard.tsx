"use client";

import React, { useState } from 'react';
import { useHP } from '@/lib/HPContext';
import HPCard from '@/components/ui/HPCard';
import HPGlyph from '@/components/ui/HPGlyph';
import { HP_TOKENS, HP_FONT, HP_TEXT } from '@/lib/constants';
import HPAvatar from '@/components/ui/HPAvatar';

interface Props {
  openModal?: (name: string, props?: any) => void;
}

export default function BurnoutAlertCard({ openModal }: Props) {
  const { state } = useHP();
  const alerts = state?.hrData?.atRiskEmployees || [];
  
  const ITEMS_PER_PAGE = 3;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(alerts.length / ITEMS_PER_PAGE);
  const currentAlerts = alerts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  if (alerts.length === 0) {
    return (
      <div id="burnout-alert-section" style={{ marginTop: 24 }}>
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
    <div id="burnout-alert-section" style={{ marginTop: 24 }}>
      <HPCard padding={16} style={{ border: `1.5px solid ${HP_TOKENS.coral}`, transition: 'all 0.3s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: HP_TOKENS.coralSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HPGlyph name="alertCircle" size={20} color={HP_TOKENS.coral} />
            </div>
            <div>
              <div style={{ ...HP_TEXT.h, fontSize: 16 }}>Daftar At Risk</div>
              <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 2 }}>
                <span style={{ color: HP_TOKENS.coral, fontWeight: 800 }}>{alerts.length} karyawan</span> terdeteksi berisiko.
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10, borderTop: `1.5px dashed ${HP_TOKENS.lineSoft}`, paddingTop: 16 }}>
          {currentAlerts.map((alert: any, i: number) => {
              const isHigh = alert.risk === 'high';
              const triggers = [];
              if (alert.wellbeing < 50) triggers.push(`Wellbeing: ${alert.wellbeing}/100`);
              if (alert.completionRate < 30) triggers.push(`Performa: ${alert.completionRate}%`);
              if (triggers.length === 0) triggers.push("Konsistensi menurun");

              return (
                <div 
                  key={i} 
                  className="hp-tap"
                  onClick={() => openModal && openModal('employee_profile', { employeeId: alert.id, employeeName: alert.name })}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px', borderRadius: 16, cursor: 'pointer',
                    background: isHigh ? 'rgba(255, 68, 68, 0.05)' : 'rgba(245, 158, 11, 0.05)',
                    border: `1px solid ${isHigh ? 'rgba(255, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
                  }}
                >
                  <HPAvatar name={alert.name} size={42} />
                  <div style={{ flex: 1 }}>
                    <div style={{ ...HP_TEXT.h, fontSize: 14 }}>{alert.name}</div>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2 }}>{alert.dept || alert.department || 'Unassigned'}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      {triggers.map((trig, idx) => (
                        <div key={idx} style={{ padding: '2px 8px', borderRadius: 6, background: HP_TOKENS.card, border: `1px solid ${HP_TOKENS.lineSoft}`, fontSize: 10, fontFamily: HP_FONT, fontWeight: 700, color: HP_TOKENS.inkSoft }}>
                          {trig}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <div style={{ 
                      padding: '4px 10px', borderRadius: 99, 
                      background: isHigh ? HP_TOKENS.coral : HP_TOKENS.yellow,
                      color: isHigh ? '#fff' : HP_TOKENS.ink,
                      fontSize: 10, fontWeight: 900, fontFamily: HP_FONT
                    }}>
                      {isHigh ? 'Tinggi' : 'Sedang'}
                    </div>
                    <HPGlyph name="chevron-right" size={16} color={HP_TOKENS.inkMute} />
                  </div>
                </div>
              );
            })}
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, padding: '8px 4px' }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="hp-tap"
                  style={{
                    padding: '6px 12px', borderRadius: 8, border: 'none', cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    background: currentPage === 1 ? HP_TOKENS.lineSoft : HP_TOKENS.blue,
                    color: currentPage === 1 ? HP_TOKENS.inkMute : '#fff',
                    fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, transition: 'all 0.2s'
                  }}
                >
                  Prev
                </button>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkSoft, fontWeight: 800 }}>
                  Page {currentPage} / {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="hp-tap"
                  style={{
                    padding: '6px 12px', borderRadius: 8, border: 'none', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    background: currentPage === totalPages ? HP_TOKENS.lineSoft : HP_TOKENS.blue,
                    color: currentPage === totalPages ? HP_TOKENS.inkMute : '#fff',
                    fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, transition: 'all 0.2s'
                  }}
                >
                  Next
                </button>
              </div>
            )}

            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, textAlign: 'center', marginTop: 8 }}>
              *Sistem otomatis mengirim notifikasi pengingat secara personal ke email karyawan.
            </div>
          </div>
      </HPCard>
    </div>
  );
}
