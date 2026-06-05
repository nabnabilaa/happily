import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { HP_TOKENS, HP_FONT, HP_TEXT } from '@/lib/constants';
import { useHP } from '@/lib/HPContext';
import HPGlyph from '@/components/ui/HPGlyph';

interface AnnouncementModalProps {
  onClose: () => void;
}

export default function AnnouncementModal({ onClose }: AnnouncementModalProps) {
  const { user } = useHP();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!title || !message) {
      alert("Judul dan pesan tidak boleh kosong");
      return;
    }
    
    setLoading(true);
    try {
      // Endpoint to broadcast announcement to team
      await fetch('/api/manager/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user?.id,
          title: title,
          message: message,
          type: 'announcement'
        })
      });
      alert("Pengumuman berhasil dikirim!");
      onClose();
    } catch (e) {
      console.error(e);
      alert("Gagal mengirim pengumuman");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} title="📢 Buat Pengumuman">
      <div style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ ...HP_TEXT.h, fontSize: 13, display: 'block', marginBottom: 8 }}>Judul Pengumuman</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Contoh: Townhall Meeting Besok"
            style={{
              width: '100%', padding: '12px', borderRadius: 12,
              border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontSize: 14,
              boxSizing: 'border-box'
            }}
          />
        </div>
        
        <div>
          <label style={{ ...HP_TEXT.h, fontSize: 13, display: 'block', marginBottom: 8 }}>Pesan / Isi</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Tulis detail pengumuman..."
            rows={4}
            style={{
              width: '100%', padding: '12px', borderRadius: 12,
              border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontSize: 14,
              boxSizing: 'border-box', resize: 'vertical'
            }}
          />
        </div>

        <button
          onClick={handleSend}
          disabled={loading}
          style={{
            padding: '16px', borderRadius: 16, background: HP_TOKENS.sage,
            color: '#F4F7F9', border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 14,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: loading ? 0.7 : 1, marginTop: 10
          }}
          className="hp-tap"
        >
          {loading ? "Mengirim..." : (
            <>
              <HPGlyph name="sparkle" size={16} color="#F4F7F9" />
              Kirim Pengumuman
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
