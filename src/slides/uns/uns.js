// In-browser Unified Namespace: an MQTT-style broker (retained messages,
// + and # wildcards), a namespace generator, a simulated factory that reports
// by exception, and the interactive widgets used on the slides.
// Everything runs locally — no network, so the demo works on any venue Wi-Fi.

import { toast, currentSlideId } from '../shared/deck.js';

/* =========================================================================
   Helpers
   ========================================================================= */

const $ = (sel, root = document) => root.querySelector(sel);
function h(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
const SVG_NS = 'http://www.w3.org/2000/svg';
function s(tag, attrs = {}) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rand = (a, b) => a + Math.random() * (b - a);
const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;
function gauss() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const visible = (slideId) => currentSlideId() === slideId;
const clock = () => new Date().toLocaleTimeString('en-GB');

/* =========================================================================
   Broker — MQTT semantics: retained last value per topic, + and # wildcards
   ========================================================================= */

export function matches(filter, topic) {
  const f = filter.split('/');
  const t = topic.split('/');
  for (let i = 0; i < f.length; i++) {
    if (f[i] === '#') return true;
    if (i >= t.length) return false;
    if (f[i] !== '+' && f[i] !== t[i]) return false;
  }
  return f.length === t.length;
}

export function filterError(filter) {
  if (!filter.trim()) return 'Type a topic filter';
  const levels = filter.split('/');
  for (let i = 0; i < levels.length; i++) {
    const l = levels[i];
    if (l.includes('#') && (l !== '#' || i !== levels.length - 1)) return '# must be a whole level and the last one';
    if (l.includes('+') && l !== '+') return '+ must be a whole level';
  }
  return null;
}

class Broker {
  constructor() {
    this.subs = new Set();
    this.retained = new Map();
    this.count = 0;
    this.rate = 0;
    let last = 0;
    setInterval(() => {
      this.rate = this.count - last;
      last = this.count;
    }, 1000);
  }

  publish(topic, payload) {
    const msg = { topic, payload, t: Date.now() };
    this.retained.set(topic, msg);
    this.count++;
    for (const sub of this.subs) if (matches(sub.filter, topic)) sub.cb(msg);
  }

  subscribe(filter, cb, { replay = false } = {}) {
    const sub = { filter, cb };
    this.subs.add(sub);
    if (replay) for (const m of [...this.retained.values()]) if (matches(filter, m.topic)) cb(m);
    return () => this.subs.delete(sub);
  }

  reset() {
    this.retained.clear();
  }
}

const broker = new Broker();

/* =========================================================================
   Namespace generator
   ========================================================================= */

const POINTS = [
  ['state', 'State', ''],
  ['part_count', 'Part count', 'pcs'],
  ['temperature', 'Temperature', '°C'],
  ['spindle_speed', 'Spindle speed', 'rpm'],
  ['power', 'Power', 'kW'],
  ['vibration', 'Vibration', 'mm/s'],
  ['cycle_time', 'Cycle time', 's'],
];
const UNIT = Object.fromEntries(POINTS.map(([k, , u]) => [k, u]));

const TYPES = [
  [/machin|mill|cnc/, 'cnc'],
  [/turn|lathe/, 'lathe'],
  [/assembl/, 'robot'],
  [/weld/, 'welder'],
  [/press|stamp/, 'press'],
  [/inspect|quality|metrolog/, 'cmm'],
  [/pack/, 'packer'],
  [/mou?ld/, 'molder'],
  [/paint|coat/, 'coater'],
];
const typeFor = (area) => (TYPES.find(([re]) => re.test(area.toLowerCase())) || [null, 'machine'])[1];

const LIMITS = { sites: 3, areas: 5, lines: 4, machines: 6 };

const words = (str) =>
  String(str).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

function fmt(ws, style) {
  if (!ws.length) return 'x';
  if (style === 'snake') return ws.join('_');
  if (style === 'camel') return ws[0] + ws.slice(1).map((w) => w[0].toUpperCase() + w.slice(1)).join('');
  return ws.join('-');
}

const list = (str) => String(str).split(',').map((x) => x.trim()).filter(Boolean);

function slugs(names, style) {
  const used = new Set();
  return names.map((n) => {
    const w = words(n);
    let slug = fmt(w, style);
    let i = 2;
    while (used.has(slug)) slug = fmt([...w, String(i++)], style);
    used.add(slug);
    return slug;
  });
}

function buildModel(cfg) {
  const st = cfg.naming;
  const ent = fmt(words(cfg.enterprise), st);
  let siteNames = list(cfg.sites).slice(0, LIMITS.sites);
  let areaNames = list(cfg.areas).slice(0, LIMITS.areas);
  if (!siteNames.length) siteNames = ['Site'];
  if (!areaNames.length) areaNames = ['Area'];
  const sites = slugs(siteNames, st);
  const areas = slugs(areaNames, st);
  const nL = clamp(Math.round(cfg.lines) || 1, 1, LIMITS.lines);
  const nM = clamp(Math.round(cfg.machines) || 1, 1, LIMITS.machines);
  const pts = cfg.points.length ? cfg.points : ['state'];

  const lines = [];
  const machines = [];
  for (const site of sites) {
    areas.forEach((area, ai) => {
      for (let l = 1; l <= nL; l++) {
        const line = fmt(['line', String(l)], st);
        const lineBase = [ent, site, area, line].join('/');
        lines.push({ base: lineBase, label: `${area}/${line}`, site, area, line });
        const type = typeFor(areaNames[ai]);
        for (let m = 1; m <= nM; m++) {
          const name = fmt([type, String(m).padStart(2, '0')], st);
          const base = `${lineBase}/${name}`;
          machines.push({
            id: base,
            base,
            name,
            type,
            site,
            area,
            line,
            lineBase,
            points: Object.fromEntries(pts.map((k) => [k, `${base}/${fmt(k.split('_'), st)}`])),
          });
        }
      }
    });
  }

  return {
    cfg: { ...cfg, lines: nL, machines: nM },
    ent,
    sites,
    areas,
    lines,
    machines,
    pts,
    counts: { sites: sites.length, areas: areas.length, lines: nL, machines: nM, points: pts.length },
    topicCount: machines.length * pts.length,
  };
}

/* =========================================================================
   Factory simulator — report by exception
   ========================================================================= */

const SPEED = { cnc: 8000, lathe: 2400, robot: 1200, press: 60, cmm: 300, packer: 900 };
const DEADBAND = { temperature: 0.3, spindle_speed: 40, power: 0.25, vibration: 0.15, cycle_time: 0.8 };
const FAULTS = [
  ['SPINDLE_OVERTEMP', 'Spindle temperature above limit'],
  ['TOOL_BREAKAGE', 'Tool breakage detected'],
  ['COOLANT_LOW', 'Coolant level low'],
  ['AXIS_OVERLOAD', 'Axis drive overload'],
];

class Simulator {
  constructor() {
    this.running = true;
    this.tickNo = 0;
    this.sims = [];
    this.byId = new Map();
    setInterval(() => this.tick(), 250);
  }

  load(model) {
    this.model = model;
    this.polled = 0;
    this.published = 0;
    this.sims = model.machines.map((m, i) => ({
      m,
      i,
      state: Math.random() < 0.15 ? 'IDLE' : 'RUNNING',
      fault: null,
      temp: rand(42, 50),
      parts: Math.floor(rand(200, 900)),
      cycle: rand(38, 46),
      speed: SPEED[m.type] ?? 1500,
      powerBase: rand(9, 14),
      last: {},
    }));
    this.byId = new Map(this.sims.map((x) => [x.m.id, x]));
    for (const x of this.sims) this.update(x, true);
  }

  tick() {
    if (!this.running) return;
    this.tickNo++;
    const k = this.tickNo % 4;
    for (const x of this.sims) if (x.i % 4 === k) this.update(x, false);
  }

  update(x, force) {
    if (x.fault) x.state = 'DOWN';
    else if (x.state === 'RUNNING' && Math.random() < 0.012) x.state = 'IDLE';
    else if (x.state !== 'RUNNING' && Math.random() < 0.15) x.state = 'RUNNING';

    const run = x.state === 'RUNNING';
    const target = x.fault ? 88 : run ? 49 : 36;
    x.temp += (target - x.temp) * (x.fault ? 0.35 : 0.12) + gauss() * 0.35;
    if (run && Math.random() < 0.3) x.parts++;
    if (run) x.cycle += (42 - x.cycle) * 0.1 + gauss() * 0.6;

    const v = {
      state: x.state,
      part_count: x.parts,
      temperature: round(x.temp, 1),
      spindle_speed: run ? Math.round((x.speed * (1 + gauss() * 0.015)) / 10) * 10 : 0,
      power: round(x.fault ? 0.6 : run ? x.powerBase + gauss() * 0.6 : 1.8 + gauss() * 0.1, 1),
      vibration: round(x.fault ? 9.2 + gauss() * 0.4 : run ? 1.6 + gauss() * 0.25 : 0.25 + Math.abs(gauss()) * 0.05, 2),
      cycle_time: round(x.cycle, 1),
    };

    for (const k of this.model.pts) {
      this.polled++;
      const val = v[k];
      const prev = x.last[k];
      const changed =
        force || prev === undefined || (DEADBAND[k] != null ? Math.abs(val - prev) >= DEADBAND[k] : val !== prev);
      if (!changed) continue;
      x.last[k] = val;
      this.published++;
      broker.publish(x.m.points[k], { value: val, unit: UNIT[k], ts: new Date().toISOString() });
    }
  }

  fault(id) {
    const x = this.byId.get(id);
    if (!x || x.fault) return;
    const [code, message] = FAULTS[Math.floor(Math.random() * FAULTS.length)];
    x.fault = { code, message };
    this.update(x, false);
    broker.publish(`${x.m.base}/alarm`, { value: code, severity: 'high', message, ts: new Date().toISOString() });
  }

  repair(id) {
    const x = this.byId.get(id);
    if (!x || !x.fault) return;
    x.fault = null;
    x.state = 'RUNNING';
    broker.publish(`${x.m.base}/alarm`, { value: 'CLEARED', severity: 'info', message: 'Alarm cleared', ts: new Date().toISOString() });
    this.update(x, false);
  }

  isDown(id) {
    return !!this.byId.get(id)?.fault;
  }

  savings() {
    return this.polled ? 1 - this.published / this.polled : 0;
  }
}

const sim = new Simulator();
const hub = new EventTarget();
let model = null;

function applyConfig(cfg) {
  model = buildModel(cfg);
  broker.reset();
  hub.dispatchEvent(new CustomEvent('model', { detail: model }));
  sim.load(model);
  hub.dispatchEvent(new CustomEvent('loaded', { detail: model }));
}

/* =========================================================================
   Availability service — a back-end consumer that also PUBLISHES derived KPIs
   ========================================================================= */

class AvailabilityService {
  constructor() {
    this.states = new Map();
    this.hist = new Map();
    this.lastPub = new Map();
    hub.addEventListener('model', (e) => this.attach(e.detail));
    setInterval(() => this.sample(), 1000);
  }

  attach(m) {
    this.unsub?.();
    this.states.clear();
    this.hist.clear();
    this.lastPub.clear();
    this.filter = `${m.ent}/+/+/+/+/state`;
    this.unsub = broker.subscribe(this.filter, (msg) => this.states.set(msg.topic, msg.payload.value));
  }

  sample() {
    if (!model || !this.states.size) return;
    const perLine = new Map();
    for (const [topic, st] of this.states) {
      const line = topic.split('/').slice(0, 4).join('/');
      const a = perLine.get(line) || [0, 0];
      a[0] += st === 'RUNNING' ? 1 : 0;
      a[1] += 1;
      perLine.set(line, a);
    }
    for (const [line, [up, n]] of perLine) {
      const hst = this.hist.get(line) || [];
      hst.push(up / n);
      if (hst.length > 60) hst.shift();
      this.hist.set(line, hst);
      const avail = round((hst.reduce((p, c) => p + c, 0) / hst.length) * 100, 1);
      const prev = this.lastPub.get(line);
      if (prev === undefined || Math.abs(avail - prev) >= 0.5) {
        this.lastPub.set(line, avail);
        broker.publish(`${line}/kpi/availability`, { value: avail, unit: '%', window: '60s', ts: new Date().toISOString() });
      }
    }
  }
}

new AvailabilityService();

/* =========================================================================
   Shared rendering
   ========================================================================= */

const LEVELS = ['Enterprise', 'Site', 'Area', 'Line', 'Cell', 'Data point'];

function topicChips(topic) {
  const wrap = h('div', 'topic');
  const parts = topic.split('/');
  parts.forEach((p, i) => {
    if (i) wrap.appendChild(h('span', 'sep', '/'));
    const seg = h('span', 'seg');
    const lv = Math.min(i, 5);
    seg.appendChild(h('b', `lv${lv}`, p));
    const label = p === 'kpi' ? 'KPI' : p === '+' ? 'one level' : p === '#' ? 'all below' : LEVELS[lv] || '';
    seg.appendChild(h('small', `tx${lv}`, label));
    wrap.appendChild(seg);
  });
  return wrap;
}

function fmtValue(payload) {
  const v = payload.value;
  if (typeof v === 'number') return payload.unit ? `${v} ${payload.unit}` : String(v);
  return String(v);
}

function valueClass(topic, payload) {
  const v = payload.value;
  if (v === 'RUNNING' || v === 'IDLE' || v === 'DOWN') return `st-${v}`;
  if (topic.endsWith('/alarm') && v !== 'CLEARED') return 'st-alarm';
  return '';
}

/* =========================================================================
   Topic tree (namespace explorer)
   ========================================================================= */

class TopicTree {
  constructor(container, { onSelect } = {}) {
    this.c = container;
    this.onSelect = onSelect;
    this.dirty = new Set();
    this.scheduled = false;
    this.reset();
    hub.addEventListener('model', () => this.reset());
    broker.subscribe('#', (m) => this.onMsg(m));
  }

  reset() {
    this.root = { name: '', path: '', children: new Map(), depth: -1, expanded: true, leaves: 0 };
    this.c.innerHTML = '';
    this.root.ul = h('ul');
    this.c.appendChild(this.root.ul);
    this.selected = null;
    this.dirty.clear();
    this.total = 0;
  }

  onMsg(msg) {
    const parts = msg.topic.split('/');
    let n = this.root;
    let firstNew = null;
    const chain = [];
    for (let i = 0; i < parts.length; i++) {
      let c = n.children.get(parts[i]);
      if (!c) {
        c = {
          name: parts[i],
          path: parts.slice(0, i + 1).join('/'),
          children: new Map(),
          depth: i,
          // Auto-expand the first branch down to the first machine's data points.
          expanded: n.expanded && n.children.size === 0 && i <= 4,
          leaves: 0,
          msg: null,
          parent: n,
        };
        n.children.set(parts[i], c);
        if (!firstNew) firstNew = c;
      }
      chain.push(c);
      n = c;
    }
    const isNewLeaf = !n.msg;
    n.msg = msg;
    if (isNewLeaf) {
      this.total++;
      for (const a of chain) {
        a.leaves++;
        if (a.countEl) this.dirty.add(a);
      }
    }
    if (firstNew && firstNew.parent.ul) firstNew.parent.ul.appendChild(this.renderNode(firstNew));
    if (n.valEl || n === this.selected) this.dirty.add(n);
    this.schedule();
  }

  renderNode(node) {
    const li = h('li');
    const row = h('div', 'tnode');
    const isLeaf = node.children.size === 0;
    const caret = h('span', 'caret', isLeaf ? '' : node.expanded ? '▾' : '▸');
    const name = h('span', `name tx${Math.min(node.depth, 5)}`, node.name);
    row.append(caret, name);
    node.row = row;
    node.caretEl = caret;
    if (isLeaf) {
      node.valEl = h('span', 'val');
      row.appendChild(node.valEl);
      if (node.msg) this.paintValue(node, false);
    } else {
      node.countEl = h('span', 'count', `${node.leaves}`);
      row.appendChild(node.countEl);
    }
    if (node === this.selected) row.classList.add('selected');
    row.addEventListener('click', () => this.click(node));
    li.appendChild(row);
    node.li = li;
    if (!isLeaf && node.expanded) {
      node.ul = h('ul');
      for (const c of node.children.values()) node.ul.appendChild(this.renderNode(c));
      li.appendChild(node.ul);
    }
    return li;
  }

  detach(node) {
    for (const c of node.children.values()) {
      c.row = c.valEl = c.countEl = c.ul = c.li = c.caretEl = null;
      this.detach(c);
    }
  }

  click(node) {
    if (node.children.size) {
      node.expanded = !node.expanded;
      node.caretEl.textContent = node.expanded ? '▾' : '▸';
      if (node.expanded) {
        node.ul = h('ul');
        for (const c of node.children.values()) node.ul.appendChild(this.renderNode(c));
        node.li.appendChild(node.ul);
      } else {
        node.ul?.remove();
        node.ul = null;
        this.detach(node);
      }
    }
    this.selected?.row?.classList.remove('selected');
    this.selected = node;
    node.row?.classList.add('selected');
    this.onSelect?.(node);
  }

  setAll(expanded) {
    const walk = (n) => {
      for (const c of n.children.values()) {
        if (c.children.size) c.expanded = expanded || c.depth < 1;
        walk(c);
      }
    };
    walk(this.root);
    this.detach(this.root);
    this.root.ul.innerHTML = '';
    for (const c of this.root.children.values()) this.root.ul.appendChild(this.renderNode(c));
  }

  paintValue(node, flash) {
    const el = node.valEl;
    el.textContent = fmtValue(node.msg.payload);
    el.className = `val ${valueClass(node.path, node.msg.payload)}`;
    if (flash) el.classList.add('flash');
  }

  schedule() {
    if (this.scheduled) return;
    this.scheduled = true;
    requestAnimationFrame(() => {
      this.scheduled = false;
      const flashed = [];
      for (const n of this.dirty) {
        if (n.valEl && n.msg) {
          this.paintValue(n, true);
          flashed.push(n.valEl);
        }
        if (n.countEl) n.countEl.textContent = `${n.leaves}`;
        if (n === this.selected) this.onSelect?.(n, true);
      }
      this.dirty.clear();
      if (flashed.length) requestAnimationFrame(() => flashed.forEach((el) => el.classList.remove('flash')));
    });
  }

  topics() {
    return [...broker.retained.keys()];
  }
}

/* =========================================================================
   Slide 1 — live teaser on the title slide
   ========================================================================= */

function initTitleLive() {
  const box = $('#title-live');
  if (!box) return;
  let unsub = null;
  const rows = new Map();
  hub.addEventListener('loaded', (e) => {
    unsub?.();
    box.innerHTML = '';
    rows.clear();
    const m = e.detail.machines[0];
    const pts = e.detail.pts.slice(0, 5);
    box.appendChild(h('div', 'title-live-base mono', `${m.base}/`));
    for (const k of pts) {
      const topic = m.points[k];
      const r = h('div', 'title-live-row');
      const name = h('span', 'mono tx5', topic.split('/').pop());
      const val = h('span', 'val mono');
      r.append(name, val);
      box.appendChild(r);
      rows.set(topic, val);
    }
    unsub = broker.subscribe(`${m.base}/#`, (msg) => {
      const v = rows.get(msg.topic);
      if (!v) return;
      v.textContent = fmtValue(msg.payload);
      v.className = `val mono ${valueClass(msg.topic, msg.payload)}`;
    }, { replay: true });
  });
}

/* =========================================================================
   Slide 3 — point-to-point vs hub
   ========================================================================= */

const SYSTEMS = ['ERP', 'MES', 'SCADA', 'Historian', 'QMS', 'CMMS', 'WMS', 'PLM', 'APS', 'BI', 'LIMS', 'Edge AI'];

function initSpaghetti() {
  const svg = $('#sp-svg');
  if (!svg) return;
  const slider = $('#sp-n');
  const nOut = $('#sp-n-out');
  const modeBtns = [...document.querySelectorAll('#sp-mode button')];
  let mode = 'p2p';

  function draw() {
    const n = +slider.value;
    nOut.textContent = n;
    svg.innerHTML = '';
    const cx = 380;
    const cy = 300;
    const r = 232;
    const pts = Array.from({ length: n }, (_, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    });
    const lines = s('g');
    if (mode === 'p2p') {
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++)
          lines.appendChild(s('line', { x1: pts[i][0], y1: pts[i][1], x2: pts[j][0], y2: pts[j][1], class: 'sp-edge bad' }));
    } else {
      for (const p of pts) lines.appendChild(s('line', { x1: cx, y1: cy, x2: p[0], y2: p[1], class: 'sp-edge good' }));
    }
    svg.appendChild(lines);
    if (mode === 'hub') {
      svg.appendChild(s('circle', { cx, cy, r: 62, class: 'sp-hub' }));
      const t = s('text', { x: cx, y: cy + 9, class: 'sp-hub-label' });
      t.textContent = 'UNS';
      svg.appendChild(t);
    }
    pts.forEach((p, i) => {
      svg.appendChild(s('circle', { cx: p[0], cy: p[1], r: 40, class: 'sp-node' }));
      const t = s('text', { x: p[0], y: p[1] + 6, class: 'sp-label' });
      t.textContent = SYSTEMS[i];
      svg.appendChild(t);
    });
    $('#sp-p2p').textContent = (n * (n - 1)) / 2;
    $('#sp-hubn').textContent = n;
    $('#sp-next-p2p').textContent = n;
    $('#sp-card-p2p').classList.toggle('on', mode === 'p2p');
    $('#sp-card-hub').classList.toggle('on', mode === 'hub');
  }

  slider.addEventListener('input', draw);
  modeBtns.forEach((b) =>
    b.addEventListener('click', () => {
      mode = b.dataset.mode;
      modeBtns.forEach((x) => x.classList.toggle('on', x === b));
      draw();
    }),
  );
  draw();
}

