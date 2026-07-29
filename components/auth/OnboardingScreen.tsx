"use client";

/**
 * First-run onboarding.
 *
 * The flow used to be a survey with a mascot: a fake loading bar, four
 * identically-shaped question screens, a tap-counter whose own copy admitted it
 * did nothing, and a recap table. Four minutes in, the employee had produced
 * nothing and been shown nothing — so nothing in it was worth their attention.
 *
 * This version is built around one idea: **every answer visibly assembles the
 * card that will greet them tomorrow morning.** The name lands as it is typed,
 * the department snaps in when they join a real team, the bee takes on their
 * mood, the energy answer turns into an actual first-day plan. Onboarding stops
 * being a form to fill and becomes a thing being built.
 *
 * The screen is split the way One UI splits a screen: a **viewing area** at the
 * top holding that preview — content you look at, never touch — and an
 * **interaction area** below it where every control lives, ending in a CTA
 * pinned within thumb reach. Because the split is fixed, the continue button
 * never moves and the preview never scrolls away from the answer changing it.
 *
 * The department step is wired to the real HR department list, and shows those
 * teams as teams — headcount, who leads them, who is already there. Whatever is
 * picked here is the department the employee lands in, with no second form: see
 * `app/api/onboarding/complete/route.ts`, where a pick matching a real
 * department joins it immediately and anything else falls to the HR queue.
 */

import React, { useCallback, useMemo, useRef, useState } from "react";
import "./OnboardingScreen.css";
import {
  HP_TOKENS,
  HP_TEXT,
  Stack,
  Row,
  Divider,
  HPButton,
  HPGlyph,
  HPInput,
  HPCard,
  motion,
  AnimatePresence,
  SPRING,
  useReducedMotion,
} from "@/components/ui";
import { useHP } from "@/lib/HPContext";
import {
  DEFAULT_ONBOARDING_STEPS,
  normalizeOnboardingSteps,
  resolveStepOptions,
  inferStepKind,
  energyPlan,
  moodToMascot,
  type OnboardingStep,
  type OnboardingStepKind,
} from "@/lib/onboardingUtils";
import OnboardingAmbience from "./onboarding/OnboardingAmbience";
import ProgressRail from "./onboarding/ProgressRail";
import OptionGroup from "./onboarding/OptionGroup";
import DepartmentPicker from "./onboarding/DepartmentPicker";
import EnergyMeter from "./onboarding/EnergyMeter";
import WorkspacePreview, { type PreviewState } from "./onboarding/WorkspacePreview";
import Confetti from "./onboarding/Confetti";
import { useDepartments, matchDepartment } from "./onboarding/useDepartments";

/* ── Types ─────────────────────────────────────────────────────────── */

export interface OnboardingResult {
  /** Legacy alias for the department name — `app/page.tsx` posts it as `department`. */
  job: string;
  department: string | null;
  /** Set when the pick matched a real HR department row. */
  departmentId: string | number | null;
  mood: string | null;
  /** Index into `ENERGY_PLANS` (0–4), not a tap count. */
  energy: number;
  answers: { question: string; answer: string | null }[];
}

interface Props {
  userName?: string;
  onFinish?: (data: OnboardingResult) => void;
  /**
   * @deprecated There is no splash any more — the app's own loading screen was
   * already showing, so this one added two seconds of fake progress on top of
   * it. Accepted and ignored so existing callers keep compiling.
   */
  skipSplash?: boolean;
  /** HR's unsaved draft, previewed from ManageOnboardingModal. */
  previewConfig?: OnboardingStep[];
}

type Stage = "greet" | "step" | "energy" | "ready";

/** Middle of `ENERGY_PLANS`: a real default, so the meter is never blank. */
const DEFAULT_ENERGY = 2;

/* ── Helpers ───────────────────────────────────────────────────────── */

/**
 * HR writes step tags like "⚡ LANGKAH 1 / 4". The counter lives in the header
 * now and emoji aren't icons, so keep only whatever wording HR added on top and
 * fall back to a plain derived counter.
 */
function eyebrowFor(step: OnboardingStep, index: number, total: number): string {
  const custom = String(step.tag || "")
    .replace(/langkah\s*\d+\s*\/\s*\d+/i, "")
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .trim();
  return custom || `Langkah ${index + 1} dari ${total}`;
}

/* ── Screen ────────────────────────────────────────────────────────── */

