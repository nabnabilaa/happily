"use client";

import React from "react";
import Modal from "@/components/ui/Modal";
import LogbookPanel from "@/components/logbook/LogbookPanel";

interface LogbookModalProps {
  onClose: () => void;
  targetUserId?: string;
  targetUserName?: string;
}

/**
 * Pembungkus modal untuk logbook employee. Seluruh isinya ada di
 * `LogbookPanel` supaya HR/manager bisa menampilkan logbook yang sama persis
 * di dalam detail per orang tanpa menumpuk modal di atas modal.
 */
export default function LogbookModal({ onClose, targetUserId, targetUserName }: LogbookModalProps) {
  return (
    <Modal onClose={onClose} title={targetUserName ? `📅 Riwayat & Logbook — ${targetUserName}` : "📅 Riwayat & Logbook"}>
      <LogbookPanel targetUserId={targetUserId} />
    </Modal>
  );
}
