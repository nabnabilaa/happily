"use client";

import React, { useState, useEffect } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import Modal from "@/components/ui/Modal";
import HPGlyph from "@/components/ui/HPGlyph";

interface StatusInputModalProps {
  onClose: () => void;
}

type StatusOption = {
  key: string;
  label: string;
  emoji: string;
  color: string;
  needsReason: boolean;
  needsAttachment: boolean;
  placeholder: string;
};

const STATUS_OPTIONS: StatusOption[] = [
  { key: 'working',  label: 'Sedang Bekerja',  emoji: '💻', color: '#2D8A4E', needsReason: false, needsAttachment: false, placeholder: '' },
  { key: 'meeting',  label: 'Dalam Meeting',   emoji: '📞', color: '#3B6FA0', needsReason: false, needsAttachment: false, placeholder: '' },
  { key: 'break',    label: 'Istirahat',        emoji: '☕', color: '#D4A017', needsReason: false, needsAttachment: false, placeholder: '' },
  { key: 'away',     label: 'Away / AFK',       emoji: '🚶', color: '#8A8A8A', needsReason: false, needsAttachment: false, placeholder: '' },
  { key: 'sick',     label: 'Sakit',            emoji: '🤒', color: '#E03131', needsReason: true,  needsAttachment: true, placeholder: 'Jelaskan kondisi kesehatan...' },
  { key: 'izin',     label: 'Izin',             emoji: '📋', color: '#7B6BB5', needsReason: true,  needsAttachment: false, placeholder: 'Alasan izin...' },
  { key: 'cuti',     label: 'Cuti',             emoji: '🏖️', color: '#2196F3', needsReason: true,  needsAttachment: false, placeholder: 'Keterangan cuti...' },
];