export default function OnboardingScreen({ userName, onFinish, previewConfig }: Props) {
  const { state } = useHP();
  const reduce = useReducedMotion();
  const { departments } = useDepartments();

  const steps = useMemo(
    () =>
      normalizeOnboardingSteps(
        previewConfig && previewConfig.length > 0
          ? previewConfig
          : state?.onboardingConfig && state.onboardingConfig.length > 0
            ? (state.onboardingConfig as OnboardingStep[])
            : DEFAULT_ONBOARDING_STEPS,
      ),
    [previewConfig, state?.onboardingConfig],
  );

  const kinds = useMemo<OnboardingStepKind[]>(() => steps.map(inferStepKind), [steps]);

  const [stage, setStage] = useState<Stage>("greet");
  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState(() => (userName || "").trim());
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [energy, setEnergy] = useState(DEFAULT_ENERGY);
  const [submitting, setSubmitting] = useState(false);

  // Direction of the last move, so a stage entering from a "back" press slides
  // in from the side it left towards.
  const dir = useRef(1);

  /* ── Derived answers ───────────────────────────────────────────── */

  const indexOfKind = useCallback((k: OnboardingStepKind) => kinds.indexOf(k), [kinds]);

  const deptStepIndex = indexOfKind("department");
  const chosenDeptName = deptStepIndex === -1 ? null : (answers[deptStepIndex] ?? null);
  const matchedDept = useMemo(
    () => matchDepartment(departments, chosenDeptName),
    [departments, chosenDeptName],
  );

  const moodIndex = indexOfKind("mood");
  const moodAnswer = moodIndex === -1 ? null : (answers[moodIndex] ?? null);

  const focusIndex = indexOfKind("focus");
  const focusAnswer = focusIndex === -1 ? null : (answers[focusIndex] ?? null);

  const plan = energyPlan(energy);

  /* ── Rail ──────────────────────────────────────────────────────── */

  const railTotal = steps.length + 2; // greeting + questions + energy
  const railCurrent =
    stage === "greet"
      ? 0
      : stage === "step"
        ? 1 + stepIndex
        : stage === "energy"
          ? 1 + steps.length
          : railTotal;

  /* ── Navigation ────────────────────────────────────────────────── */

  const select = useCallback((index: number, label: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = label;
      return next;
    });
  }, []);

  const goNext = useCallback(() => {
    dir.current = 1;
    if (stage === "greet") {
      if (steps.length > 0) {
        setStepIndex(0);
        setStage("step");
      } else {
        setStage("energy");
      }
      return;
    }
    if (stage === "step") {
      if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1);
      else setStage("energy");
      return;
    }
    if (stage === "energy") setStage("ready");
  }, [stage, stepIndex, steps.length]);

  const goBack = useCallback(() => {
    dir.current = -1;
    if (stage === "step") {
      if (stepIndex > 0) setStepIndex((i) => i - 1);
      else setStage("greet");
      return;
    }
    if (stage === "energy") {
      if (steps.length > 0) {
        setStepIndex(steps.length - 1);
        setStage("step");
      } else {
        setStage("greet");
      }
      return;
    }
    if (stage === "ready") setStage("energy");
  }, [stage, stepIndex, steps.length]);

  const finish = useCallback(() => {
    if (submitting) return;
    setSubmitting(true);
    onFinish?.({
      job: chosenDeptName || "",
      department: chosenDeptName,
      departmentId: matchedDept?.id ?? null,
      mood: moodAnswer,
      energy,
      answers: [
        ...steps.map((s, i) => ({ question: s.q, answer: answers[i] ?? null })),
        // Persisted alongside the rest, so the first-day plan survives without
        // a schema change (`users.onboarding_answers` is free-form JSON).
        {
          question: "Tingkat energi hari pertama",
          answer: `${plan.label} — ${plan.priorities} prioritas, fokus ${plan.focusMinutes} menit`,
        },
      ],
    });
  }, [submitting, onFinish, chosenDeptName, matchedDept, moodAnswer, energy, steps, answers, plan]);

  /* ── Preview ───────────────────────────────────────────────────── */

  const preview: PreviewState = useMemo(() => {
    const mascot =
      stage === "ready"
        ? "excited"
        : stage === "energy"
          ? plan.mascot
          : moodAnswer
            ? moodToMascot(moodAnswer)
            : name.trim()
              ? "happy"
              : "neutral";

    const extras = answers
      .map((a, i) => ({ a, i }))
      .filter(
        ({ a, i }) =>
          !!a && i !== deptStepIndex && i !== moodIndex && i !== focusIndex,
      )
      .map(({ a }) => a as string);

    return {
      name,
      department: chosenDeptName,
      departmentMatched: !!matchedDept,
      mood: moodAnswer,
      mascot,
      focus: focusAnswer,
      // No plan exists until the employee has reached the energy step.
      energy:
        stage === "energy" || stage === "ready"
          ? { label: plan.label, priorities: plan.priorities, focusMinutes: plan.focusMinutes }
          : null,
      extras,
    };
  }, [
    stage, plan, moodAnswer, name, answers, deptStepIndex, moodIndex, focusIndex,
    chosenDeptName, matchedDept, focusAnswer,
  ]);

  /* ── Stage body ────────────────────────────────────────────────── */

  const currentStep = stage === "step" ? steps[stepIndex] : undefined;
  const currentKind = stage === "step" ? kinds[stepIndex] : undefined;
  const currentAnswer = stage === "step" ? (answers[stepIndex] ?? null) : null;

  const canContinue =
    stage === "greet" ? !!name.trim() : stage === "step" ? !!currentAnswer : true;

  const ctaLabel =
    stage === "greet"
      ? name.trim()
        ? "Lanjut"
        : "Isi nama dulu"
      : stage === "step"
        ? currentAnswer
          ? "Lanjut"
          : "Pilih salah satu"
        : stage === "energy"
          ? "Selesai"
          : submitting
            ? "Menyiapkan…"
            : "Masuk ke aplikasi";

  const canGoBack = stage === "step" || stage === "energy";
  const stageKey = stage === "step" ? `step-${stepIndex}` : stage;

  const slide = {
    enter: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * 26 }),
    center: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
    exit: (d: number) => ({
      opacity: 0,
      x: reduce ? 0 : d * -26,
      transition: { duration: 0.16 },
    }),
  };

  return (
    <div className="ob-root">
      <div className="ob-frame">
        <OnboardingAmbience />

        {stage === "ready" && <Confetti />}

        {/* ── Header ─────────────────────────────────────────────── */}
        <AnimatePresence initial={false}>
          {stage !== "ready" && (
            <motion.header
              className="ob-head"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24 }}
            >
              <Row justify="space-between" align="center" style={{ marginBottom: 14 }}>
                <Row gap={2} align="center" style={{ minWidth: 0 }}>
                  {canGoBack ? (
                    <HPButton
                      variant="ghost"
                      size="sm"
                      icon="chevronLeft"
                      iconOnly
                      aria-label="Kembali ke langkah sebelumnya"
                      onClick={goBack}
                    />
                  ) : (
                    <span
                      aria-hidden
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: HP_TOKENS.radiusSm,
                        background: HP_TOKENS.yellowSoft,
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <HPGlyph name="bee" size={18} color={HP_TOKENS.yellowInk} />
                    </span>
                  )}
                  <span style={{ ...HP_TEXT.sub }}>Flowbuddy</span>
                </Row>

                <span style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, whiteSpace: "nowrap" }}>
                  {railCurrent + 1} dari {railTotal}
                </span>
              </Row>

              <ProgressRail total={railTotal} current={railCurrent} />
            </motion.header>
          )}
        </AnimatePresence>

        {/* ── Viewing area ───────────────────────────────────────── */}
        <div className="ob-stage">
          <WorkspacePreview state={preview} />
        </div>

        {/* ── Interaction area ───────────────────────────────────── */}
        <div className="ob-body">
          <AnimatePresence mode="wait" initial={false} custom={dir.current}>
            <motion.div
              key={stageKey}
              custom={dir.current}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {stage === "greet" && (
                <GreetBody name={name} onName={setName} onSubmit={goNext} />
              )}

              {stage === "step" && currentStep && (
                <StepBody
                  step={currentStep}
                  kind={currentKind!}
                  index={stepIndex}
                  total={steps.length}
                  options={resolveStepOptions(currentStep, departments)}
                  departments={departments}
                  selected={currentAnswer}
                  onSelect={(label) => select(stepIndex, label)}
                />
              )}

              {stage === "energy" && <EnergyBody level={energy} onChange={setEnergy} />}

              {stage === "ready" && (
                <ReadyBody
                  name={name}
                  department={chosenDeptName}
                  departmentMatched={!!matchedDept}
                  mood={moodAnswer}
                  plan={plan}
                  onEdit={goBack}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Pinned action ──────────────────────────────────────── */}
        <div className="ob-foot">
          <HPButton
            variant="primary"
            size="lg"
            fullWidth
            iconEnd={stage === "energy" ? "check" : "arrow"}
            disabled={!canContinue}
            loading={stage === "ready" && submitting}
            onClick={stage === "ready" ? finish : goNext}
          >
            {ctaLabel}
          </HPButton>
        </div>
      </div>
    </div>
  );
}

