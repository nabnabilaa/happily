// ─── SHARED ─────────────────────────────────────────────────────────────────

export const HP_MOODS = [
  { key: 'joy', label: 'Bahagia', glyph: 'sparkle', emoji: '😊', tone: 'yellow', value: 5 },
  { key: 'calm', label: 'Tenang', glyph: 'check', emoji: '😌', tone: 'sage', value: 4 },
  { key: 'neutral', label: 'Biasa', glyph: 'activity', emoji: '😐', tone: 'neutral', value: 3 },
  { key: 'tired', label: 'Lelah', glyph: 'moon', emoji: '😫', tone: 'blue', value: 2 },
  { key: 'stress', label: 'Stress', glyph: 'zap', emoji: '🤯', tone: 'coral', value: 1 },
];

export const HP_ENERGY = [
  { key: 'low', label: 'Rendah', hint: 'Cocok untuk admin, review, tugas ringan' },
  { key: 'mid', label: 'Sedang', hint: 'Kolaborasi, meeting, eksekusi rutin' },
  { key: 'high', label: 'Tinggi', hint: 'Deep work, keputusan penting, kreativitas' },
];

export const HP_QUICK_TAGS = ['Semangat', 'Fokus', 'Lelah', 'Cemas', 'Bersyukur', 'Overwhelmed'];

export const HP_VALUES = ['Collaboration', 'Innovation', 'Respect', 'Ownership', 'Growth'];

export const HP_REWARDS = [
  { id: 1, title: "Extra cuti 1 hari", points: 500, tone: "sage", glyph: "tree", category: "Wellbeing", desc: "Nikmati satu hari penuh istirahat untuk mengisi ulang energimu." },
  { id: 2, title: "Voucher lunch 100k", points: 250, tone: "yellow", glyph: "heart", category: "Lifestyle", desc: "Makan siang enak bareng teman kerja — ditanggung kantor!" },
  { id: 3, title: "Workshop UX intensif", points: 800, tone: "blue", glyph: "book", category: "Growth", desc: "Ikuti workshop 2 hari bersama praktisi UX terkemuka." },
  { id: 4, title: "Donasi program sosial", points: 100, tone: "coral", glyph: "leaf", category: "Impact", desc: "Ubah poinmu menjadi donasi nyata untuk komunitas sekitar." },
  { id: 5, title: "Tiket bioskop 2x", points: 300, tone: "lavender", glyph: "star", category: "Lifestyle", desc: "Nonton film favorit bersama teman atau keluarga." },
  { id: 6, title: "Pulsa / e-wallet 50k", points: 150, tone: "sage", glyph: "zap", category: "Lifestyle", desc: "Top up pulsa atau saldo e-wallet langsung ke akunmu." },
  { id: 7, title: "Voucher belanja 200k", points: 400, tone: "yellow", glyph: "target", category: "Lifestyle", desc: "Belanja kebutuhanmu dengan voucher dari partner kami." },
  { id: 8, title: "Kelas online premium", points: 600, tone: "blue", glyph: "refresh", category: "Growth", desc: "Akses kursus online dari platform terkemuka selama 3 bulan." },
  { id: 9, title: "Sesi wellness 1:1", points: 350, tone: "coral", glyph: "people", category: "Wellbeing", desc: "Konsultasi pribadi dengan wellness coach berpengalaman." },
];

export const ORG_REWARDS_CATALOG = [
  { id: 1, title: 'Extra Cuti 1 Hari', points: 500, stock: 12, tone: 'sage', desc: 'Gunakan poinmu untuk hari libur tambahan tanpa syarat.', category: 'Wellness' },
  { id: 2, title: 'Workshop UX Intensif', points: 800, stock: 5, tone: 'blue', desc: 'Akses ke workshop desain eksklusif selama 1 hari penuh.', category: 'Growth' },
  { id: 3, title: 'Voucher Makan Siang 100k', points: 250, stock: 50, tone: 'yellow', desc: 'Voucher GrabFood atau GoFood senilai Rp 100.000.', category: 'Lifestyle' },
  { id: 4, title: 'Donasi Program Sosial', points: 100, stock: 999, tone: 'coral', desc: 'Donasikan poinmu untuk penanaman pohon di Kalimantan.', category: 'Social' },
  { id: 5, title: 'Mentoring 1:1 dengan Head', points: 1200, stock: 2, tone: 'lavender', desc: 'Sesi coaching karir 60 menit dengan pimpinan divisi.', category: 'Growth' },
];