/* =========================================================================
   Slide 7 — namespace generator + live explorer
   ========================================================================= */

function initGenerator() {
  const form = $('#gen-form');
  const ptsBox = $('#g-points');
  const DEFAULT_PTS = ['state', 'part_count', 'temperature', 'spindle_speed', 'power'];

  for (const [k, label] of POINTS) {
    const lab = h('label', 'chip-toggle');
    const cb = h('input');
    cb.type = 'checkbox';
    cb.value = k;
    cb.checked = DEFAULT_PTS.includes(k);
    lab.append(cb, document.createTextNode(label));
    ptsBox.appendChild(lab);
  }

  let naming = 'kebab';
  const namingBtns = [...document.querySelectorAll('#g-naming button')];
  namingBtns.forEach((b) =>
    b.addEventListener('click', () => {
      naming = b.dataset.style;
      namingBtns.forEach((x) => x.classList.toggle('on', x === b));
      apply();
    }),
  );

  const read = () => ({
    enterprise: $('#g-ent').value,
    sites: $('#g-sites').value,
    areas: $('#g-areas').value,
    lines: +$('#g-lines').value,
    machines: +$('#g-machines').value,
    points: [...ptsBox.querySelectorAll('input:checked')].map((x) => x.value),
    naming,
  });

  let t;
  function apply() {
    clearTimeout(t);
    applyConfig(read());
  }
  form.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(apply, 350);
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    apply();
  });

  // Inspector
  const insTopic = $('#g-insp-topic');
  const insJson = $('#g-insp-json');
  const insHint = $('#g-insp-hint');
  function inspect(node, live) {
    if (!live) {
      insTopic.innerHTML = '';
      insTopic.appendChild(topicChips(node.path));
    }
    if (node.msg) {
      insJson.textContent = JSON.stringify(node.msg.payload, null, 1);
      insHint.textContent = 'Retained value · updates live';
    } else {
      insJson.textContent = `${node.leaves} topics below.\n\nSubscribe to all of them:\n${node.path}/#`;
      insHint.textContent = 'Branch';
    }
  }

  const tree = new TopicTree($('#g-tree'), { onSelect: inspect });

  // Stats
  const formula = $('#g-formula');
  hub.addEventListener('loaded', (e) => {
    const m = e.detail;
    const c = m.counts;
    formula.textContent = `${c.sites} site${c.sites > 1 ? 's' : ''} × ${c.areas} area${c.areas > 1 ? 's' : ''} × ${c.lines} line${c.lines > 1 ? 's' : ''} × ${c.machines} machine${c.machines > 1 ? 's' : ''} × ${c.points} data point${c.points > 1 ? 's' : ''} = ${m.topicCount} topics, plus alarms and KPIs published at runtime`;
    const ex = $('#g-example');
    ex.innerHTML = '';
    const first = m.machines[0];
    ex.appendChild(topicChips(first.points[m.pts.includes('temperature') ? 'temperature' : m.pts[0]]));
    insTopic.innerHTML = '';
    insJson.textContent = 'Click any topic in the tree to inspect its payload.';
    insHint.textContent = '';
  });

  setInterval(() => {
    if (!visible('s-generator')) return;
    $('#g-stat-topics').textContent = tree.total.toLocaleString('en-GB');
    $('#g-stat-rate').textContent = sim.running ? broker.rate.toLocaleString('en-GB') : '0';
    $('#g-stat-rbe').textContent = `${Math.round(sim.savings() * 100)}%`;
  }, 500);

  // Toolbar
  const liveBtn = $('#g-live');
  liveBtn.addEventListener('click', () => {
    sim.running = !sim.running;
    liveBtn.innerHTML = sim.running ? '<span class="live-dot"></span> Live' : '<span class="live-dot paused"></span> Paused';
  });
  $('#g-expand').addEventListener('click', () => tree.setAll(true));
  $('#g-collapse').addEventListener('click', () => tree.setAll(false));
  $('#g-copy').addEventListener('click', async () => {
    const txt = tree.topics().sort().join('\n');
    try {
      await navigator.clipboard.writeText(txt);
      toast(`Copied ${tree.topics().length} topics`);
    } catch (_) {
      toast('Clipboard not available — use Download');
    }
  });
  $('#g-download').addEventListener('click', () => {
    const nested = {};
    for (const [topic, msg] of [...broker.retained.entries()].sort()) {
      let n = nested;
      const parts = topic.split('/');
      parts.forEach((p, i) => {
        if (i === parts.length - 1) n[p] = msg.payload;
        else n = n[p] = n[p] || {};
      });
    }
    const doc = { generated: new Date().toISOString(), naming, config: model.cfg, topics: tree.topics().sort(), namespace: nested };
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const a = h('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${model.ent}-uns.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  $('#g-reset').addEventListener('click', () => {
    form.reset();
    ptsBox.querySelectorAll('input').forEach((x) => (x.checked = DEFAULT_PTS.includes(x.value)));
    naming = 'kebab';
    namingBtns.forEach((x) => x.classList.toggle('on', x.dataset.style === 'kebab'));
    apply();
  });

  apply();
}

