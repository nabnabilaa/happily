"use client";

/**
 * Bikin KPI sendiri.
 *
 * Sebelum ini karyawan hanya bisa menunggu: layar Target & KPI berkata "Belum
 * ada KPI dari manager" dan tidak ada jalan lain. Endpoint `/api/kpi/personal`
 * sudah ada sejak lama tapi tidak punya UI mana pun — satu-satunya tombol yang
 * mengarah ke sana (`openModal('new_goal')` di ManagerPersonalView) menunjuk ke
 * modal yang tidak pernah didaftarkan, jadi klik-nya tidak melakukan apa-apa.
 */

import React, { useState } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_TEXT } from "@/lib/constants";
import Modal from "@/components/ui/Modal";
import HPButton from "@/components/ui/HPButton";
import HPInput, { HPTextarea } from "@/components/ui/HPInput";

interface Props {
  onClose: () => void;
  /** Dipanggil setelah KPI tersimpan, supaya layar pemanggil bisa refetch. */
  onSaved?: () => void;
}

export default function PersonalKpiModal({ onClose, onSaved }: Props) {
  const { user, notify } = useHP();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState("100");
  const [metricUnit, setMetricUnit] = useState("%");
  const [saving, setSaving] = useState(false);

  const canSave = title.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave || !user?.id) return;
    setSaving(true);
    try {
      const now = new Date();
      const res = await fetch("/api/kpi/personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          title: title.trim(),
          targetDescription: description.trim(),
          targetValue: Number(targetValue) || 100,
          metricUnit: metricUnit.trim() || "%",
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Server membatasi 5 KPI mandiri per bulan; pesannya sudah berbahasa
        // manusia, jadi teruskan apa adanya alih-alih menimpanya.
        notify("Gagal Menyimpan", data?.error || "Coba lagi sebentar lagi.", "error");
        return;
      }

      notify("KPI Dibuat", `"${title.trim()}" masuk ke daftar KPI-mu bulan ini.`, "success");
      onSaved?.();
      // Kartu KPI di layar lain ikut memuat ulang target mingguannya.
      window.dispatchEvent(new CustomEvent("hp_db_update"));
      onClose();
    } catch (e) {
      console.error("Personal KPI create failed:", e);
      notify("Gagal Menyimpan", "Koneksi terputus. Coba lagi.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      title="Buat KPI Sendiri"
      description="KPI ini milikmu — kamu yang menentukan targetnya, dan kamu sendiri yang mencatat progresnya."
      footer={
        <div style={{ display: "flex", gap: 10 }}>
          <HPButton variant="secondary" onClick={onClose} style={{ flex: 1 }}>
            Batal
          </HPButton>
          <HPButton
            variant="primary"
            icon="check"
            onClick={handleSave}
            disabled={!canSave}
            loading={saving}
            style={{ flex: 2 }}
          >
            Simpan KPI
          </HPButton>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <HPInput
          label="Nama KPI"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="cth: Kuasai dasar data analysis"
          maxLength={120}
          autoFocus
        />

        <HPTextarea
          label="Apa yang ingin kamu capai? (opsional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Deskripsi singkat supaya kamu ingat kenapa KPI ini penting."
          rows={3}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 2, minWidth: 0 }}>
            <HPInput
              label="Nilai target"
              type="number"
              min="1"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <HPInput
              label="Satuan"
              value={metricUnit}
              onChange={(e) => setMetricUnit(e.target.value)}
              placeholder="%"
              maxLength={12}
            />
          </div>
        </div>

        <div
          style={{
            padding: "12px 14px",
            borderRadius: HP_TOKENS.radiusSm,
            background: HP_TOKENS.sunken,
            border: `1px solid ${HP_TOKENS.lineSoft}`,
            ...HP_TEXT.small,
          }}
        >
          Setelah tersimpan, pecah KPI ini jadi target mingguan di tab Target —
          lalu hubungkan task harianmu ke target itu.
        </div>
      </div>
    </Modal>
  );
}