export const HP_PEOPLE = [
  { name: 'Budi Santoso', role: 'Product Manager' },
  { name: 'Anya Putri', role: 'Engineering Lead' },
  { name: 'Rizky Hidayat', role: 'Designer' },
  { name: 'Dian Kusuma', role: 'Researcher' },
  { name: 'Maya Sari', role: 'Marketing' },
];

export const HP_AI_INSIGHTS = [
  { tone: 'sage', title: 'Kamu paling produktif Selasa pagi', body: 'Berdasarkan 4 minggu terakhir, deep work di Selasa 09:00–11:00 punya completion rate 40% lebih tinggi.' },
  { tone: 'blue', title: 'Energi sedikit drop 2 hari ini', body: 'Mau coba 5-menit reset atau jalan sebentar? Tidak wajib, hanya kalau butuh.' },
  { tone: 'yellow', title: 'Streak check-in 12 hari 🎉', body: 'Kamu rutin menyapa diri sendiri — ini kebiasaan kecil yang dampaknya besar.' },
];

export const HP_LOGBOOK = [
  { id: 1, date: '2026-04-20', mood: 'calm', blockers: 'Meeting kepanjangan di sore hari.', notes: 'Handoff redesign selesai tepat waktu.', taskCount: 4 },
  { id: 2, date: '2026-04-19', mood: 'joy', blockers: 'Tidak ada.', notes: 'Ide baru untuk design tokens sangat menjanjikan.', taskCount: 6 },
];

export const HP_COACH_MESSAGES = [
  { from: 'ai', text: 'Hai Sari 🌱 — selamat pagi. Aku lihat kamu udah check-in, moodnya "Tenang", energi sedang. Mau aku bantu susun prioritas hari ini?' },
];

export const HP_COACH_SUGGESTIONS = [
  'Bantu susun prioritas',
  'Aku lagi overwhelmed',
  'Kasih ide untuk 1-on-1 besok',
  'Refleksikan minggu ini',
];

// ─── EMPLOYEE (Sari Wijaya) ─────────────────────────────────────────────────

export const HP_USER = {
  name: 'Sari Wijaya',
  role: 'Product Designer',
  team: 'Digital Experience',
  streak: 12,
  points: 1340,
  level: 11,
  rank: 'D',
  wellbeing: 78,
  avatar: '#4A7C59',
};

export const HP_PRIORITIES = [
  { id: 1, title: 'Review wireframe onboarding v3', goal: 'Launch Apps Redesign', energy: 'high', est: '45m', done: false, tone: 'sage', type: 'Daily Task' },
  { id: 2, title: 'Kirim handoff ke tim engineering', goal: 'Launch Apps Redesign', energy: 'mid', est: '20m', done: false, tone: 'sage', type: 'Manager Task' },
  { id: 3, title: 'Sinkronisasi ikon design system', goal: 'DS Migration Q2', energy: 'low', est: '30m', done: true, tone: 'blue', type: 'Division Goal' },
];

export const HP_GOALS = [
  { id: 1, title: 'Launch Apps Redesign', progress: 68, alignment: 92, owner: 'Sari', due: '30 Apr 2026 18:00', dueISO: '2026-04-30T18:00', tone: 'sage', metric: '8 / 12 milestones', scope: 'personal' },
  { id: 2, title: 'DS Migration Q2', progress: 42, alignment: 85, owner: 'Team', due: '15 Jun 2026 18:00', dueISO: '2026-06-15T18:00', tone: 'blue', metric: '210 / 500 components', scope: 'team' },
  { id: 3, title: 'Mentoring 2 junior designer', progress: 55, alignment: 78, owner: 'Sari', due: 'Ongoing', tone: 'lavender', metric: '11 / 20 sessions', scope: 'personal' },
];