/* =========================================================================
   Slide 8 — wildcard subscriptions
   ========================================================================= */

function initWildcards() {
  const input = $('#w-filter');
  const err = $('#w-error');
  const chips = $('#w-chips');
  const feed = $('#w-feed');
  const viz = $('#w-viz');
  let unsub = null;
  let buffer = [];
  let windowCount = 0;

  function presets(m) {
    const l = m.lines[0];
    const pt = (k, fb) => (m.pts.includes(k) ? m.machines[0].points[k].split('/').pop() : fb);
    return [
      `${m.ent}/${l.site}/${l.area}/#`,
      `${m.ent}/+/+/+/+/state`,
      `${m.ent}/+/+/${l.line}/+/${pt('temperature', m.machines[0].points[m.pts[0]].split('/').pop())}`,
      `${m.ent}/+/+/+/+/alarm`,
      `${m.ent}/+/+/+/kpi/#`,
      `${m.ent}/#`,
    ];
  }

  function set(filter) {
    input.value = filter;
    const e = filterError(filter);
    input.classList.toggle('invalid', !!e);
    err.textContent = e || '';
    unsub?.();
    unsub = null;
    buffer = [];
    feed.innerHTML = '';
    viz.innerHTML = '';
    if (e) {
      $('#w-match').textContent = '—';
      return;
    }
    viz.appendChild(topicChips(filter));
    unsub = broker.subscribe(filter, (msg) => {
      windowCount++;
      buffer.push(msg);
      if (buffer.length > 40) buffer.splice(0, buffer.length - 40);
    }, { replay: true });
    updateMatch();
  }

  function updateMatch() {
    if (filterError(input.value)) return;
    let n = 0;
    for (const t of broker.retained.keys()) if (matches(input.value, t)) n++;
    $('#w-match').textContent = `${n.toLocaleString('en-GB')} of ${broker.retained.size.toLocaleString('en-GB')}`;
  }

  hub.addEventListener('loaded', (e) => {
    chips.innerHTML = '';
    const ps = presets(e.detail);
    for (const p of ps) {
      const b = h('button', 'btn small mono', p);
      b.addEventListener('click', () => set(p));
      chips.appendChild(b);
    }
    set(ps[0]);
  });

  let t;
  input.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => set(input.value.trim()), 250);
  });

  setInterval(() => {
    if (!visible('s-wildcards') || !buffer.length) return;
    const batch = buffer.splice(0).slice(-10);
    for (const msg of batch) {
      const row = h('div', 'feed-row');
      row.append(
        h('span', 't', clock()),
        h('span', 'tp', msg.topic),
        h('span', `v ${valueClass(msg.topic, msg.payload)}`, fmtValue(msg.payload)),
      );
      feed.prepend(row);
    }
    while (feed.children.length > 18) feed.lastChild.remove();
  }, 200);

  setInterval(() => {
    $('#w-rate').textContent = windowCount;
    windowCount = 0;
    if (visible('s-wildcards')) updateMatch();
  }, 1000);
}

