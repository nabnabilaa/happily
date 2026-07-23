// Shared onboarding step config used by both the real onboarding flow
// (components/auth/OnboardingScreen.tsx) and the HR editor
// (components/modals/ManageOnboardingModal.tsx).

export interface OnboardingOption {
  e: string;
  bg: string;
  l: string;
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
}

export const DEFAULT_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    tag: '⚡ LANGKAH 1 / 4', q: 'Kamu di divisi apa?', hint: 'Bantu aku sesuaikan pengalaman yang pas buatmu',
    dynamicSource: 'departments',
    opts: [
      { e: '💻', bg: '#EAF4FD', l: 'Developer / IT' },
      { e: '🎨', bg: '#FAF0FF', l: 'Desainer / Kreatif' },
      { e: '📊', bg: '#EAFAF3', l: 'Marketing / Sales' },
      { e: '📋', bg: '#FFF5EA', l: 'Manajer / Tim Lead' },
      { e: '📚', bg: '#F5F3FF', l: 'Lainnya' },
    ],
  },
  {
    tag: '🎯 LANGKAH 2 / 4', q: 'Gimana mood kerjamu hari ini?', hint: 'Cerita jujur aja, Buddy siap adaptasi buat kamu',
    opts: [
      { e: '⚡', bg: '#FFFAEC', l: 'Super Semangat!' },
      { e: '😊', bg: '#EAFAF3', l: 'Oke-oke aja' },
      { e: '😴', bg: '#EEF0FF', l: 'Agak Lelah' },
      { e: '😤', bg: '#FAEAEA', l: 'Butuh Motivasi' },
    ],
  },
  {
    tag: '🔥 LANGKAH 3 / 4', q: 'Apa tantangan terbesar kamu?', hint: 'Pilih yang paling sering bikin kamu stuck',
    opts: [
      { e: '⏰', bg: '#FFF5EA', l: 'Susah Fokus' },
      { e: '📬', bg: '#EAF4FD', l: 'Terlalu Banyak Task' },
      { e: '😴', bg: '#EEF0FF', l: 'Gampang Procrastinate' },
      { e: '🤝', bg: '#EAFAF3', l: 'Koordinasi Tim' },
    ],
  },
  {
    tag: '🚀 LANGKAH 4 / 4', q: 'Mau mulai dari mana duluan?', hint: 'Buddy akan siapkan workspace yang sesuai pilihanmu',
    opts: [
      { e: '✅', bg: '#EAFAF3', l: 'Atur To-Do List' },
      { e: '🎯', bg: '#FFF5EA', l: 'Set Target Mingguan' },
      { e: '⏱️', bg: '#EEF0FF', l: 'Mulai Pomodoro' },
      { e: '📊', bg: '#EAF4FD', l: 'Lihat Dashboard' },
    ],
  },
];

const DEPT_EMOJI_CYCLE = ['💼', '🚀', '⚙️', '📣', '🎨', '📊', '🛠️', '🌱', '💰', '📦'];
const DEPT_BG_CYCLE = ['#EAF4FD', '#FAF0FF', '#EAFAF3', '#FFF5EA', '#F5F3FF', '#FFEAF0', '#EAF9FF', '#F0FFEA'];

// Turns the HR department list into onboarding option pills.
export function buildDepartmentOptions(departments: DepartmentRow[] | null | undefined): OnboardingOption[] {
  if (!departments || departments.length === 0) return [];
  return departments.map((d, i) => ({
    e: DEPT_EMOJI_CYCLE[i % DEPT_EMOJI_CYCLE.length],
    bg: DEPT_BG_CYCLE[i % DEPT_BG_CYCLE.length],
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