export const HP_FEED = [
  { id: 1, from: 'Budi Santoso', to: 'Sari Wijaya', value: 'Collaboration', msg: 'Makasih banyak Sari — handoff kemarin super jelas, tim eng langsung bisa jalan tanpa blocker. 🌱', likes: 12, time: '2 jam lalu' },
  { id: 2, from: 'Anya Putri', to: 'Rizky Hidayat', value: 'Innovation', msg: 'Ide prototype Rizky buat checkout flow bener-bener ngubah persepsi user. Kreatif banget!', likes: 8, time: '5 jam lalu' },
  { id: 3, from: 'Dian Kusuma', to: 'Tim Research', value: 'Respect', msg: 'Makasih tim research udah dengerin concern designer sebelum finalize insight report.', likes: 21, time: 'Kemarin' },
];

export const HP_SKILLS = [
  { name: 'User Research', current: 70, target: 85 },
  { name: 'Interaction Design', current: 82, target: 90 },
  { name: 'Design Systems', current: 65, target: 80 },
  { name: 'Leadership', current: 45, target: 70 },
  { name: 'Storytelling', current: 55, target: 75 },
];

export const HP_HABITS = [
  { name: 'Tidur 7+ jam', streak: 8, target: 7, done: true, glyph: 'moon', history: [true, true, false, true, true, true, true] },
  { name: 'Jalan kaki 15 menit', streak: 3, target: 7, done: false, glyph: 'activity', history: [false, true, true, false, false, true, false] },
  { name: 'Meditasi pagi', streak: 12, target: 7, done: true, glyph: 'sparkle', history: [true, true, true, true, true, true, true] },

];

export const HP_WELLBEING_DIMS = [
  { key: 'mental', label: 'Mental', score: 76, tone: 'sage', trend: '+4' },
  { key: 'physical', label: 'Fisik', score: 64, tone: 'blue', trend: '+1' },
  { key: 'financial', label: 'Finansial', score: 82, tone: 'yellow', trend: '+0' },
  { key: 'social', label: 'Sosial', score: 88, tone: 'lavender', trend: '+6' },
];

// ─── MANAGER DATA (Budi Santoso) ────────────────────────────────────────────

export const MANAGER_USER = {
  name: 'Budi Santoso',
  role: 'Product Manager',
  team: 'Digital Experience',
  streak: 8,
  points: 2150,
  level: 15,
  rank: 'D',
};

export const MANAGER_TEAM_MEMBERS = [
  { id: 1, name: 'Sari Wijaya', role: 'Product Designer', mood: 'calm', glyph: 'check', energy: 'high', wellbeing: 78, tasks: { done: 2, total: 3 }, streak: 12, status: 'On track', statusTone: 'sage' },
  { id: 2, name: 'Rizky Hidayat', role: 'Senior Designer', mood: 'joy', glyph: 'sparkle', energy: 'high', wellbeing: 85, tasks: { done: 3, total: 3 }, streak: 7, status: 'Excellent', statusTone: 'yellow' },
  { id: 3, name: 'Dian Kusuma', role: 'UX Researcher', mood: 'tired', glyph: 'moon', energy: 'low', wellbeing: 58, tasks: { done: 1, total: 4 }, streak: 2, status: 'Needs check-in', statusTone: 'coral' },
  { id: 4, name: 'Anya Putri', role: 'Design Lead', mood: 'calm', glyph: 'check', energy: 'mid', wellbeing: 72, tasks: { done: 2, total: 4 }, streak: 5, status: 'On track', statusTone: 'sage' },
  { id: 5, name: 'Feri Gunawan', role: 'Visual Designer', mood: 'neutral', glyph: 'activity', energy: 'mid', wellbeing: 65, tasks: { done: 1, total: 3 }, streak: 0, status: 'At risk', statusTone: 'coral' },
];

export const MANAGER_APPROVAL_TASKS = [
  { id: 1, from: 'Sari Wijaya', type: 'Time Off', desc: 'Cuti tanggal 25–26 Apr (2 hari)', urgent: false },
  { id: 2, from: 'Rizky Hidayat', type: 'Goal Update', desc: 'Revisi target DS Migration dari 500 → 380 komponen', urgent: true },
  { id: 3, from: 'Dian Kusuma', type: 'Coaching Request', desc: 'Minta sesi 1-on-1 tambahan minggu ini', urgent: false },
];