/* ── Stage: greeting ───────────────────────────────────────────────── */

/**
 * One field, and it writes straight onto the preview card above as it is
 * typed. That is the entire welcome — a second mascot and a poke-counter used
 * to live here, which meant the first screen asked for a name while pointing
 * at something else.
 */
function GreetBody({
  name,
  onName,
  onSubmit,
}: {
  name: string;
  onName: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Stack gap={5}>
      <Stack gap={2}>
        <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.primaryInk }}>Kenalan dulu</span>
        <h1 style={{ ...HP_TEXT.title, margin: 0 }}>Kita mulai dari namamu</h1>
        <p style={{ ...HP_TEXT.body, margin: 0, color: HP_TOKENS.inkMute }}>
          Nama panggilan saja. Ini yang dipakai Buddy untuk menyapamu tiap pagi —
          dan bisa diubah kapan saja.
        </p>
      </Stack>

      <HPInput
        label="Nama panggilan"
        value={name}
        onChange={(e) => onName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) onSubmit();
        }}
        placeholder="Ketik nama kamu"
        autoComplete="given-name"
        maxLength={40}
      />

      <Row gap={2} align="center">
        <HPGlyph name="clock" size={13} color={HP_TOKENS.inkMute} />
        <span style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute }}>
          Sekitar satu menit, sekali saja.
        </span>
      </Row>
    </Stack>
  );
}

