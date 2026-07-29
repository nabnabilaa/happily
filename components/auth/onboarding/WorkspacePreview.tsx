"use client";

import React from "react";
import {
  HP_TOKENS,
  HP_TEXT,
  Row,
  Stack,
  Divider,
  HPCard,
  HPGlyph,
  motion,
  AnimatePresence,
  SPRING,
  SPRING_SOFT,
  useReducedMotion,
} from "@/components/ui";
import BeeMascot from "@/components/ui/BeeMascot";

/**
 * The thing the employee is building.
 *
 * This is the whole idea of the flow. Onboarding used to collect four answers,
 * show a recap table and drop the user into the app — nothing was produced, so
 * every step felt like paperwork. Here the answers assemble the card that will
 * greet them tomorrow morning, live, one slot at a time: the name lands as they
 * type it, the department snaps in when they join a team, the bee takes on their
 * mood, the energy answer becomes an actual plan.
 *
 * It sits in the **viewing area** — the top third that One UI reserves for
 * things you look at rather than touch — so nothing in here is interactive and
 * the controls stay in thumb reach below.
 *
 * Empty slots render as dashed outlines rather than disappearing. Seeing what
 * is still missing is what makes someone finish.
 */

export interface PreviewState {
  name: string;
  department: string | null;
  departmentMatched: boolean;
  mood: string | null;
  /** BeeMascot mood key, already resolved by the caller. */
  mascot: string;
  focus: string | null;
  energy: { label: string; priorities: number; focusMinutes: number } | null;
  /** Answers to HR's extra steps that don't own a slot of their own. */
  extras: string[];
}

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function greetingFor(hour: number): string {
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 19) return "Selamat sore";
  return "Selamat malam";
}

/**
 * Read the clock after mount. Rendering a date during SSR and a different one
 * on the client is a hydration mismatch, and this card is the first thing on
 * screen.
 */
function useNow() {
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => setNow(new Date()), []);
  return now;
}

export default function WorkspacePreview({ state }: { state: PreviewState }) {
  const reduce = useReducedMotion();
  const now = useNow();

  const dateLabel = now
    ? `${DAYS[now.getDay()]} · ${now.getDate()} ${MONTHS[now.getMonth()]}`
    : "Besok pagi";
  const greeting = now ? greetingFor(now.getHours()) : "Selamat pagi";

  const firstName = state.name.trim().split(" ")[0];

  return (
    <HPCard
      variant="raised"
      padding={0}
      style={{ width: "100%", overflow: "hidden", borderRadius: HP_TOKENS.radiusLg }}
    >
      {/* A single soft wash instead of a coloured header bar: depth from
          surface value, per the design system. */}
      <div
        style={{
          padding: "16px 18px 14px",
          background: `linear-gradient(180deg, ${HP_TOKENS.primaryWash}, transparent)`,
        }}
      >
        <Row justify="space-between" align="flex-start" gap={3}>
          <Stack gap={1} style={{ minWidth: 0, flex: 1 }}>
            <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>{dateLabel}</span>

            <span style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft }}>{greeting},</span>

            {/* The name is the first slot to fill, and it fills as you type. */}
            <div style={{ minHeight: 34, display: "flex", alignItems: "center" }}>
              <AnimatePresence mode="wait" initial={false}>
                {firstName ? (
                  <motion.span
                    key="named"
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={SPRING}
                    style={{
                      ...HP_TEXT.title,
                      color: HP_TOKENS.ink,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "100%",
                    }}
                  >
                    {firstName}
                  </motion.span>
                ) : (
                  <motion.span
                    key="unnamed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      display: "inline-block",
                      width: 116,
                      height: 14,
                      borderRadius: HP_TOKENS.radiusPill,
                      background: HP_TOKENS.sunken,
                      border: `1px dashed ${HP_TOKENS.line}`,
                    }}
                  />
                )}
              </AnimatePresence>
            </div>
          </Stack>

          <motion.div
            key={state.mascot}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={SPRING_SOFT}
            style={{ flex: "0 0 auto" }}
          >
            <BeeMascot mood={state.mascot} size={62} animated />
          </motion.div>
        </Row>
      </div>

      <Divider />

      <Stack gap={2} style={{ padding: "12px 18px 16px" }}>
        <Row gap={2} wrap align="stretch">
          <Slot
            icon="people"
            label="Divisi"
            value={state.department}
            tone={state.department ? (state.departmentMatched ? "joined" : "pending") : "empty"}
          />
          <Slot icon="zap" label="Energi" value={state.energy?.label ?? null} />
          <Slot icon="target" label="Mulai dari" value={state.focus} />
        </Row>

        {/* The plan line only appears once the energy answer exists, because
            before that there is no plan to describe. */}
        <AnimatePresence initial={false}>
          {state.energy && (
            <motion.div
              key="plan"
              initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: "hidden" }}
            >
              <Row gap={2} align="center" style={{ paddingTop: 2 }}>
                <HPGlyph name="check" size={13} color={HP_TOKENS.successInk} />
                <span style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft }}>
                  {state.energy.priorities} prioritas · fokus {state.energy.focusMinutes} menit
                </span>
              </Row>
            </motion.div>
          )}
        </AnimatePresence>

        {state.extras.length > 0 && (
          <Row gap={1} wrap>
            {state.extras.map((e) => (
              <motion.span
                key={e}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.86 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={SPRING}
                style={{
                  ...HP_TEXT.tiny,
                  color: HP_TOKENS.inkSoft,
                  padding: "4px 9px",
                  borderRadius: HP_TOKENS.radiusPill,
                  background: HP_TOKENS.sunken,
                  textTransform: "none",
                }}
              >
                {e}
              </motion.span>
            ))}
          </Row>
        )}
      </Stack>
    </HPCard>
  );
}

/* ── One slot on the card ──────────────────────────────────────────── */

/**
 * Filled slots carry the answer; empty ones stay as a labelled dashed outline
 * so the card visibly has gaps left to fill. `tone` only distinguishes a
 * department the employee joined outright from one waiting on HR — and it
 * always pairs the colour with an icon, never colour alone.
 */
function Slot({
  icon,
  label,
  value,
  tone = "empty",
}: {
  icon: string;
  label: string;
  value: string | null;
  tone?: "empty" | "joined" | "pending";
}) {
  const reduce = useReducedMotion();
  const filled = !!value;

  const accent =
    tone === "pending" ? HP_TOKENS.warning : tone === "joined" ? HP_TOKENS.success : HP_TOKENS.primary;

  return (
    <div style={{ flex: "1 1 96px", minWidth: 96 }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={value || "empty"}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={SPRING}
          style={{
            height: "100%",
            padding: "8px 10px",
            borderRadius: HP_TOKENS.radiusSm,
            background: filled ? HP_TOKENS.sunken : "transparent",
            border: filled ? `1px solid ${HP_TOKENS.lineSoft}` : `1px dashed ${HP_TOKENS.line}`,
          }}
        >
          <Row gap={1} align="center" style={{ marginBottom: 3 }}>
            <HPGlyph name={icon} size={11} color={filled ? accent : HP_TOKENS.inkFade} />
            <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>{label}</span>
          </Row>
          <span
            style={{
              ...HP_TEXT.small,
              color: filled ? HP_TOKENS.ink : HP_TOKENS.inkFade,
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {value || "—"}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
