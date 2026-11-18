// Slide-deck engine: fixed 1600×900 canvas, keyboard/clicker/touch navigation,
// per-slide URL hash, overview grid, speaker notes, theme toggle, fullscreen.
//
// Two layouts:
// - Full-window deck (no #deck-shell): the deck fills the browser window.
// - Article page (#deck-shell present): the deck sits in a 16:9 viewer above
//   an article. Keys only drive the slides when the viewer has focus or the
//   deck is being presented; "Present" puts the viewer into fullscreen.

const W = 1600;
const H = 900;

const shell = document.getElementById('deck-shell');
const embedded = !!shell;
const stage = document.getElementById('stage');
const slides = [...stage.querySelectorAll('.slide')];
const bar = document.querySelector('.progress .bar');
const counters = document.querySelectorAll('#hud-count, [data-deck="count"]');
const notesPanel = document.getElementById('notes');
const overview = document.getElementById('overview');
const help = document.getElementById('help');
const toastEl = document.getElementById('toast');

let current = -1;
let inView = true;

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

/* ---------- presenting state ---------- */

const isPresenting = () => !embedded || document.body.classList.contains('presenting');

function setPresenting(on) {
  if (!embedded) return;
  document.body.classList.toggle('presenting', on);
  if (on) shell.focus({ preventScroll: true });
  wake();
  fit();
}

/* ---------- scaling ---------- */

function fit() {
  const w = embedded ? shell.clientWidth : window.innerWidth;
  const h = embedded ? shell.clientHeight : window.innerHeight;
  if (!w || !h) return;
  const s = Math.min(w / W, h / H);
  const x = (w - W * s) / 2;
  const y = (h - H * s) / 2;
  stage.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
}
window.addEventListener('resize', fit);
if (embedded && 'ResizeObserver' in window) new ResizeObserver(fit).observe(shell);
fit();

if (embedded && 'IntersectionObserver' in window) {
  new IntersectionObserver((entries) => {
    inView = entries[0].isIntersecting;
  }).observe(shell);
}

/* ---------- navigation ---------- */

function go(i, { updateHash = true } = {}) {
  i = Math.max(0, Math.min(slides.length - 1, i));
  if (i === current) return;
  if (current >= 0) slides[current].classList.remove('active');
  current = i;
  const slide = slides[i];
  slide.classList.add('active');

  bar.style.width = `${((i + 1) / slides.length) * 100}%`;
  counters.forEach((c) => (c.textContent = `${i + 1} / ${slides.length}`));
  if (updateHash) history.replaceState(null, '', `#${i + 1}`);
  renderNotes();
  document.dispatchEvent(new CustomEvent('slidechange', { detail: { index: i, id: slide.id } }));
}

const next = () => go(current + 1);
const prev = () => go(current - 1);

function fromHash() {
  const m = /^#(\d+)$/.exec(location.hash);
  return m ? parseInt(m[1], 10) - 1 : null;
}

window.addEventListener('hashchange', () => {
  const n = fromHash();
  if (n != null) go(n, { updateHash: false });
});

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
      if (embedded) shell.focus({ preventScroll: true });
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
  if (!embedded) {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => toast('Fullscreen not available'));
    return;
  }
  if (document.fullscreenElement) {
    document.exitFullscreen?.();
  } else if (isPresenting()) {
    setPresenting(false); // fallback mode (no Fullscreen API, e.g. iPhone)
  } else if (shell.requestFullscreen) {
    shell.requestFullscreen().catch(() => setPresenting(true));
  } else {
    setPresenting(true);
  }
}

if (embedded) {
  document.addEventListener('fullscreenchange', () => setPresenting(document.fullscreenElement === shell));
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

// On an article page the arrow keys and space belong to the page unless the
// reader has clicked into the slides (or is presenting).
const deckHasKeys = () => !embedded || isPresenting() || shell.contains(document.activeElement);

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;

  if (e.key === 'Escape') {
    if (isTyping(t)) { t.blur(); if (embedded) shell.focus({ preventScroll: true }); return; }
    if (!overview.hidden || !help.hidden) {
      overview.hidden = true;
      help.hidden = true;
      return;
    }
    if (embedded && isPresenting()) {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else setPresenting(false);
    }
    return;
  }
  if (isTyping(t)) return;
  if (!deckHasKeys()) return;
  // Let Space/Enter activate a focused button or card instead of changing slides,
  // and let a focused video handle Space itself (play/pause).
  if ((e.key === ' ' || e.key === 'Enter') && t.closest && t.closest('button, a, label, [role="button"], video')) return;

  switch (e.key) {
    case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ':
      e.preventDefault(); next(); break;
    case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace':
      e.preventDefault(); prev(); break;
    case 'Home': e.preventDefault(); go(0); break;
    case 'End': e.preventDefault(); go(slides.length - 1); break;
    case 'f': case 'F': toggleFullscreen(); break;
    case 'o': case 'O': toggleOverview(); break;
    case 'n': case 'N': toggleNotes(); break;
    case 't': case 'T': toggleTheme(); break;
    case '?': case 'h': case 'H': toggleHelp(); break;
    default:
  }
});

// Clicking anywhere in the viewer gives it the keyboard.
if (embedded) {
  shell.addEventListener('mousedown', (e) => {
    if (!e.target.closest('input, textarea, select, button, a, label')) shell.focus({ preventScroll: true });
  });
}

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

// Controls: the floating HUD and, on article pages, the viewer bar and links.
const ACTIONS = {
  prev,
  next,
  overview: toggleOverview,
  notes: toggleNotes,
  theme: toggleTheme,
  present: toggleFullscreen,
  help: toggleHelp,
};
const bind = (id, fn) => document.getElementById(id)?.addEventListener('click', fn);
bind('hud-prev', prev);
bind('hud-next', next);
bind('hud-overview', toggleOverview);
bind('hud-notes', toggleNotes);
bind('hud-theme', toggleTheme);
bind('hud-full', toggleFullscreen);
bind('hud-help', toggleHelp);
document.querySelectorAll('[data-deck]').forEach((el) => {
  const fn = ACTIONS[el.dataset.deck];
  if (fn) el.addEventListener('click', fn);
});
overview.addEventListener('click', (e) => { if (e.target === overview) overview.hidden = true; });
help.addEventListener('click', () => { help.hidden = true; });

// Article links like <a data-slide="7"> jump the viewer to a slide.
document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('[data-slide]');
  if (!a || !embedded) return;
  e.preventDefault();
  go(parseInt(a.dataset.slide, 10) - 1);
  shell.scrollIntoView({ behavior: 'smooth', block: 'center' });
  shell.focus({ preventScroll: true });
});

// Hide cursor and HUD after inactivity (only while presenting).
let idleTimer;
function wake() {
  document.body.classList.remove('idle');
  clearTimeout(idleTimer);
  if (isPresenting()) idleTimer = setTimeout(() => document.body.classList.add('idle'), 2500);
}
['mousemove', 'mousedown', 'touchstart'].forEach((ev) => window.addEventListener(ev, wake, { passive: true }));
wake();

// Live widgets render only for the visible slide, and on article pages only
// while the viewer is on screen.
export function currentSlideId() {
  if (embedded && !inView && !isPresenting()) return null;
  return slides[current]?.id;
}

const start = fromHash();
go(start ?? 0, { updateHash: false });
if (!embedded && start == null) history.replaceState(null, '', '#1');
