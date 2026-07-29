// Shared onboarding step config used by both the real onboarding flow
// (components/auth/OnboardingScreen.tsx) and the HR editor
// (components/modals/ManageOnboardingModal.tsx).

export interface OnboardingOption {
  e: string;
  l: string;
  /**
   * @deprecated Per-option background hex. The onboarding UI now colours
   * options from `HP_CATEGORICAL` by position, so the whole set reads as one
   * family and works in both themes — these light-only washes made the list
   * look like five different designs and went unreadable in dark mode. Kept
   * optional so configs HR saved earlier still parse.
   */
  bg?: string;
}

export interface OnboardingStep {
  tag: string;
  q: string;
  hint: string;
  opts: OnboardingOption[];
  // When set to 'departments', the options for this step are always
  // generated live from the HR departments list (/api/hr/departments)
  // instead of the manually-edited `opts` above.
  dynamicSource?: 'departments';
}

export interface DepartmentRow {
  id?: string | number;
  name: string;
  /** Filled by /api/onboarding/departments; absent on the raw HR list. */
  memberCount?: number;
  managerName?: string | null;
  sample?: string[];
}

export const DEFAULT_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    tag: '⚡ LANGKAH 1 / 4', q: 'Kamu di divisi apa?', hint: 'Bantu aku sesuaikan pengalaman yang pas buatmu',
    dynamicSource: 'departments',
    opts: [
      { e: '💻', l: 'Developer / IT' },
      { e: '🎨', l: 'Desainer / Kreatif' },
      { e: '📊', l: 'Marketing / Sales' },
      { e: '📋', l: 'Manajer / Tim Lead' },
      { e: '📚', l: 'Lainnya' },
    ],
  },
  {
    tag: '🎯 LANGKAH 2 / 4', q: 'Gimana mood kerjamu hari ini?', hint: 'Cerita jujur aja, Buddy siap adaptasi buat kamu',
    opts: [
      { e: '⚡', l: 'Super Semangat!' },
      { e: '😊', l: 'Oke-oke aja' },
      { e: '😴', l: 'Agak Lelah' },
      { e: '😤', l: 'Butuh Motivasi' },
    ],
  },
  {
    tag: '🔥 LANGKAH 3 / 4', q: 'Apa tantangan terbesar kamu?', hint: 'Pilih yang paling sering bikin kamu stuck',
    opts: [
      { e: '⏰', l: 'Susah Fokus' },
      { e: '📬', l: 'Terlalu Banyak Task' },
      { e: '😴', l: 'Gampang Procrastinate' },
      { e: '🤝', l: 'Koordinasi Tim' },
    ],
  },
  {
    tag: '🚀 LANGKAH 4 / 4', q: 'Mau mulai dari mana duluan?', hint: 'Buddy akan siapkan workspace yang sesuai pilihanmu',
    opts: [
      { e: '✅', l: 'Atur To-Do List' },
      { e: '🎯', l: 'Set Target Mingguan' },
      { e: '⏱️', l: 'Mulai Pomodoro' },
      { e: '📊', l: 'Lihat Dashboard' },
    ],
  },
];

const DEPT_EMOJI_CYCLE = ['💼', '🚀', '⚙️', '📣', '🎨', '📊', '🛠️', '🌱', '💰', '📦'];

// Turns the HR department list into onboarding option pills.
export function buildDepartmentOptions(departments: DepartmentRow[] | null | undefined): OnboardingOption[] {
  if (!departments || departments.length === 0) return [];
  return departments.map((d, i) => ({
    e: DEPT_EMOJI_CYCLE[i % DEPT_EMOJI_CYCLE.length],
    l: d.name,
  }));
}

// Guarantees exactly the step that captures "divisi" is tagged as the
// department-linked step, even for onboarding configs saved before this
// feature existed (falls back to the first step).
export function normalizeOnboardingSteps(steps: OnboardingStep[] | null | undefined): OnboardingStep[] {
  if (!steps || steps.length === 0) return DEFAULT_ONBOARDING_STEPS;
  const hasDeptStep = steps.some(s => s.dynamicSource === 'departments');
  if (hasDeptStep) return steps;
  return steps.map((s, i) => (i === 0 ? { ...s, dynamicSource: 'departments' as const } : s));
}