export const MANAGER_TEAM_GOALS = [
  { id: 1, title: 'Launch Apps Redesign', progress: 68, members: 3, due: '30 Apr 2026 18:00', dueISO: '2026-04-30T18:00', tone: 'sage', onTrack: true },
  { id: 2, title: 'DS Migration Q2', progress: 42, members: 5, due: '15 Jun 2026 18:00', dueISO: '2026-06-15T18:00', tone: 'blue', onTrack: false },
  { id: 3, title: 'User Research Q2', progress: 55, members: 2, due: '30 May 2026 18:00', dueISO: '2026-05-30T18:00', tone: 'lavender', onTrack: true },
];

export const MANAGER_ONE_ON_ONES = [
  { id: 1, with: 'Sari Wijaya', date: 'Rabu, 25 Apr', time: '14:00', topic: 'Career growth & Q2 goals', done: false, meetLink: 'https://meet.google.com/abc-defg-hij' },
  { id: 2, with: 'Dian Kusuma', date: 'Kamis, 26 Apr', time: '10:00', topic: 'Check-in wellbeing & workload', done: false, urgent: true, meetLink: 'https://meet.google.com/xyz-pdqr-mno' },
  { id: 3, with: 'Rizky Hidayat', date: 'Jumat, 27 Apr', time: '15:00', topic: 'DS Migration update & blockers', done: false, meetLink: 'https://meet.google.com/uvw-stuv-wxyz' },
];

export const MANAGER_TEAM_FEED = [
  { id: 1, from: 'Budi Santoso', to: 'Sari Wijaya', value: 'Ownership', msg: 'Sari selesaikan handoff lebih awal dari deadline — tim engineering sangat terbantu. Luar biasa! 🌟', likes: 15, time: '1 jam lalu' },
  { id: 2, from: 'Anya Putri', to: 'Rizky Hidayat', value: 'Innovation', msg: 'Rizky datang dengan solusi component library yang bikin workflow 30% lebih cepat!', likes: 22, time: '3 jam lalu' },
  { id: 3, from: 'Budi Santoso', to: 'Dian Kusuma', value: 'Growth', msg: 'Dian terus berkembang dalam metodologi research — insight-nya makin tajam setiap sprint.', likes: 9, time: 'Kemarin' },
];

export const MANAGER_SKILLS = [
  { name: 'Strategic Thinking', current: 78, target: 90 },
  { name: 'People Management', current: 65, target: 85 },
  { name: 'Product Vision', current: 82, target: 90 },
  { name: 'Stakeholder Mgmt', current: 70, target: 80 },
  { name: 'Data-driven Decision', current: 55, target: 75 },
];

export const MANAGER_TEAM_WELLBEING = [
  { key: 'mental', label: 'Mental Tim', score: 71, tone: 'sage', trend: '+2' },
  { key: 'workload', label: 'Beban Kerja', score: 64, tone: 'coral', trend: '-3' },
  { key: 'engagement', label: 'Engagement', score: 80, tone: 'blue', trend: '+5' },
  { key: 'collaboration', label: 'Kolaborasi', score: 88, tone: 'lavender', trend: '+4' },
];

