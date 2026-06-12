import React from 'react';
import { HP_TOKENS, HP_TEXT, HP_FONT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";

interface HabitDetailsModalProps {
  selectedHabitDay: { name: string, date: Date, isToday: boolean, done: boolean };
  setSelectedHabitDay: (val: any) => void;
  habitNote: string;
  setHabitNote: (val: string) => void;
  state: any;
  saveHabitDay: (newDone: boolean) => void;
}

export default function HabitDetailsModal({ 
  selectedHabitDay, 
  setSelectedHabitDay, 
  habitNote, 
  setHabitNote, 
  state, 
  saveHabitDay 
}: HabitDetailsModalProps) {
  return (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
          background: 'rgba(26,29,35,0.6)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }}>
          <div style={{
            background: HP_TOKENS.paper, width: '100%', maxWidth: 500, borderRadius: '24px 24px 0 0',
            padding: 24, paddingBottom: 40, animation: 'hpSlideUp 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
            borderTop: `1.5px solid ${HP_TOKENS.line}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ ...HP_TEXT.h, fontSize: 20 }}>{selectedHabitDay.name}</div>
                <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 4 }}>
                  {selectedHabitDay.date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <button 
                onClick={() => setSelectedHabitDay(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 8, color: HP_TOKENS.inkFade }}
              >
                ✕
              </button>
            </div>

            {!selectedHabitDay.isToday && !selectedHabitDay.done && (
              <div style={{
                background: HP_TOKENS.yellowSoft, padding: 12, borderRadius: 12, marginBottom: 16,
                border: `1px solid ${HP_TOKENS.yellow}`, display: 'flex', gap: 10, alignItems: 'flex-start'
              }}>
                <span style={{ fontSize: 16 }}>⚠️</span>
                <div style={{ ...HP_TEXT.small, color: '#8A6814', lineHeight: 1.4 }}>
                  <strong>Konfirmasi:</strong> Kamu sedang mengubah data untuk hari yang sudah lewat. Apakah kamu terlewat atau salah pencet?
                </div>
              </div>
            )}

            {selectedHabitDay.done ? (() => {
              const targetDateStr = selectedHabitDay.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
              const log = state.logbook?.find((l: any) => 
                l.type === 'habit_completion' && 
                l.habitName === selectedHabitDay.name && 
                l.date === targetDateStr && 
                l.content !== 'Belum Selesai'
              );
              let pastNote = "";
              if (log) {
                try {
                  const meta = JSON.parse(log.metadata_json || "{}");
                  if (meta.notes) pastNote = meta.notes;
                } catch (e) {}
                if (!pastNote && log.content !== 'Selesai') pastNote = log.content;
              }

              return (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ padding: 16, background: HP_TOKENS.yellowSoft, borderRadius: 16, border: `1.5px solid ${HP_TOKENS.yellow}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <HPGlyph name="check" size={16} color={HP_TOKENS.ink} stroke={3} />
                      <span style={{ ...HP_TEXT.h, fontSize: 15 }}>Selesai</span>
                    </div>
                    <div style={{ ...HP_TEXT.body, fontSize: 14, whiteSpace: 'pre-wrap' }}>
                      {pastNote || "Tidak ada catatan untuk sesi ini."}
                    </div>
                  </div>
                  <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => {
                        if (window.confirm("Yakin ingin membatalkan status selesai untuk hari ini?")) {
                          saveHabitDay(false);
                        }
                      }}
                      className="hp-tap"
                      style={{ background: 'transparent', color: HP_TOKENS.coral, border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
                    >
                      Batalkan Status Selesai
                    </button>
                  </div>
                </div>
              );
            })() : (
              <div style={{ marginBottom: 16 }}>
                <label style={{ ...HP_TEXT.small, fontWeight: 700, color: HP_TOKENS.inkMute, display: 'block', marginBottom: 8 }}>
                  Catatan Harian (Opsional)
                </label>
                <textarea 
                  value={habitNote}
                  onChange={(e) => setHabitNote(e.target.value)}
                  placeholder="Ada yang ingin dicatat untuk sesi ini? (Sesi curhat / progres)"
                  style={{
                    width: '100%', padding: 12, borderRadius: 12, border: `1.5px solid ${HP_TOKENS.line}`,
                    background: HP_TOKENS.card, color: HP_TOKENS.ink, fontFamily: HP_FONT, fontSize: 14, minHeight: 80, resize: 'vertical'
                  }}
                />
                <div style={{ marginTop: 16 }}>
                  <button 
                    onClick={() => saveHabitDay(true)}
                    className="hp-tap"
                    style={{
                      width: '100%', padding: '16px', borderRadius: 14, border: 'none',
                      background: HP_TOKENS.yellow, color: HP_TOKENS.ink,
                      fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, cursor: 'pointer'
                    }}
                  >
                    Tandai Selesai
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
  );
}