/* ── Stage: one question ───────────────────────────────────────────── */

function StepBody({
  step,
  kind,
  index,
  total,
  options,
  departments,
  selected,
  onSelect,
}: {
  step: OnboardingStep;
  kind: OnboardingStepKind;
  index: number;
  total: number;
  options: ReturnType<typeof resolveStepOptions>;
  departments: { name: string }[];
  selected: string | null;
  onSelect: (label: string) => void;
}) {
  const headingId = `ob-step-${index}`;
  // Only render the team cards when there is real HR data behind them —
  // otherwise they would be empty shells and the saved options serve better.
  const asTeams = kind === "department" && departments.length > 0;

  return (
    <Stack gap={5}>
      <Stack gap={2}>
        <Row gap={2} align="center" wrap>
          <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.primaryInk }}>
            {eyebrowFor(step, index, total)}
          </span>
          {kind === "department" && (
            <Row
              gap={1}
              align="center"
              style={{
                padding: "3px 9px",
                borderRadius: HP_TOKENS.radiusPill,
                background: asTeams ? HP_TOKENS.infoWash : HP_TOKENS.warningWash,
              }}
            >
              <HPGlyph
                name={asTeams ? "link" : "hourglass"}
                size={11}
                color={asTeams ? HP_TOKENS.info : HP_TOKENS.warning}
              />
              <span
                style={{
                  ...HP_TEXT.tiny,
                  color: asTeams ? HP_TOKENS.info : HP_TOKENS.warning,
                }}
              >
                {asTeams ? "Tim asli dari HR" : "Perlu konfirmasi HR"}
              </span>
            </Row>
          )}
        </Row>

        <h1 id={headingId} style={{ ...HP_TEXT.title, margin: 0 }}>
          {step.q}
        </h1>
        <p style={{ ...HP_TEXT.body, margin: 0, color: HP_TOKENS.inkMute }}>{step.hint}</p>

        {kind === "department" && (
          <p style={{ ...HP_TEXT.small, margin: 0, color: HP_TOKENS.inkMute }}>
            {asTeams
              ? "Kamu langsung masuk ke tim yang dipilih — anggota, target dan agenda divisinya ikut terbuka."
              : "Daftar divisi belum tersedia, jadi pilihanmu akan dikonfirmasi HR dulu."}
          </p>
        )}
      </Stack>

      {asTeams ? (
        <DepartmentPicker
          departments={departments}
          selected={selected}
          onSelect={onSelect}
          labelledBy={headingId}
        />
      ) : (
        <OptionGroup
          options={options}
          selected={selected}
          onSelect={onSelect}
          labelledBy={headingId}
        />
      )}
    </Stack>
  );
}

/* ── Stage: energy ─────────────────────────────────────────────────── */

