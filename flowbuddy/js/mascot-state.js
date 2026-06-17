const FB_STATES = {
  IDLE: { color: '#3B82F6', badge: 'Halo! 👋', svgState: 'idle', w1: '#D6E4FF', w2: '#3B82F6', wp: '#93C5FD', mouth: 'M 90 125 Q 100 130 110 125' },
  HAPPY: { color: '#4A7C59', badge: 'Yeay! 🎉', svgState: 'senang', w1: '#E1EFE6', w2: '#4A7C59', wp: '#8FB39B', mouth: 'M 80 125 Q 100 155 120 125' },
  SAD: { color: '#7A92A8', badge: 'Sedih nih… 😢', svgState: 'sedih', w1: '#E5E9F0', w2: '#7A92A8', wp: '#B8C6D6', mouth: 'M 85 135 Q 100 115 115 135' },
  SLEEPY: { color: '#A89BC9', badge: 'Zzzz… 😴', svgState: 'ngantuk', w1: '#EAE6F4', w2: '#A89BC9', wp: '#D3CCEB', mouth: 'M 95 130 Q 100 132 105 130' },
  FOCUS: { color: '#FFBE0B', badge: 'Fokus bareng! 🔥', svgState: 'fokus', w1: '#FFF8CC', w2: '#FFBE0B', wp: '#FFDCA8', mouth: 'M 92 128 L 108 128' },
  EATING: { color: '#FF6B35', badge: 'Makan dulu! 🍱', svgState: 'makan', w1: '#FFE6D6', w2: '#FF6B35', wp: '#FFB899', mouth: 'M 85 125 Q 100 155 115 125' },
  STRETCHING: { color: '#20C997', badge: 'Stretching~ 🤸', svgState: 'olahraga', w1: '#E6FCF5', w2: '#20C997', wp: '#96F2D7', mouth: 'M 85 125 Q 100 115 115 125' },
  EXCITED: { color: '#F59F00', badge: 'Luar biasa!!! ✨', svgState: 'semangat', w1: '#FFF3BF', w2: '#F59F00', wp: '#FFD43B', mouth: 'M 75 120 Q 100 180 125 120' },
  ANNOYED: { color: '#FF4444', badge: 'Jangan digangguin! 😤', svgState: 'kesal', w1: '#FFE5E5', w2: '#FF4444', wp: '#FFAAAA', mouth: 'M 85 135 Q 100 115 115 135' },
  WAITING: { color: '#0CA678', badge: 'Menunggu… ⏳', svgState: 'menunggu', w1: '#E6FCF5', w2: '#0CA678', wp: '#63E6BE', mouth: 'M 95 125 A 5 5 0 1 1 105 125 A 5 5 0 1 1 95 125' },
};

window.fbCtx = {
  tasks: [], notes: [], alarms: [], alarmHistory: [], timerRunning: false,
  lastActivity: Date.now(), clickCount: 0, clickWindowStart: 0,
  rubScore: 0, rubLastTime: 0,
  deletedTaskIds: [], deletedNoteIds: [],
  focusTaskId: null, focusProgress: 0, focusIntention: "",
  habits: [],
  reflectionDoneDate: "",
};

window.fbCurrentState = 'IDLE';
let forcedState = null, forcedUntil = 0, annoyedEndTime = 0;

function fbToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fbDoneRate() {
  const t = window.fbCtx.tasks.filter(t => t.date === fbToday());
  return t.length ? t.filter(t => t.done).length / t.length : 0;
}

function evalState() {
  const now = Date.now(), hr = new Date().getHours(), mn = new Date().getMinutes();
  if (window.fbCtx.clickCount >= 6 && now - window.fbCtx.clickWindowStart < 3000) return 'ANNOYED';
  const td = window.fbCtx.tasks.filter(t => t.date === fbToday());
  if (td.length >= 2 && td.every(t => t.done)) return 'EXCITED';
  if (window.fbCtx.rubScore > 14 || fbDoneRate() >= 0.7) return 'HAPPY';
  if (window.fbCtx.timerRunning) return 'FOCUS';
  if ((hr === 12 || hr === 19) && mn < 15) return 'EATING';
  if (mn >= 55) return 'STRETCHING';
  if (window.fbCtx.alarms.some(a => a.timestamp > now && a.timestamp - now < 300000)) return 'WAITING';
  if (td.length > 0 && fbDoneRate() < 0.3) return 'SAD';
  if (now - window.fbCtx.lastActivity > 300000 || hr >= 23 || hr < 6) return 'SLEEPY';
  return 'IDLE';
}

window.getFbState = function() {
  if (forcedState && Date.now() < forcedUntil) return forcedState;
  if (forcedState === 'ANNOYED') {
    annoyedEndTime = Date.now();
    window.fbCtx.clickCount = 0; window.fbCtx.clickWindowStart = 0; window.fbCtx.rubScore = 0;
  }
  forcedState = null;
  if (annoyedEndTime && Date.now() - annoyedEndTime < 2000) return 'IDLE';
  return evalState();
};

window.forceFbState = function(s, ms = 2500) { 
  forcedState = s; 
  forcedUntil = Date.now() + ms; 
  window.updateBuddySVG(s);
};

window.updateBuddySVG = function(s) {
  const cfg = FB_STATES[s];
  if (!cfg) return;
  const svgWrap = document.getElementById('fb-ext-svg-wrap');
  if (!svgWrap) return;

  svgWrap.className = `hp-buddy-svg-wrap state-${cfg.svgState}`;
  svgWrap.style.setProperty('--w1', cfg.w1);
  svgWrap.style.setProperty('--w2', cfg.w2);
  svgWrap.style.setProperty('--wp', cfg.wp);

  const mouth = svgWrap.querySelector('.mulut');
  if (mouth) {
    mouth.setAttribute('d', cfg.mouth);
    const fillStates = ['senang', 'semangat', 'makan'];
    mouth.setAttribute('fill', fillStates.includes(cfg.svgState) ? '#fa5252' : 'none');
  }

  const tooltip = document.getElementById('flowbuddy-mascot-tooltip');
  if (tooltip) {
    tooltip.textContent = cfg.badge;
  }
};

// Check state every 5 seconds
setInterval(() => {
  const newState = window.getFbState();
  if (newState !== window.fbCurrentState) {
    window.fbCurrentState = newState;
    window.updateBuddySVG(newState);
  }
}, 5000);
