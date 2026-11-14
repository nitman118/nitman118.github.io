// Slide-deck engine: fixed 1600×900 canvas, keyboard/clicker/touch navigation,
// per-slide URL hash, overview grid, speaker notes, theme toggle, fullscreen.

const W = 1600;
const H = 900;

const stage = document.getElementById('stage');
const slides = [...stage.querySelectorAll('.slide')];
const bar = document.querySelector('.progress .bar');
const counter = document.getElementById('hud-count');
const notesPanel = document.getElementById('notes');
const overview = document.getElementById('overview');
const help = document.getElementById('help');
const toastEl = document.getElementById('toast');

let current = -1;

// Shared footer on every slide except the title and closing slides.
slides.forEach((s, i) => {
  if (i === 0 || i === slides.length - 1) return;
  const f = document.createElement('div');
  f.className = 'slide-footer';
  f.innerHTML = '<span></span><span></span>';
  f.firstChild.textContent = stage.dataset.footer || '';
  f.lastChild.textContent = `nitishsingh.com · ${i + 1}`;
  s.appendChild(f);
});

/* ---------- scaling ---------- */

function fit() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  const x = (window.innerWidth - W * s) / 2;
  const y = (window.innerHeight - H * s) / 2;
  stage.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
}
window.addEventListener('resize', fit);
fit();

/* ---------- navigation ---------- */

function go(i, { updateHash = true } = {}) {
  i = Math.max(0, Math.min(slides.length - 1, i));
  if (i === current) return;
  if (current >= 0) slides[current].classList.remove('active');
  current = i;
  const slide = slides[i];
  slide.classList.add('active');

  bar.style.width = `${((i + 1) / slides.length) * 100}%`;
  counter.textContent = `${i + 1} / ${slides.length}`;
  if (updateHash) history.replaceState(null, '', `#${i + 1}`);
  renderNotes();
  document.dispatchEvent(new CustomEvent('slidechange', { detail: { index: i, id: slide.id } }));
}

const next = () => go(current + 1);
const prev = () => go(current - 1);

function fromHash() {
  const n = parseInt(location.hash.slice(1), 10);
  return Number.isFinite(n) ? n - 1 : 0;
}

window.addEventListener('hashchange', () => go(fromHash(), { updateHash: false }));

/* ---------- notes ---------- */

function renderNotes() {
  if (notesPanel.hidden) return;
  const src = slides[current].querySelector('.notes');
  notesPanel.innerHTML =
    `<h4>Notes · ${current + 1}. ${slides[current].dataset.title || ''}</h4>` +
    (src ? src.innerHTML : '<p>No notes for this slide.</p>');
}

function toggleNotes() {
  notesPanel.hidden = !notesPanel.hidden;
  renderNotes();
}

/* ---------- overview ---------- */

function buildOverview() {
  const grid = overview.querySelector('.ov-grid');
  grid.innerHTML = '';
  slides.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'ov-item' + (i === current ? ' current' : '');
    b.innerHTML = `<small>${i + 1}</small><span></span>`;
    b.querySelector('span').textContent = s.dataset.title || `Slide ${i + 1}`;
    b.addEventListener('click', () => {
      overview.hidden = true;
      go(i);
    });
    grid.appendChild(b);
  });
}

function toggleOverview() {
  help.hidden = true;
  overview.hidden = !overview.hidden;
  if (!overview.hidden) {
    buildOverview();
    overview.querySelector('.ov-item.current')?.focus();
  }
}

function toggleHelp() {
  overview.hidden = true;
  help.hidden = !help.hidden;
}

/* ---------- theme & fullscreen ---------- */

function setTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('uns-deck-theme', t); } catch (_) { /* storage unavailable */ }
}

function toggleTheme() {
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
}

try {
  const saved = localStorage.getItem('uns-deck-theme');
  if (saved) document.documentElement.dataset.theme = saved;
} catch (_) { /* storage unavailable */ }

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => toast('Fullscreen not available'));
}

export function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.remove('show'), 1800);
}

/* ---------- input ---------- */

const isTyping = (el) =>
  el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;

  if (e.key === 'Escape') {
    if (isTyping(t)) { t.blur(); return; }
    overview.hidden = true;
    help.hidden = true;
    return;
  }
  if (isTyping(t)) return;
  // Let Space/Enter activate a focused button instead of changing slides.
  if ((e.key === ' ' || e.key === 'Enter') && t.closest && t.closest('button, a, label')) return;

  switch (e.key) {
    case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ':
      e.preventDefault(); next(); break;
    case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace':
      e.preventDefault(); prev(); break;
    case 'Home': go(0); break;
    case 'End': go(slides.length - 1); break;
    case 'f': case 'F': toggleFullscreen(); break;
    case 'o': case 'O': toggleOverview(); break;
    case 'n': case 'N': toggleNotes(); break;
    case 't': case 'T': toggleTheme(); break;
    case '?': case 'h': case 'H': toggleHelp(); break;
    default:
  }
});

// Touch swipe (ignored when the gesture starts on an interactive control).
let touch = null;
stage.addEventListener('touchstart', (e) => {
  if (e.target.closest('input, button, select, textarea, .tree, .no-swipe')) { touch = null; return; }
  touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
stage.addEventListener('touchend', (e) => {
  if (!touch) return;
  const dx = e.changedTouches[0].clientX - touch.x;
  const dy = e.changedTouches[0].clientY - touch.y;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? next : prev)();
  touch = null;
});

// HUD buttons
document.getElementById('hud-prev').addEventListener('click', prev);
document.getElementById('hud-next').addEventListener('click', next);
document.getElementById('hud-overview').addEventListener('click', toggleOverview);
document.getElementById('hud-notes').addEventListener('click', toggleNotes);
document.getElementById('hud-theme').addEventListener('click', toggleTheme);
document.getElementById('hud-full').addEventListener('click', toggleFullscreen);
document.getElementById('hud-help').addEventListener('click', toggleHelp);
overview.addEventListener('click', (e) => { if (e.target === overview) overview.hidden = true; });
help.addEventListener('click', () => { help.hidden = true; });

// Hide cursor and HUD after inactivity.
let idleTimer;
function wake() {
  document.body.classList.remove('idle');
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => document.body.classList.add('idle'), 2500);
}
['mousemove', 'mousedown', 'touchstart'].forEach((ev) => window.addEventListener(ev, wake, { passive: true }));
wake();

export function currentSlideId() {
  return slides[current]?.id;
}

go(fromHash(), { updateHash: false });
if (!location.hash) history.replaceState(null, '', '#1');
