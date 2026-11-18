// Shared slide widgets:
// - .rv    reveal card: shows a headline, opens to show its body on click
// - .flip  flip card: click to turn from front (.fr) to back (.bk)
// - .video-embed  video block: YouTube (privacy-enhanced, loads on click)
//                 or a self-hosted file; pauses when you leave the slide
// Cards are focusable and work with Enter/Space as well as mouse and touch.

function toggle(el) {
  el.classList.toggle('open');
  el.setAttribute('aria-expanded', String(el.classList.contains('open')));
}

export function initCards(root = document) {
  root.querySelectorAll('.rv, .flip').forEach((el) => {
    if (el.dataset.ready) return;
    el.dataset.ready = '1';
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
    el.setAttribute('aria-expanded', 'false');
  });
}

document.addEventListener('click', (e) => {
  if (e.target.closest && e.target.closest('.term, a, input, select, textarea')) return;
  const el = e.target.closest && e.target.closest('.rv, .flip');
  if (el) toggle(el);
  const all = e.target.closest && e.target.closest('[data-open-all]');
  if (all) {
    const scope = all.closest('.slide') || document;
    const cards = [...scope.querySelectorAll('.rv, .flip')];
    const open = cards.some((c) => !c.classList.contains('open'));
    cards.forEach((c) => {
      c.classList.toggle('open', open);
      c.setAttribute('aria-expanded', String(open));
    });
    all.textContent = open ? all.dataset.closeLabel || 'Close all' : all.dataset.openLabel || 'Open all';
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target.closest && e.target.closest('.rv, .flip');
  if (!el || e.target !== el) return;
  e.preventDefault();
  toggle(el);
});

/* ---------- video ---------- */

function ytUrl(id, start) {
  const p = new URLSearchParams({ autoplay: '1', rel: '0', modestbranding: '1', enablejsapi: '1', playsinline: '1' });
  if (start) p.set('start', start);
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?${p}`;
}

export function initVideos(root = document) {
  root.querySelectorAll('.video-embed').forEach((box) => {
    if (box.dataset.ready) return;
    box.dataset.ready = '1';
    const title = box.dataset.title || 'Play video';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'video-facade';
    if (box.dataset.poster) btn.style.backgroundImage = `url("${box.dataset.poster}")`;
    btn.innerHTML = '<span class="video-play" aria-hidden="true">▶</span><span class="video-title"></span>';
    btn.querySelector('.video-title').textContent = title;
    btn.setAttribute('aria-label', `Play video: ${title}`);
    box.appendChild(btn);
    if (box.dataset.youtube) {
      const note = document.createElement('span');
      note.className = 'video-note';
      note.textContent = 'Plays from YouTube · needs an internet connection';
      box.appendChild(note);
    }
    btn.addEventListener('click', () => {
      if (box.dataset.youtube && !navigator.onLine) {
        btn.querySelector('.video-title').textContent = 'No internet connection — this video can’t play offline';
        return;
      }
      let player;
      if (box.dataset.youtube) {
        player = document.createElement('iframe');
        player.src = ytUrl(box.dataset.youtube, box.dataset.start);
        player.title = title;
        player.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        player.allowFullscreen = true;
        player.referrerPolicy = 'strict-origin-when-cross-origin';
      } else {
        player = document.createElement('video');
        player.src = box.dataset.src;
        player.controls = true;
        player.autoplay = true;
        player.playsInline = true;
        if (box.dataset.poster) player.poster = box.dataset.poster;
      }
      player.className = 'video-player';
      box.replaceChildren(player);
    });
  });
}

function pauseAll() {
  document.querySelectorAll('.video-embed video').forEach((v) => v.pause());
  document.querySelectorAll('.video-embed iframe').forEach((f) => {
    f.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
  });
}

document.addEventListener('slidechange', pauseAll);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseAll(); });

initCards();
initVideos();
