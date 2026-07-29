"use client";

import React, { useState, useEffect } from "react";
import HPCard from "@/components/ui/HPCard";
import HPGlyph from "@/components/ui/HPGlyph";
import { HP_TOKENS, HP_TEXT } from "@/lib/constants";
import { useHP } from "@/lib/HPContext";
import { isNetworkError } from "@/lib/errorUtils";

interface AttendanceWidgetProps {
  openModal: (name: string, props?: any) => void;
}

const timeStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 650,
  letterSpacing: "-0.01em",
  fontVariantNumeric: "tabular-nums",
};

export default function AttendanceWidget({ openModal }: AttendanceWidgetProps) {
  const { user, state } = useHP();
  const [todayData, setTodayData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
    const handleUpdate = () => fetchStatus();
    window.addEventListener("hp_db_update", handleUpdate);
    return () => window.removeEventListener("hp_db_update", handleUpdate);
  }, []);

  const fetchStatus = async () => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/attendance/summary?userId=${user?.id}`);
      const data = await res.json();
      if (data.today) setTodayData(data.today);
    } catch (e: any) {
      if (isNetworkError(e)) {
        console.warn("Failed to fetch attendance status (network issue):", e.message || e);
      } else {
        console.error(e);
      }
    }
    setLoading(false);
  };

  // Reserve the row's height while loading so the page doesn't jump when it fills in.
  if (loading) {
    return <div id="attendance-clock-in-btn" className="hp-skeleton" style={{ height: 68 }} aria-hidden />;
  }

  const status = todayData?.status || "not_checked_in";
  const checkInTime = todayData?.checkInAt
    ? new Date(todayData.checkInAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    : null;
  const checkOutTime = todayData?.checkOutAt
    ? new Date(todayData.checkOutAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    : null;

  /* ── Not yet clocked in ─────────────────────────────────────────── */
  if (status === "not_checked_in") {
    const isBeforeClockInTime = state?.workSchedule?.start
      ? new Date().getHours() * 60 + new Date().getMinutes() <
        parseInt(state.workSchedule.start.split(":")[0]) * 60 +
          parseInt(state.workSchedule.start.split(":")[1]) -
          60
      : false;

    if (isBeforeClockInTime) {
      return (
        <HPCard variant="outline" padding={15} style={{ borderStyle: "dashed" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <HPGlyph name="lock" size={15} color={HP_TOKENS.inkFade} />
            <span style={{ ...HP_TEXT.small }}>Absen aktif mulai 1 jam sebelum jadwal</span>
          </div>
        </HPCard>
      );
    }

    // Pending state, not an error state — a warning-toned card rather than a
    // solid red button, which read as "something is broken".
    return (
      <HPCard
        onClick={() => openModal("attendance_scanner")}
        padding={15}
        style={{ background: HP_TOKENS.warningWash, borderColor: HP_TOKENS.warningSoft }}
        ariaLabel="Belum clock-in. Buka pemindai absensi"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <div
            aria-hidden
            style={{
              width: 40,
              height: 40,
              borderRadius: HP_TOKENS.radiusSm,
              background: HP_TOKENS.warningSoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <HPGlyph name="history" size={19} color={HP_TOKENS.warningInk} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...HP_TEXT.sub, fontSize: 14.5 }}>Belum clock-in</div>
            <div style={{ ...HP_TEXT.small, marginTop: 1 }}>Ketuk untuk mulai absen</div>
          </div>
          <HPGlyph name="chevronRight" size={17} color={HP_TOKENS.warningInk} />
        </div>
      </HPCard>
    );
  }

  /* ── Clocked in, still working ──────────────────────────────────── */
  if (status === "checked_in") {
    const done = Boolean(checkOutTime);

    return (
      <HPCard padding={0} style={{ overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "stretch" }}>
          <div style={{ flex: 1, minWidth: 0, padding: "13px 15px", display: "flex", alignItems: "center", gap: 12 }}>
            <div
              aria-hidden
              style={{
                width: 38,
                height: 38,
                borderRadius: HP_TOKENS.radiusSm,
                background: HP_TOKENS.successSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <HPGlyph name="check" size={17} color={HP_TOKENS.successInk} />
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ ...HP_TEXT.tiny }}>Clock in</div>
              <div style={{ ...timeStyle, color: HP_TOKENS.ink, marginTop: 1 }}>{checkInTime}</div>
            </div>

            {todayData?.type && (
              <span
                style={{
                  marginLeft: "auto",
                  padding: "3px 8px",
                  borderRadius: HP_TOKENS.radiusPill,
                  background: HP_TOKENS.sunken,
                  color: HP_TOKENS.inkMute,
                  fontSize: 11,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {todayData.type}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => !done && openModal("reflect")}
            disabled={done}
            className={done ? "" : "hp-tap"}
            style={{
              flexShrink: 0,
              minWidth: 92,
              padding: "12px 18px",
              borderLeft: `1px solid ${HP_TOKENS.line}`,
              background: done ? "transparent" : HP_TOKENS.primary,
              color: done ? HP_TOKENS.inkFade : HP_TOKENS.onPrimary,
              fontSize: 12.5,
              fontWeight: 600,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <HPGlyph name={done ? "check" : "moon"} size={16} color="currentColor" />
            {done ? "Selesai" : "Clock out"}
          </button>
        </div>
      </HPCard>
    );
  }

  /* ── Day complete ───────────────────────────────────────────────── */
  return (
    <HPCard padding={14}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          aria-hidden
          style={{
            width: 36,
            height: 36,
            borderRadius: HP_TOKENS.radiusSm,
            background: HP_TOKENS.successSoft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <HPGlyph name="check" size={16} color={HP_TOKENS.successInk} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...HP_TEXT.tiny }}>Kehadiran hari ini</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
            <span style={{ ...timeStyle, fontSize: 13.5, color: HP_TOKENS.ink }}>{checkInTime}</span>
            <HPGlyph name="arrow" size={12} color={HP_TOKENS.inkFade} />
            <span style={{ ...timeStyle, fontSize: 13.5, color: HP_TOKENS.ink }}>{checkOutTime}</span>
            {todayData?.duration && (
              <>
                <span style={{ color: HP_TOKENS.inkFade }}>·</span>
                <span style={{ ...HP_TEXT.small, fontWeight: 600 }}>
                  {Math.floor(todayData.duration / 60)}j {todayData.duration % 60}m
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </HPCard>
  );
}