/* =========================================================================
   Slide 9 — one event, many consumers
   ========================================================================= */

function initConsumers() {
  const prodBox = $('#c-producers');
  const andon = $('#c-andon');
  const avail = $('#c-avail');
  const agent = $('#c-agent');
  const energyPanel = $('#c-energy');
  const plugBtn = $('#c-plug');
  const hubBox = $('#c-hub');
  const counts = { andon: 0, avail: 0, agent: 0, energy: 0 };
  let unsubs = [];
  let energyUnsub = null;
  const alarms = new Map();
  const availVals = new Map();
  const power = new Map();
  const spark = [];
  const tiles = new Map();
  let woSeq = 24100 + Math.floor(Math.random() * 800);

  const bump = (k) => {
    counts[k]++;
    const el = $(`#c-n-${k}`);
    if (el) el.textContent = counts[k];
  };

  function flashHub() {
    hubBox.classList.remove('pulse');
    void hubBox.offsetWidth;
    hubBox.classList.add('pulse');
  }

  /* Producers */
  function buildProducers(m) {
    prodBox.innerHTML = '';
    tiles.clear();
    for (const mc of m.machines.slice(0, 8)) {
      const tile = h('div', 'prod-tile');
      const top = h('div', 'prod-top');
      top.append(h('b', 'mono', mc.name), h('span', 'prod-line mono', `${mc.area}/${mc.line}`));
      const st = h('div', 'prod-state', '…');
      const btn = h('button', 'btn small danger', 'Inject fault');
      btn.addEventListener('click', () => {
        if (sim.isDown(mc.id)) sim.repair(mc.id);
        else {
          sim.fault(mc.id);
          flashHub();
        }
      });
      tile.append(top, st, btn);
      prodBox.appendChild(tile);
      tiles.set(mc.id, { tile, st, btn });
    }
  }

  function paintTile(id, state) {
    const t = tiles.get(id);
    if (!t) return;
    t.st.textContent = state;
    t.st.className = `prod-state st-${state}`;
    t.tile.classList.toggle('down', state === 'DOWN');
    t.btn.textContent = state === 'DOWN' ? 'Reset' : 'Inject fault';
  }

  /* Consumers */
  function renderAndon() {
    andon.innerHTML = '';
    if (!alarms.size) {
      andon.appendChild(h('div', 'all-clear', '✓ All clear'));
      return;
    }
    for (const [topic, p] of alarms) {
      const row = h('div', 'alarm-row');
      const parts = topic.split('/');
      row.append(h('b', 'mono', parts[4]), h('span', 'mono', p.value), h('span', 'muted', `${parts[2]}/${parts[3]}`));
      andon.appendChild(row);
    }
  }

  function renderAvail() {
    avail.innerHTML = '';
    if (!model.pts.includes('state')) {
      avail.appendChild(h('div', 'muted small-note', 'Enable the “State” data point in the generator to feed this service.'));
      return;
    }
    for (const l of model.lines.slice(0, 4)) {
      const v = availVals.get(l.base);
      const row = h('div', 'bar-row');
      const track = h('div', 'bar-track');
      const fill = h('div', 'bar-fill');
      fill.style.width = `${v ?? 0}%`;
      if (v != null && v < 80) fill.classList.add('low');
      track.appendChild(fill);
      row.append(h('span', 'mono bar-label', l.label), track, h('b', 'bar-val', v == null ? '…' : `${v}%`));
      avail.appendChild(row);
    }
  }

  function agentCard(topic, payload) {
    const base = topic.slice(0, -'/alarm'.length);
    const mc = model.machines.find((x) => x.base === base);
    if (!mc) return;
    const ctx = [];
    for (const k of ['temperature', 'vibration', 'state']) {
      const tp = mc.points[k];
      const r = tp && broker.retained.get(tp);
      if (r) ctx.push(`${tp.split('/').pop()} ${fmtValue(r.payload)}`);
    }
    const card = h('div', 'agent-card');
    card.dataset.base = base;
    const head = h('div', 'agent-head');
    head.append(h('b', null, `${payload.value}`), h('span', 'mono muted', ` on ${mc.area}/${mc.line}/${mc.name}`));
    const body = h('div', 'agent-body');
    body.append(
      h('div', null, `Context read from the UNS: ${ctx.join(' · ') || 'no extra data points'}.`),
      h('div', null, 'Proposed: create a maintenance work order and dispatch a technician.'),
    );
    const actions = h('div', 'agent-actions');
    const status = h('span', 'agent-status', 'Awaiting human approval');
    const approve = h('button', 'btn small primary', 'Approve');
    const dismiss = h('button', 'btn small', 'Dismiss');
    approve.addEventListener('click', () => {
      const wo = `WO-${++woSeq}`;
      approve.remove();
      dismiss.remove();
      status.textContent = `Approved · ${wo} created · technician on the way…`;
      status.className = 'agent-status ok';
      setTimeout(() => sim.repair(mc.id), 3000);
    });
    dismiss.addEventListener('click', () => card.remove());
    actions.append(status, approve, dismiss);
    card.append(head, body, actions);
    agent.prepend(card);
    while (agent.children.length > 2) agent.lastChild.remove();
    agent.querySelector('.agent-idle')?.remove();
  }

  function agentResolved(topic) {
    const base = topic.slice(0, -'/alarm'.length);
    const card = agent.querySelector(`.agent-card[data-base="${CSS.escape(base)}"]`);
    if (!card) return;
    const st = card.querySelector('.agent-status');
    st.textContent = 'Resolved · machine back to RUNNING';
    st.className = 'agent-status ok';
    card.querySelectorAll('button').forEach((b) => b.remove());
    setTimeout(() => {
      card.remove();
      if (!agent.children.length) agent.appendChild(h('div', 'agent-idle muted', 'Listening for alarms…'));
    }, 5000);
  }

  function attach(m) {
    unsubs.forEach((u) => u());
    unsubs = [];
    alarms.clear();
    availVals.clear();
    Object.keys(counts).forEach((k) => {
      counts[k] = 0;
      const el = $(`#c-n-${k}`);
      if (el) el.textContent = '0';
    });
    agent.innerHTML = '';
    agent.appendChild(h('div', 'agent-idle muted', 'Listening for alarms…'));
    buildProducers(m);

    const fAlarm = `${m.ent}/+/+/+/+/alarm`;
    const fKpi = `${m.ent}/+/+/+/kpi/availability`;
    $('#c-f-andon').textContent = fAlarm;
    $('#c-f-avail').textContent = `${m.ent}/+/+/+/+/state`;
    $('#c-f-agent').textContent = fAlarm;
    $('#c-f-energy').textContent = `${m.ent}/+/+/+/+/power`;

    // Producer tiles watch their own state.
    unsubs.push(broker.subscribe(`${m.ent}/+/+/+/+/state`, (msg) => {
      paintTile(msg.topic.slice(0, msg.topic.lastIndexOf('/')), msg.payload.value);
    }));
    // Andon board
    unsubs.push(broker.subscribe(fAlarm, (msg) => {
      bump('andon');
      if (msg.payload.value === 'CLEARED') alarms.delete(msg.topic);
      else alarms.set(msg.topic, msg.payload);
      renderAndon();
    }));
    // Availability panel shows what the availability service publishes back.
    unsubs.push(broker.subscribe(`${m.ent}/+/+/+/+/state`, () => bump('avail')));
    unsubs.push(broker.subscribe(fKpi, (msg) => {
      availVals.set(msg.topic.split('/').slice(0, 4).join('/'), msg.payload.value);
      if (visible('s-consumers')) renderAvail();
    }));
    // Maintenance agent
    unsubs.push(broker.subscribe(fAlarm, (msg) => {
      bump('agent');
      if (msg.payload.value === 'CLEARED') agentResolved(msg.topic);
      else agentCard(msg.topic, msg.payload);
    }));
    renderAndon();
    renderAvail();
    if (energyUnsub) plugEnergy(true);
  }

  /* Energy monitor — plugged in at runtime */
  function plugEnergy(on) {
    energyUnsub?.();
    energyUnsub = null;
    power.clear();
    spark.length = 0;
    energyPanel.hidden = !on;
    plugBtn.hidden = on;
    if (!on) return;
    if (!model.pts.includes('power')) {
      $('#c-energy-total').textContent = '—';
      $('#c-energy-note').textContent = 'Enable “Power” in the generator to see values.';
    } else {
      $('#c-energy-note').textContent = 'Added at runtime · changes to producers: 0';
    }
    energyUnsub = broker.subscribe(`${model.ent}/+/+/+/+/power`, (msg) => {
      bump('energy');
      power.set(msg.topic, msg.payload.value);
    }, { replay: true });
  }

  plugBtn.addEventListener('click', () => {
    plugEnergy(true);
    toast('New consumer subscribed — no producer was touched');
  });
  $('#c-unplug').addEventListener('click', () => plugEnergy(false));

  setInterval(() => {
    if (!energyUnsub || !model?.pts.includes('power')) return;
    let total = 0;
    for (const v of power.values()) total += v;
    spark.push(total);
    if (spark.length > 60) spark.shift();
    if (!visible('s-consumers')) return;
    $('#c-energy-total').textContent = `${round(total, 1).toLocaleString('en-GB')} kW`;
    const svg = $('#c-spark');
    const w = 300;
    const hgt = 60;
    const lo = Math.min(...spark);
    const hi = Math.max(...spark);
    const pts = spark.map((v, i) => `${(i / 59) * w},${hgt - ((v - lo) / (hi - lo || 1)) * (hgt - 6) - 3}`).join(' ');
    svg.innerHTML = `<polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" />`;
  }, 1000);

  setInterval(() => {
    if (!visible('s-consumers')) return;
    $('#c-rate').textContent = broker.rate;
    renderAvail();
  }, 1000);

  hub.addEventListener('model', (e) => attach(e.detail));
}

/* =========================================================================
   Boot
   ========================================================================= */

initTitleLive();
initSpaghetti();
initWildcards();
initConsumers();
initGenerator(); // last: applies the default config, which the others listen for