// Programs that Manager can assign to team — includes org-wide + custom team programs
// `assignedToTeam` = whether the manager has activated it for the team
// `source` = 'hr' (org-wide) | 'manager' (custom by manager)
export const MANAGER_PROGRAMS_CATALOG = [
  { id: 1, title: '21 Hari Meditasi', desc: 'Mulai hari dengan meditasi terpandu 10 menit setiap pagi.', glyph: 'sparkle', tone: 'lavender', category: 'Mental', duration: '21 hari', enrolledTeam: 3, totalTeam: 5, assignedToTeam: true, source: 'hr' },
  { id: 2, title: 'Step Challenge Bulanan', desc: 'Target 8.000 langkah per hari selama satu bulan.', glyph: 'activity', tone: 'sage', category: 'Fisik', duration: '30 hari', enrolledTeam: 4, totalTeam: 5, assignedToTeam: true, source: 'hr' },

  { id: 4, title: 'Tim Challenge: No Meeting Friday', desc: 'Satu hari dalam seminggu tanpa meeting — deep work time.', glyph: 'target', tone: 'blue', category: 'Produktivitas', duration: 'Weekly', enrolledTeam: 5, totalTeam: 5, assignedToTeam: true, source: 'manager' },
  { id: 5, title: 'Tim Challenge: Lunch Together', desc: 'Makan siang bareng minimal 2x seminggu untuk bonding tim.', glyph: 'heart', tone: 'coral', category: 'Sosial', duration: 'Weekly', enrolledTeam: 3, totalTeam: 5, assignedToTeam: true, source: 'manager' },
  { id: 6, title: 'Financial Wellness Talk', desc: 'Webinar perencanaan keuangan pribadi bersama advisor.', glyph: 'zap', tone: 'yellow', category: 'Finansial', duration: '1 sesi', enrolledTeam: 0, totalTeam: 5, assignedToTeam: false, source: 'hr' },
];

// ─── HR DATA (Maya Sari) ─────────────────────────────────────────────────────

export const HR_USER = {
  name: 'Maya Sari',
  role: 'HR Business Partner',
  team: 'People & Culture',
  streak: 15,
  points: 3200,
  level: 19,
  rank: 'D',
};

export const HR_ALL_EMPLOYEES = [
  { id: 1, name: 'Sari Wijaya', role: 'Product Designer', dept: 'Digital Experience', wellbeing: 78, engagement: 85, performance: 82, risk: 'low', riskLabel: 'Low Risk', riskTone: 'sage', mood: 'calm', glyph: 'check', streak: 12 },
  { id: 2, name: 'Rizky Hidayat', role: 'Senior Designer', dept: 'Digital Experience', wellbeing: 85, engagement: 90, performance: 88, risk: 'low', riskLabel: 'Low Risk', riskTone: 'sage', mood: 'joy', glyph: 'sparkle', streak: 7 },
  { id: 3, name: 'Dian Kusuma', role: 'UX Researcher', dept: 'Digital Experience', wellbeing: 58, engagement: 60, performance: 70, risk: 'high', riskLabel: 'Needs Attention', riskTone: 'coral', mood: 'tired', glyph: 'moon', streak: 2 },
  { id: 4, name: 'Anya Putri', role: 'Design Lead', dept: 'Digital Experience', wellbeing: 72, engagement: 78, performance: 80, risk: 'medium', riskLabel: 'Watch', riskTone: 'yellow', mood: 'calm', glyph: 'check', streak: 5 },
  { id: 5, name: 'Feri Gunawan', role: 'Visual Designer', dept: 'Digital Experience', wellbeing: 65, engagement: 55, performance: 68, risk: 'high', riskLabel: 'Needs Attention', riskTone: 'coral', mood: 'neutral', glyph: 'activity', streak: 0 },
  { id: 6, name: 'Budi Santoso', role: 'Product Manager', dept: 'Digital Experience', wellbeing: 80, engagement: 88, performance: 85, risk: 'low', riskLabel: 'Low Risk', riskTone: 'sage', mood: 'calm', glyph: 'check', streak: 8 },
  { id: 7, name: 'Laras Putri', role: 'Marketing Specialist', dept: 'Marketing', wellbeing: 74, engagement: 72, performance: 76, risk: 'low', riskLabel: 'Low Risk', riskTone: 'sage', mood: 'joy', glyph: 'sparkle', streak: 4 },
  { id: 8, name: 'Hendra Wijaya', role: 'Backend Engineer', dept: 'Engineering', wellbeing: 62, engagement: 65, performance: 72, risk: 'medium', riskLabel: 'Watch', riskTone: 'yellow', mood: 'neutral', glyph: 'activity', streak: 1 },
];