function EnergyBody({ level, onChange }: { level: number; onChange: (n: number) => void }) {
  return (
    <Stack gap={5}>
      <Stack gap={2}>
        <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.primaryInk }}>Terakhir</span>
        <h1 style={{ ...HP_TEXT.title, margin: 0 }}>Seberapa penuh tenagamu?</h1>
        <p style={{ ...HP_TEXT.body, margin: 0, color: HP_TOKENS.inkMute }}>
          Geser untuk mengatur berat hari pertamamu. Ini menentukan berapa prioritas
          yang Buddy sarankan dan berapa lama sesi fokus pertamamu.
        </p>
      </Stack>

      <EnergyMeter level={level} onChange={onChange} />
    </Stack>
  );
}

/* ── Stage: ready ──────────────────────────────────────────────────── */

/**
 * The finale states what was actually set up, not what was answered. A recap of
 * four questions tells the employee nothing they don't remember typing thirty
 * seconds ago; "you are in Marketing with 12 people" is news.
 */
function ReadyBody({
  name,
  department,
  departmentMatched,
  mood,
  plan,
  onEdit,
}: {
  name: string;
  department: string | null;
  departmentMatched: boolean;
  mood: string | null;
  plan: ReturnType<typeof energyPlan>;
  onEdit: () => void;
}) {
  const reduce = useReducedMotion();
  const displayName = name.trim().split(" ")[0] || "Kamu";

  return (
    <Stack gap={5}>
      <Stack gap={2}>
        <motion.h1
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
          style={{ ...HP_TEXT.display, margin: 0 }}
        >
          Siap, {displayName}!
        </motion.h1>
        <p style={{ ...HP_TEXT.body, margin: 0, color: HP_TOKENS.inkMute }}>
          Tiga hal sudah disiapkan untukmu.
        </p>
      </Stack>

      <HPCard padding={0} style={{ overflow: "hidden" }}>
        <Stack gap={0}>
          <Outcome
            icon={departmentMatched ? "check" : "hourglass"}
            tone={department ? (departmentMatched ? "success" : "warning") : "mute"}
            title={department ? (departmentMatched ? `Bergabung ke ${department}` : `Divisi ${department}`) : "Divisi belum dipilih"}
            detail={
              department
                ? departmentMatched
                  ? "Anggota tim, target divisi dan agendanya sudah terbuka."
                  : "Divisi ini belum terdaftar — HR akan mengonfirmasi dulu."
                : "Kamu bisa memilih divisi nanti lewat profil."
            }
          />
          <Divider />
          <Outcome
            icon="zap"
            tone="primary"
            title={`Rencana ${plan.label.toLowerCase()}`}
            detail={`${plan.priorities} prioritas dan sesi fokus ${plan.focusMinutes} menit untuk hari pertama.`}
          />
          <Divider />
          <Outcome
            icon="bee"
            tone="primary"
            title="Buddy menyesuaikan nadanya"
            detail={
              mood
                ? `Kamu bilang lagi "${mood}", jadi Buddy mulai dari situ.`
                : "Buddy akan menyesuaikan setelah check-in pertamamu."
            }
          />
        </Stack>
      </HPCard>

      <Row justify="center">
        <HPButton variant="ghost" size="sm" icon="undo" onClick={onEdit}>
          Ubah jawaban
        </HPButton>
      </Row>
    </Stack>
  );
}

function Outcome({
  icon,
  tone,
  title,
  detail,
}: {
  icon: string;
  tone: "success" | "warning" | "primary" | "mute";
  title: string;
  detail: string;
}) {
  const colour =
    tone === "success"
      ? HP_TOKENS.success
      : tone === "warning"
        ? HP_TOKENS.warning
        : tone === "primary"
          ? HP_TOKENS.primary
          : HP_TOKENS.inkMute;

  return (
    <Row gap={3} align="flex-start" style={{ padding: "14px 16px" }}>
      <span
        aria-hidden
        style={{
          flex: "0 0 auto",
          width: 32,
          height: 32,
          borderRadius: HP_TOKENS.radiusSm,
          display: "grid",
          placeItems: "center",
          background: `color-mix(in srgb, ${colour} 14%, transparent)`,
        }}
      >
        <HPGlyph name={icon} size={16} color={colour} />
      </span>
      <Stack gap={1} style={{ minWidth: 0 }}>
        <span style={{ ...HP_TEXT.sub }}>{title}</span>
        <span style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute }}>{detail}</span>
      </Stack>
    </Row>
  );
}