export default function StatusInputModal({ onClose }: StatusInputModalProps) {
  const { user, notify } = useHP();
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [reason, setReason] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>('');

  // Fetch current status
  useEffect(() => {
    async function fetchCurrent() {
      try {
        const res = await fetch(`/api/status?managerId=`);
        const data = await res.json();
        const me = data.users?.find((u: any) => u.id === user?.id);
        if (me) setCurrentStatus(me.status);
      } catch (e) { /* ignore */ }
    }
    if (user?.id) fetchCurrent();
  }, [user?.id]);

  const selectedOption = STATUS_OPTIONS.find(s => s.key === selectedStatus);

  const handleSave = async () => {
    if (!selectedStatus || !user?.id) return;
    if (selectedOption?.needsReason && !reason.trim()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          status: selectedStatus,
          reason: reason || null,
          attachmentUrl: attachmentUrl || null,
        }),
      });

      if (res.ok) {
        notify(
          'Status Updated',
          `Status kamu sekarang: ${selectedOption?.emoji} ${selectedOption?.label}`,
          'success'
        );
        onClose();
      }
    } catch (e) {
      console.error("Failed to update status:", e);
      notify('Error', 'Gagal mengupdate status', 'error');
    }
    setSaving(false);
  };

  return (
    <Modal onClose={onClose} title="📡 Update Status">
      <div style={{ marginTop: 4 }}>
        {/* Current status indicator */}
        {currentStatus && (
          <div style={{
            padding: '10px 14px', borderRadius: 12, marginBottom: 16,
            background: HP_TOKENS.paper, border: `1px solid ${HP_TOKENS.line}`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>Status saat ini:</div>
            <div style={{
              padding: '3px 10px', borderRadius: 8,
              background: `${STATUS_OPTIONS.find(s => s.key === currentStatus)?.color || '#ccc'}15`,
              fontFamily: HP_FONT, fontWeight: 800, fontSize: 11,
              color: STATUS_OPTIONS.find(s => s.key === currentStatus)?.color || '#ccc',
            }}>
              {STATUS_OPTIONS.find(s => s.key === currentStatus)?.emoji}{' '}
              {STATUS_OPTIONS.find(s => s.key === currentStatus)?.label || currentStatus}
            </div>
          </div>
        )}

        {/* Status grid */}
        <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 8 }}>PILIH STATUS BARU</div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8,
          marginBottom: 20,
        }}>
          {STATUS_OPTIONS.map(s => (
            <button
              key={s.key}
              onClick={() => {
                setSelectedStatus(s.key);
                if (!s.needsReason) setReason('');
                if (!s.needsAttachment) setAttachmentUrl('');
              }}
              className="hp-tap"
              style={{
                padding: '14px 12px', borderRadius: 14, border: 'none',
                background: selectedStatus === s.key ? s.color : HP_TOKENS.card,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                transition: 'all 0.2s',
                boxShadow: selectedStatus === s.key ? `0 4px 16px ${s.color}40` : `0 1px 4px rgba(0,0,0,0.04)`,
                outline: selectedStatus === s.key ? 'none' : `1.5px solid ${HP_TOKENS.line}`,
              }}
            >
              <div style={{ fontSize: 22 }}>{s.emoji}</div>
              <div style={{
                fontFamily: HP_FONT, fontWeight: 800, fontSize: 13,
                color: selectedStatus === s.key ? '#fff' : HP_TOKENS.ink,
                textAlign: 'left',
              }}>
                {s.label}
              </div>
            </button>
          ))}
        </div>

        {/* Conditional: Reason input */}
        {selectedOption?.needsReason && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 6 }}>
              📝 KETERANGAN {selectedOption.label.toUpperCase()}
            </div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={selectedOption.placeholder}
              style={{
                width: '100%', padding: 14, borderRadius: 12,
                border: `1.5px solid ${reason.trim() ? HP_TOKENS.sage : HP_TOKENS.line}`,
                fontFamily: HP_FONT, fontSize: 13, minHeight: 80,
                boxSizing: 'border-box', outline: 'none', resize: 'none',
                lineHeight: 1.5,
                transition: 'border-color 0.2s',
              }}
            />
          </div>
        )}

        {/* Conditional: Attachment URL (for surat dokter) */}
        {selectedOption?.needsAttachment && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 6 }}>
              📎 UPLOAD SURAT KETERANGAN (OPSIONAL)
            </div>
            <div style={{
              padding: 10, borderRadius: 10, background: HP_TOKENS.blueWash,
              border: `1px solid ${HP_TOKENS.blue}20`, marginBottom: 8,
              ...HP_TEXT.small, fontSize: 11, color: HP_TOKENS.inkSoft,
            }}>
              💡 Masukkan link Google Drive / Dropbox ke surat dokter atau bukti lainnya
            </div>
            <input
              type="url"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              style={{
                width: '100%', padding: 14, borderRadius: 12,
                border: `1.5px solid ${HP_TOKENS.line}`,
                fontFamily: HP_FONT, fontSize: 13, boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>
        )}

        {/* Excused absence info */}
        {selectedOption && ['sick', 'izin', 'cuti'].includes(selectedOption.key) && (
          <div style={{
            padding: 12, borderRadius: 12,
            background: HP_TOKENS.sageWash, border: `1px solid ${HP_TOKENS.sage}20`,
            marginBottom: 16,
          }}>
            <div style={{ ...HP_TEXT.small, fontSize: 12, color: HP_TOKENS.sage, fontWeight: 700 }}>
              ℹ️ Status ini akan otomatis tercatat di absensi dan <strong>tidak memutus streak</strong> kehadiran kamu.
            </div>
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!selectedStatus || saving || (selectedOption?.needsReason && !reason.trim())}
          className="hp-tap"
          style={{
            width: '100%', padding: '16px', borderRadius: 14, border: 'none',
            background: selectedStatus ? (selectedOption?.color || HP_TOKENS.sage) : HP_TOKENS.lineSoft,
            color: selectedStatus ? '#fff' : HP_TOKENS.inkMute,
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, cursor: selectedStatus ? 'pointer' : 'default',
            opacity: (!selectedStatus || saving || (selectedOption?.needsReason && !reason.trim())) ? 0.5 : 1,
            transition: 'all 0.2s',
            boxShadow: selectedStatus ? `0 4px 16px ${selectedOption?.color || HP_TOKENS.sage}30` : 'none',
          }}
        >
          {saving ? 'Menyimpan...' : selectedStatus ? `Set: ${selectedOption?.emoji} ${selectedOption?.label}` : 'Pilih status di atas'}
        </button>
      </div>
    </Modal>
  );
}
