"use client";

import React from "react";
import Modal from "@/components/ui/Modal";
import HPButton from "@/components/ui/HPButton";

/**
 * Konfirmasi "yakin?" di atas `Modal`, pengganti `window.confirm`.
 *
 * `window.confirm` bukan cuma jelek — ia memblokir seluruh event loop, sehingga
 * ekstensi, animasi, dan pengukuran apa pun berhenti selama dialognya terbuka;
 * teksnya tidak bisa diberi penekanan; dan tombolnya berbunyi "OK/Cancel"
 * dalam bahasa OS, bukan bahasa aplikasi. Dialog ini memakai sheet, tombol, dan
 * jebakan fokus yang sama dengan modal lain.
 *
 * `onConfirm` boleh mengembalikan Promise: tombolnya masuk keadaan `loading`
 * sampai selesai, lalu menutup sendiri. Itu penting untuk aksi yang memanggil
 * server — tanpa itu, orang menekan "Tamat" dua kali karena tidak ada tanda
 * apa pun bahwa yang pertama sedang jalan.
 */
interface ConfirmDialogProps {
  title: string;
  /** Kalimat yang menjelaskan akibatnya. Sebutkan yang tidak bisa dibatalkan. */
  description?: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` untuk yang menghapus atau tidak bisa dibatalkan. */
  tone?: "primary" | "danger";
  confirmIcon?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  description,
  children,
  confirmLabel = "Lanjutkan",
  cancelLabel = "Batal",
  tone = "primary",
  confirmIcon,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [busy, setBusy] = React.useState(false);

  // Menghindari setState pada komponen yang sudah dilepas: aksi yang sukses
  // biasanya menutup dialognya sendiri lewat perubahan state di induk.
  const alive = React.useRef(true);
  React.useEffect(() => () => { alive.current = false; }, []);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  return (
    <Modal onClose={busy ? () => {} : onCancel} title={title} description={description}
      footer={
        <>
          <HPButton variant="ghost" onClick={onCancel} disabled={busy} style={{ flex: 1 }}>
            {cancelLabel}
          </HPButton>
          <HPButton
            variant={tone === "danger" ? "danger" : "primary"}
            icon={confirmIcon}
            loading={busy}
            onClick={run}
            style={{ flex: 1 }}
          >
            {confirmLabel}
          </HPButton>
        </>
      }
    >
      {children}
    </Modal>
  );
}