export const HR_ORG_METRICS = {
  totalEmployees: 128,
  engagementScore: 74,
  engagementTrend: '+3',
  wellbeingAvg: 71,
  wellbeingTrend: '+2',
  atRisk: 8,
  atRiskTrend: '-2',
  turnoverRate: 4.2,
  turnoverTrend: '-0.8',
};

export const HR_ORG_GOALS = [
  { id: 1, title: 'Tingkatkan Engagement Score ke 80', progress: 74, target: 80, dept: 'All', due: 'Q3 2026', tone: 'blue', metric: '74 / 80 score' },
  { id: 2, title: 'Turunkan At-Risk karyawan < 5%', progress: 60, target: 100, dept: 'All', due: 'Jun 2026', tone: 'coral', metric: '8 karyawan perlu intervensi' },
  { id: 3, title: 'L&D Completion Rate 85%', progress: 62, target: 85, dept: 'All', due: 'Des 2026', tone: 'sage', metric: '79/128 karyawan selesai' },
  { id: 4, title: 'Wellbeing Score rata-rata 80', progress: 71, target: 80, dept: 'All', due: 'Q4 2026', tone: 'lavender', metric: '71/80 avg score' },
];

export const HR_DEPT_PULSE = [
  { dept: 'Digital Experience', wellbeing: 71, engagement: 79, headcount: 42, atRisk: 2, tone: 'sage' },
  { dept: 'Engineering', wellbeing: 65, engagement: 68, headcount: 35, atRisk: 4, tone: 'blue' },
  { dept: 'Marketing', wellbeing: 78, engagement: 80, headcount: 18, atRisk: 0, tone: 'yellow' },
  { dept: 'Operations', wellbeing: 70, engagement: 72, headcount: 22, atRisk: 2, tone: 'lavender' },
  { dept: 'Finance', wellbeing: 74, engagement: 75, headcount: 11, atRisk: 0, tone: 'coral' },
];

export const HR_LD_PROGRAMS = [
  { id: 1, title: 'Leadership Essentials', enrolled: 34, completed: 18, total: 40, due: '30 Mei', tone: 'blue', category: 'Leadership' },
  { id: 2, title: 'Wellbeing @ Work', enrolled: 89, completed: 62, total: 128, due: 'Ongoing', tone: 'sage', category: 'Wellbeing' },
  { id: 3, title: 'Data for Everyone', enrolled: 22, completed: 8, total: 30, due: '15 Jun', tone: 'yellow', category: 'Analytics' },
  { id: 4, title: 'Inclusive Communication', enrolled: 45, completed: 30, total: 60, due: '31 Mei', tone: 'lavender', category: 'Culture' },
];

export const HR_FEED = [
  { id: 1, from: 'Budi Santoso', to: 'Sari Wijaya', value: 'Collaboration', msg: 'Sari luar biasa dalam kolaborasi lintas divisi minggu ini!', likes: 18, time: '1 jam lalu', dept: 'Digital Experience' },
  { id: 2, from: 'Maya Sari', to: 'Tim Engineering', value: 'Respect', msg: 'Engineering team tetap solid di tengah sprint yang padat. Salut!', likes: 31, time: '3 jam lalu', dept: 'Engineering' },
  { id: 3, from: 'Laras Putri', to: 'Hendra Wijaya', value: 'Ownership', msg: 'Hendra sigap handle incident production tengah malam. Dedication tinggi!', likes: 24, time: 'Kemarin', dept: 'Engineering' },
];

export const HR_WELLBEING_DIMS = [
  { key: 'mental', label: 'Mental Org', score: 71, tone: 'sage', trend: '+2' },
  { key: 'workload', label: 'Beban Kerja', score: 63, tone: 'coral', trend: '-4' },
  { key: 'engagement', label: 'Engagement', score: 74, tone: 'blue', trend: '+3' },
  { key: 'culture', label: 'Budaya', score: 80, tone: 'lavender', trend: '+5' },
];

export const HR_SKILLS = [
  { name: 'People Analytics', current: 72, target: 90 },
  { name: 'Talent Management', current: 80, target: 90 },
  { name: 'L&D Design', current: 65, target: 80 },
  { name: 'Change Management', current: 58, target: 75 },
  { name: 'Employee Relations', current: 85, target: 90 },
];
