"use client";

import React, { useState, useEffect } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import Modal from "@/components/ui/Modal";

interface Props {
  task: any;
  onClose: () => void;
  onConfirm: (data: {
    proofLinks: string[];
    isProject: boolean;
    metricValue?: number;
    notes?: string;
  }) => void;
}

export default function TaskCompleteModal({ task, onClose, onConfirm }: Props) {
  const { state, user } = useHP();
  const [proofLinks, setProofLinks] = useState<string[]>(['']);
  const [isProject, setIsProject] = useState(task?.is_project || false);
  const [metricValue, setMetricValue] = useState('');
  const [notes, setNotes] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [myKpis, setMyKpis] = useState<any[]>([]);

  // Load KPI info for metric hint
  useEffect(() => {
    if (task?.kpi_id) {
      fetch(`/api/kpi?userId=${user?.id}&role=employee&month=${new Date().getMonth()+1}&year=${new Date().getFullYear()}`)
        .then(r => r.json())
        .then(d => setMyKpis(d.kpis || []))
        .catch(() => {});
    }
  }, [task?.kpi_id, user?.id]);

  const kpiInfo = myKpis.find(k => String(k.id) === String(task?.kpi_id));

  // Check for duplicate links across all existing tasks
  const checkDuplicate = (link: string) => {
    if (!link || link.length < 10) { setDuplicateWarning(null); return; }
    const allExistingLinks: string[] = [];
    (state?.priorities || []).forEach((p: any) => {
      if (p.proof_links) allExistingLinks.push(...p.proof_links);
      if (p.proof_link) allExistingLinks.push(p.proof_link);
    });
    if (allExistingLinks.includes(link)) {
      setDuplicateWarning(`⚠️ Link ini sudah pernah dikirim sebelumnya. Tandai sebagai project jangka panjang?`);
    } else {
      setDuplicateWarning(null);
    }
  };

  const updateLink = (index: number, value: string) => {
    const newLinks = [...proofLinks];
    newLinks[index] = value;
    setProofLinks(newLinks);
    checkDuplicate(value);
  };

  const addLinkSlot = () => {
    setProofLinks([...proofLinks, '']);
  };

  const removeLinkSlot = (index: number) => {
    if (proofLinks.length <= 1) return;
    setProofLinks(proofLinks.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    const cleanLinks = proofLinks.filter(l => l.trim().length > 0);
    onConfirm({
      proofLinks: cleanLinks,
      isProject,
      metricValue: metricValue ? parseFloat(metricValue) : undefined,
      notes: notes || undefined,
    });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: 12, borderRadius: 10,
    border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontSize: 13,
    outline: 'none', background: '#fff', color: HP_TOKENS.ink, boxSizing: 'border-box',
  };

  return (
    <Modal onClose={onClose} title="✅ Selesaikan Task">
      <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* Task being completed */}
        <div style={{ 
          padding: 14, borderRadius: 14, 
          background: HP_TOKENS.sageWash, border: `1.5px solid ${HP_TOKENS.sage}30`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ 
            width: 28, height: 28, borderRadius: 14, background: HP_TOKENS.sage,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <HPGlyph name="check" size={16} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ ...HP_TEXT.h, fontSize: 14 }}>{task?.title}</div>
            {task?.kpi_title && (
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.blue, marginTop: 2, fontSize: 10 }}>
                🎯 {task.kpi_title}
              </div>
            )}
          </div>
        </div>

        {/* Proof Links — MULTIPLE */}
        <div>
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 6 }}>
            📎 LINK HASIL KERJA (OPSIONAL)
          </div>
          <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft, fontSize: 11, marginBottom: 8 }}>
            Lampirkan link drive, dokumen, atau hasil kerja. Bisa lebih dari satu.
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {proofLinks.map((link, i) => (
              <div key={i} style={{ display: 'flex', gap: 6 }}>
                <input 
                  type="url" 
                  value={link}
                  onChange={(e) => updateLink(i, e.target.value)}
                  placeholder={`Link hasil kerja ${proofLinks.length > 1 ? `#${i+1}` : ''}...`}
                  style={{ ...inputStyle, flex: 1 }}
                />
                {proofLinks.length > 1 && (
                  <button 
                    onClick={() => removeLinkSlot(i)}
                    style={{ 
                      background: HP_TOKENS.coralSoft, border: 'none', borderRadius: 10,
                      width: 36, height: 36, cursor: 'pointer', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <HPGlyph name="close" size={12} color={HP_TOKENS.coral} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button 
            onClick={addLinkSlot}
            style={{
              marginTop: 6, background: 'none', border: `1.5px dashed ${HP_TOKENS.line}`,
              borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
              fontFamily: HP_FONT, fontSize: 12, fontWeight: 700, color: HP_TOKENS.blue,
              display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center',
            }}
          >
            + Tambah Link Lagi
          </button>

          {/* Duplicate warning */}
          {duplicateWarning && (
            <div style={{
              marginTop: 8, padding: 10, borderRadius: 10,
              background: HP_TOKENS.yellowSoft, border: `1.5px solid ${HP_TOKENS.yellow}`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ ...HP_TEXT.small, fontSize: 12, color: HP_TOKENS.ink, flex: 1 }}>
                {duplicateWarning}
              </div>
              <button 
                onClick={() => setIsProject(true)}
                style={{
                  background: HP_TOKENS.yellow, border: 'none', borderRadius: 8,
                  padding: '6px 12px', cursor: 'pointer', flexShrink: 0,
                  fontFamily: HP_FONT, fontSize: 11, fontWeight: 800, color: HP_TOKENS.ink,
                }}
              >
                Ya, Tandai
              </button>
            </div>
          )}
        </div>

        {/* Metric Value — only for KPIs that need it */}
        {task?.kpi_id && kpiInfo && kpiInfo.kpiType !== 'completion' && (
          <div>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 6 }}>
              💰 INPUT NILAI {(kpiInfo.metricUnit || 'METRIK').toUpperCase()}
            </div>
            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft, fontSize: 11, marginBottom: 8 }}>
              Contoh: nilai penjualan, jumlah konten, dll. Akan terakumulasi ke KPI bulanan.
            </div>
            <input 
              type="number" 
              value={metricValue}
              onChange={(e) => setMetricValue(e.target.value)}
              placeholder={`Masukkan angka (${kpiInfo.metricUnit || 'Rp'})`}
              style={inputStyle}
            />
          </div>
        )}

        {/* Project Toggle */}
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: 12, 
          padding: 12, borderRadius: 12, background: isProject ? HP_TOKENS.lavenderSoft : HP_TOKENS.paper,
          border: `1.5px solid ${isProject ? '#6B5F8E30' : HP_TOKENS.line}`,
          transition: '0.2s',
        }}>
          <button
            onClick={() => setIsProject(!isProject)}
            style={{
              width: 42, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: isProject ? '#6B5F8E' : HP_TOKENS.lineSoft,
              position: 'relative', transition: '0.2s', flexShrink: 0,
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: 9, background: '#fff',
              position: 'absolute', top: 3,
              left: isProject ? 21 : 3, transition: '0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }} />
          </button>
          <div>
            <div style={{ ...HP_TEXT.small, fontSize: 13, fontWeight: 700, color: HP_TOKENS.ink }}>
              📁 Task Jangka Panjang / Project
            </div>
            <div style={{ ...HP_TEXT.small, fontSize: 11, color: HP_TOKENS.inkMute, marginTop: 2 }}>
              Centang jika task ini berlanjut ke hari berikutnya
            </div>
          </div>
        </div>

        {/* Optional notes */}
        <div>
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 6 }}>
            📝 CATATAN (OPSIONAL)
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan singkat tentang progress..."
            style={{ ...inputStyle, minHeight: 50, resize: 'none' }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            onClick={onClose}
            style={{
              flex: 1, padding: 14, borderRadius: 12, border: `1.5px solid ${HP_TOKENS.line}`,
              background: '#fff', fontFamily: HP_FONT, fontWeight: 700, fontSize: 14,
              cursor: 'pointer', color: HP_TOKENS.inkMute,
            }}
          >
            Batal
          </button>
          <button 
            onClick={handleConfirm}
            style={{
              flex: 2, padding: 14, borderRadius: 12, border: 'none',
              background: HP_TOKENS.sage, color: '#fff',
              fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <HPGlyph name="check" size={16} color="#fff" />
            Selesai ✓
          </button>
        </div>
      </div>
    </Modal>
  );
}
