"use client";

/**
 * Empat hal yang benar-benar diadministrasi HR.
 *
 * Dulu daftar ini ditulis langsung di `HRHomeScreen`, jadi hanya bisa dilihat
 * akun ber-role `hr`. Employee/manager yang dititipi `hrAccess` membuka konsol
 * HR lewat tab tersendiri dan tidak pernah sampai ke layar itu — semua aksi ini
 * hilang untuk mereka. Sekarang keduanya menyusun komponen yang sama, sehingga
 * menambah satu aksi cukup diubah di satu tempat.
 */

import React from "react";
import { ActionList } from "@/components/ui";

interface Props {
  openModal: (name: string, props?: any) => void;
  title?: string;
}

export default function HRManageList({ openModal, title = "Kelola" }: Props) {
  return (
    <ActionList
      title={title}
      items={[
        {
          icon: "target",
          label: "KPI karyawan",
          hint: "Susun dan tinjau target per orang",
          onClick: () => openModal("manage_kpi"),
        },
        {
          icon: "note",
          label: "Survey internal",
          hint: "Buat, edit, dan lihat hasilnya",
          onClick: () => openModal("manage_surveys"),
        },
        {
          icon: "sparkle",
          label: "Alur onboarding",
          hint: "Langkah untuk karyawan baru",
          onClick: () => openModal("manage_onboarding"),
        },
        {
          icon: "bell",
          label: "Buat pengumuman",
          hint: "Kirim ke seluruh perusahaan",
          onClick: () => openModal("announcement"),
        },
      ]}
    />
  );
}