// Resolves the options that should actually be shown for a step: live HR
// departments for the department-linked step (falling back to its saved
// opts if the department list hasn't loaded yet / is empty), otherwise the
// step's own opts.
export function resolveStepOptions(step: OnboardingStep, departments: DepartmentRow[] | null | undefined): OnboardingOption[] {
  if (step.dynamicSource === 'departments') {
    const dynamic = buildDepartmentOptions(departments);
    return dynamic.length > 0 ? dynamic : step.opts;
  }
  return step.opts;
}

/* ── Reading meaning out of an HR-authored step ─────────────────────── */

/**
 * What a step is *about*, so onboarding can do something with the answer
 * beyond storing it.
 *
 * HR writes free text, so this is a best-effort read of the wording — and it
 * only ever affects presentation and the live preview. Anything unrecognised
 * falls through to `generic` and still renders and saves exactly the same way,
 * which is why a wrong guess here can't break a step.
 */
export type OnboardingStepKind = 'department' | 'mood' | 'challenge' | 'focus' | 'generic';

export function inferStepKind(step: OnboardingStep): OnboardingStepKind {
  if (step.dynamicSource === 'departments') return 'department';
  const text = `${step.q || ''} ${step.hint || ''}`.toLowerCase();
  if (/mood|perasaan|suasana hati|gimana kabar|rasanya/.test(text)) return 'mood';
  if (/tantangan|kendala|hambat|stuck|susah|kesulitan|masalah/.test(text)) return 'challenge';
  if (/mulai|duluan|pertama|prioritas|fokus/.test(text)) return 'focus';
  return 'generic';
}

/* ── Energy → the first working day ────────────────────────────────── */

/**
 * The energy answer is not a toy score. It picks how heavy the employee's
 * first day is, so the number has to map onto something the app actually does:
 * how many priorities get suggested and how long the first focus block runs.
 */
export interface EnergyPlan {
  level: number;
  label: string;
  blurb: string;
  priorities: number;
  focusMinutes: number;
  /** BeeMascot mood that matches the level. */
  mascot: string;
}

export const ENERGY_PLANS: EnergyPlan[] = [
  { level: 0, label: 'Pelan-pelan', blurb: 'Satu hal beres hari ini sudah cukup.', priorities: 1, focusMinutes: 15, mascot: 'sleepy' },
  { level: 1, label: 'Santai',      blurb: 'Dua prioritas, tanpa buru-buru.',      priorities: 2, focusMinutes: 25, mascot: 'neutral' },
  { level: 2, label: 'Seimbang',    blurb: 'Tiga prioritas dengan jeda cukup.',    priorities: 3, focusMinutes: 25, mascot: 'happy' },
  { level: 3, label: 'Produktif',   blurb: 'Empat prioritas plus sesi fokus panjang.', priorities: 4, focusMinutes: 50, mascot: 'focus' },
  { level: 4, label: 'Gas penuh',   blurb: 'Lima prioritas dan fokus 50 menit.',   priorities: 5, focusMinutes: 50, mascot: 'excited' },
];

export function energyPlan(level: number): EnergyPlan {
  const i = Math.min(ENERGY_PLANS.length - 1, Math.max(0, Math.round(level)));
  return ENERGY_PLANS[i];
}

/** Maps a mood answer HR wrote onto a mascot expression. */
export function moodToMascot(answer: string | null | undefined): string {
  if (!answer) return 'neutral';
  const a = answer.toLowerCase();
  if (/semangat|gas|energi|excited|hype/.test(a)) return 'excited';
  if (/lelah|capek|ngantuk|lemas|tired/.test(a)) return 'sleepy';
  if (/motivasi|butuh|kesal|bete|stres|down/.test(a)) return 'sad';
  if (/fokus|serius|konsentrasi/.test(a)) return 'focus';
  if (/oke|baik|senang|happy|santai/.test(a)) return 'happy';
  return 'neutral';
}
