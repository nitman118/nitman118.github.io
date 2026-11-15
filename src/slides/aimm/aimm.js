// Interactive pieces for the AIMM whitepaper deck. Content follows the paper:
// "The AIMM Framework for Manufacturing Intelligence" (AIMM whitepaper,
// November 2026, DOI 10.5281/zenodo.24160166).

import { currentSlideId } from '../shared/deck.js';

const $ = (sel, root = document) => root.querySelector(sel);
function h(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
const NS = 'http://www.w3.org/2000/svg';
function sv(tag, attrs = {}, text) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  return e;
}

/* =========================================================================
   Four logical layers (Figure 1)
   ========================================================================= */

const LAYERS = [
  {
    id: 'op', name: 'Operator', tag: 'People and agents', sub: 'Role, judgement, and competence',
    body: 'The human and agentic operators participating in the service. Each operator has a defined role, competence requirement and authority. Sharing this layer does not imply equal authority.',
    examples: ['A production engineer reviews findings and authorizes corrections', 'A technician performs inspections, repairs and trial runs', 'An agent investigates losses within its assigned authority'],
    gap: 'Evidence is available but still interpreted poorly: the agent’s competence, its instructions, or the division of work.',
  },
  {
    id: 'int', name: 'Interaction', tag: 'Manufacturing services', sub: 'Task information, functions, and checks',
    body: 'Provides the manufacturing service through which operators perform defined tasks: the relevant information and software functions, connected to the factory’s procedures and permissions.',
    examples: ['OEE, maintenance, scheduling, quality and energy services', 'Operational, Simulation and Synthetic Data modes', 'Permissions, evidence checks and approvals as guardrails'],
    gap: 'Records are available and well explained, but the service cannot filter and assemble them for the task.',
  },
  {
    id: 'dig', name: 'Digitization', tag: 'Reusable factory information', sub: 'Definitions, linked evidence, and change history',
    body: 'Brings together operational records and the definitions and relationships needed to interpret them, with their sources, time periods and limitations.',
    examples: ['Current context from a UNS, history from historians', 'Asset Administration Shell submodels for equipment', 'A knowledge graph of reviewed experience; owned data products'],
    gap: 'Records do not provide both the data from the factory and an explanation of what it means.',
  },
  {
    id: 'cp', name: 'Cyber-Physical', tag: 'Factory equipment and processes', sub: 'Observations, interventions, and production results',
    body: 'The equipment and production processes relevant to the service: where events occur, measurements originate, and production changes take effect.',
    examples: ['Machines from different OEMs that report differently', 'Sensors, cameras and inspection stations', 'Physical work done by people or automation'],
    gap: 'The physical properties the work needs cannot be measured or inspected in the factory.',
  },
];

function layerStack(box, { onPick, compact = false } = {}) {
  const els = new Map();
  for (const L of LAYERS) {
    const b = h('button', `layer l-${L.id}`);
    b.type = 'button';
    b.append(h('span', 'ln', L.name));
    const lb = h('div', 'lb');
    lb.append(h('b', null, L.tag));
    if (!compact) lb.append(h('span', null, L.sub));
    b.append(lb);
    if (onPick) b.addEventListener('click', () => onPick(L.id));
    box.appendChild(b);
    els.set(L.id, b);
  }
  return els;
}

function initLayers() {
  const box = $('#ly-stack');
  const detail = $('#ly-detail');
  if (!box) return;
  const els = layerStack(box, { onPick: show });
  function show(id) {
    const L = LAYERS.find((x) => x.id === id);
    els.forEach((el, k) => el.classList.toggle('on', k === id));
    detail.innerHTML = '';
    detail.append(h('div', 'tag', `${L.name} layer`), h('h3', null, L.tag), h('p', null, L.body));
    const ul = h('ul');
    L.examples.forEach((x) => ul.appendChild(h('li', null, x)));
    const gap = h('div', 'gap');
    gap.append(h('b', null, 'The constraint lies here when: '), document.createTextNode(L.gap));
    detail.append(ul, gap);
  }
  show('dig');
}

/* =========================================================================
   Where does the constraint lie? (Section 2.2)
   ========================================================================= */

const DIAG = [
  { id: 'cp', q: 'Can the physical properties the work needs be measured or inspected in the factory?' },
  { id: 'dig', q: 'Do the records provide both the data and an explanation of what it means?' },
  { id: 'int', q: 'Can the service filter and assemble that evidence for the assigned task?' },
  { id: 'op', q: 'Is the evidence interpreted well by the operator doing the work?' },
];

function initDiag() {
  const qBox = $('#dg-q');
  const stack = $('#dg-stack');
  const out = $('#dg-out');
  if (!qBox) return;
  const ans = { cp: true, dig: true, int: true, op: true };
  const lay = layerStack(stack, { compact: true });
  const rows = new Map();
  DIAG.forEach((d, i) => {
    const r = h('div', 'dq');
    const n = h('span', 'n', String(i + 1));
    n.style.background = `var(--aimm-${{ cp: 'blue', dig: 'sage', int: 'peach', op: 'rose' }[d.id]})`;
    const p = h('p', null, d.q);
    p.append(h('small', null, `${LAYERS.find((x) => x.id === d.id).name} layer`));
    const seg = h('div', 'seg-control');
    const yes = h('button', 'on', 'Yes');
    const no = h('button', null, 'No');
    yes.type = no.type = 'button';
    yes.addEventListener('click', () => { ans[d.id] = true; render(); });
    no.addEventListener('click', () => { ans[d.id] = false; render(); });
    seg.append(yes, no);
    r.append(n, p, seg);
    qBox.appendChild(r);
    rows.set(d.id, { r, yes, no });
  });
  function render() {
    const first = DIAG.find((d) => !ans[d.id]);
    let past = false;
    DIAG.forEach((d) => {
      const { r, yes, no } = rows.get(d.id);
      yes.classList.toggle('on', ans[d.id]);
      no.classList.toggle('on', !ans[d.id]);
      r.classList.toggle('skip', past);
      if (first && d.id === first.id) past = true;
    });
    lay.forEach((el, k) => {
      el.classList.toggle('on', first ? k === first.id : false);
      el.classList.toggle('dim', first ? k !== first.id : false);
    });
    out.innerHTML = '';
    if (first) {
      const L = LAYERS.find((x) => x.id === first.id);
      out.append(h('b', null, `Start in the ${L.name} layer`), document.createTextNode(L.gap));
    } else {
      out.append(h('b', null, 'Extend the agent’s role, step by step'), document.createTextNode('The capabilities are in place for this work. Give the agent more responsibility incrementally; investment follows the requirements of the work.'));
    }
  }
  render();
}

/* =========================================================================
   Packaging line: does a buffer absorb the stop? (Section 4.2, Figure 2)
   Illustrative rates: infeed 66/min, fill-and-seal 60/min (bottleneck),
   inspection 66/min.
   ========================================================================= */

const RATE = { in: 66, fs: 60, insp: 66 };
const T = 60;
const STOP_AT = 5;

function simulate({ where, dur, cap }) {
  let b1 = cap;
  let b2 = 0;
  let out = 0;
  const series = [];
  for (let t = 0; t < T; t++) {
    const stopped = t >= STOP_AT && t < STOP_AT + dur;
    const inspUp = !(stopped && where === 'insp');
    const fsUp = !(stopped && where === 'fs');
    const inUp = !(stopped && where === 'in');
    const inspOut = inspUp ? Math.min(RATE.insp, b2) : 0;
    b2 -= inspOut;
    const fsOut = fsUp ? Math.min(RATE.fs, b1, cap - b2) : 0;
    b1 -= fsOut;
    b2 += fsOut;
    const inOut = inUp ? Math.min(RATE.in, cap - b1) : 0;
    b1 += inOut;
    out += inspOut;
    series.push({ t, b1, b2, out, fsOut, inspOut, inUp, fsUp, inspUp });
  }
  return series;
}

function initLine() {
  const svg = $('#pl-svg');
  const chart = $('#pl-chart');
  if (!svg) return;
  const durEl = $('#pl-dur');
  const capEl = $('#pl-cap');
  const whereBtns = [...document.querySelectorAll('#pl-where button')];
  let where = 'in';

  // Schematic
  const defs = sv('defs');
  const mk = sv('marker', { id: 'pl-ah', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' });
  mk.appendChild(sv('path', { d: 'M0,0 L10,5 L0,10 z', fill: 'currentColor' }));
  defs.appendChild(mk);
  svg.appendChild(defs);
  const st = {};
  const bufs = {};
  const station = (id, x, title, sub) => {
    const g = sv('g', { class: 'pl-st' });
    g.appendChild(sv('rect', { x, y: 40, width: 190, height: 96, fill: 'var(--aimm-peach)' }));
    g.appendChild(sv('text', { x: x + 95, y: 80 }, title));
    g.appendChild(sv('text', { x: x + 95, y: 102, class: 'sub' }, sub));
    const s = sv('text', { x: x + 95, y: 124, class: 'pl-state' }, 'RUNNING');
    g.appendChild(s);
    svg.appendChild(g);
    st[id] = { rect: g.firstChild, s };
  };
  const buffer = (id, x, label) => {
    const g = sv('g', { class: 'pl-buf' });
    g.appendChild(sv('rect', { x, y: 50, width: 80, height: 76, rx: 10, class: 'box' }));
    const lvl = sv('rect', { x: x + 8, y: 118, width: 64, height: 0, rx: 4, class: 'lvl' });
    g.appendChild(lvl);
    g.appendChild(sv('text', { x: x + 40, y: 150, class: 'sub' }, label));
    svg.appendChild(g);
    bufs[id] = lvl;
  };
  station('in', 10, 'Infeed', 'Feeds product');
  buffer('b1', 240, 'Buffer 1');
  station('fs', 360, 'Fill-and-seal', 'Bottleneck');
  buffer('b2', 590, 'Buffer 2');
  station('insp', 710, 'Inspection', 'Counts output');
  [[200, 236], [320, 356], [550, 586], [670, 706]].forEach(([a, b]) => svg.appendChild(sv('line', { x1: a, y1: 88, x2: b, y2: 88, class: 'pl-arrow', style: 'color: var(--text)' })));

  let series = [];
  let tCursor = T - 1;
  let anim = null;

  function paint(t) {
    const p = series[t];
    const cap = +capEl.value;
    for (const [id, el] of Object.entries(bufs)) {
      const v = id === 'b1' ? p.b1 : p.b2;
      const hgt = cap ? (v / cap) * 60 : 0;
      el.setAttribute('height', hgt);
      el.setAttribute('y', 118 - hgt);
    }
    const state = (id) => {
      if (!p[`${id}Up`]) return ['STOPPED', 'var(--aimm-rose)', 'var(--aimm-burgundy)'];
      if (id === 'fs' && p.fsOut === 0) return [p.b1 === 0 ? 'STARVED' : 'BLOCKED', 'var(--aimm-grey)', 'var(--muted)'];
      if (id === 'insp' && p.inspOut === 0 && t > 0) return ['STARVED', 'var(--aimm-grey)', 'var(--muted)'];
      if (id === 'in' && t > 0 && p.b1 >= cap && series[t - 1].b1 >= cap) return ['RUNNING', 'var(--aimm-peach)', 'var(--text-2)'];
      return ['RUNNING', 'var(--aimm-peach)', 'var(--text-2)'];
    };
    for (const id of ['in', 'fs', 'insp']) {
      const [label, fill, color] = state(id);
      st[id].s.textContent = label;
      st[id].s.setAttribute('fill', color);
      st[id].rect.setAttribute('fill', fill);
    }
    const cur = chart.querySelector('.cursor');
    if (cur) {
      const x = 50 + (t / (T - 1)) * 640;
      cur.setAttribute('x1', x);
      cur.setAttribute('x2', x);
    }
  }

  function drawChart() {
    chart.innerHTML = '';
    const cap = +capEl.value;
    const dur = +durEl.value;
    const W = 640;
    const H = 150;
    const x = (t) => 50 + (t / (T - 1)) * W;
    const y = (v) => 20 + H - (cap ? v / cap : 0) * H;
    chart.appendChild(sv('rect', { x: x(STOP_AT), y: 20, width: Math.max(0, x(Math.min(T - 1, STOP_AT + dur)) - x(STOP_AT)), height: H, class: 'stop' }));
    chart.appendChild(sv('line', { x1: 50, x2: 50 + W, y1: 20 + H, y2: 20 + H, class: 'ax' }));
    const line = (key, cls) => chart.appendChild(sv('polyline', { points: series.map((p) => `${x(p.t)},${y(p[key])}`).join(' '), class: cls }));
    line('b1', 'b1');
    line('b2', 'b2');
    chart.appendChild(sv('text', { x: 50, y: 14 }, 'Buffer level'));
    chart.appendChild(sv('text', { x: 50 + W, y: 14, 'text-anchor': 'end' }, `${where === 'in' ? 'Infeed' : where === 'fs' ? 'Fill-and-seal' : 'Inspection'} stopped (shaded)`));
    chart.appendChild(sv('text', { x: 50, y: 20 + H + 18 }, '0 min'));
    chart.appendChild(sv('text', { x: 50 + W, y: 20 + H + 18, 'text-anchor': 'end' }, '60 min'));
    const lg = sv('text', { x: 50 + W / 2, y: 20 + H + 18, 'text-anchor': 'middle' });
    lg.innerHTML = '<tspan fill="var(--aimm-hist)">━ buffer 1</tspan>   <tspan fill="var(--aimm-orange)">━ buffer 2</tspan>';
    chart.appendChild(lg);
    chart.appendChild(sv('line', { x1: x(tCursor), x2: x(tCursor), y1: 18, y2: 20 + H, class: 'cursor' }));
  }

  function update() {
    const dur = +durEl.value;
    const cap = +capEl.value;
    $('#pl-dur-v').textContent = `${dur} min`;
    $('#pl-cap-v').textContent = `${cap} units · ${Math.round(cap / RATE.fs)} min of supply`;
    series = simulate({ where, dur, cap });
    // Line output is set by the bottleneck: count the minutes fill-and-seal could not run.
    const lost = series.reduce((a, q) => a + (RATE.fs - q.fsOut), 0);
    const lostMin = Math.max(0, Math.round(lost / RATE.fs));
    const name = { in: 'infeed', fs: 'fill-and-seal', insp: 'inspection' }[where];
    const res = $('#pl-res');
    res.innerHTML = '';
    const big = h('b', 'loss', lostMin ? `${lostMin} min of line output lost` : 'No line output lost');
    const why = lostMin === 0
      ? `The buffer absorbed the ${dur}-minute ${name} stop.`
      : where === 'fs'
        ? 'Fill-and-seal is the bottleneck: every minute it stops is lost, whatever the buffers hold.'
        : `The buffer covered ${Math.round(cap / RATE.fs)} minutes; after that the line was ${where === 'in' ? 'starved' : 'blocked'}.`;
    res.append(big, document.createTextNode(why));
    tCursor = T - 1;
    drawChart();
    paint(tCursor);
  }

  function play() {
    clearInterval(anim);
    tCursor = 0;
    anim = setInterval(() => {
      if (currentSlideId() !== 'a-line') return;
      paint(tCursor);
      const c = chart.querySelector('.cursor');
      if (c) {
        const x = 50 + (tCursor / (T - 1)) * 640;
        c.setAttribute('x1', x);
        c.setAttribute('x2', x);
      }
      if (++tCursor >= T) {
        tCursor = T - 1;
        clearInterval(anim);
      }
    }, 90);
  }

  durEl.addEventListener('input', update);
  capEl.addEventListener('input', update);
  whereBtns.forEach((b) => b.addEventListener('click', () => {
    where = b.dataset.where;
    whereBtns.forEach((x) => x.classList.toggle('on', x === b));
    update();
  }));
  $('#pl-play').addEventListener('click', play);
  update();
  document.addEventListener('slidechange', (e) => { if (e.detail.id === 'a-line') play(); });
}

/* =========================================================================
   The agent-supported OEE investigation (Chapter 8, Figure 8)
   Rate: Best Proven Rate implied by the paper's 24,900 units in 415 min = 60/min.
   ========================================================================= */

const BPR = 60;
const STEPS = [
  {
    title: 'The initial report', short: 'Initial report: 89.7%',
    actors: ['agent', 'svc'],
    text: 'The OEE service reports 89.7% for the packaging line. The Digitization Layer connects the calculation inputs to the production schedule and site definitions for the same line, order and shift, so the agent can check them.',
    m: { plan: 442, op: 415, total: 24500, good: 23800 },
  },
  {
    title: 'An excluded changeover', short: 'Excluded changeover',
    actors: ['agent', 'eng', 'svc'],
    text: 'Comparing records, the agent finds an eight-minute changeover incorrectly excluded from planned production time. The service updates the interval to 450 minutes and recalculates, retaining the earlier value, the reason and the approval. The headline report alone would not have exposed it.',
    approval: 'Production engineer verifies and authorizes the correction',
    m: { plan: 450, op: 415, total: 24500, good: 23800 },
  },
  {
    title: 'Tracing the line losses', short: 'Infeed stop & repair',
    actors: ['agent', 'tech'],
    text: 'The agent examines a nineteen-minute infeed stop, a reduced running rate and more first-pass defects after a material change. Event times and buffer records show the infeed stop emptied the first buffer, starving fill-and-seal and then inspection. The technician replaces a leaking pneumatic actuator seal. The quality loss remains unexplained.',
    m: { plan: 450, op: 415, total: 24500, good: 23800 },
  },
  {
    title: 'Resuming days later', short: 'Resuming the task',
    actors: ['svc', 'agent', 'tech'],
    text: 'The product is not made again for several days. The service keeps the repair evidence, unresolved questions and next checks across agent sessions. When production resumes, the infeed fault has not recurred, but first-pass defects remain high and the line appears to run below Best Proven Rate.',
    m: { plan: 450, op: 415, total: 24500, good: 23800 },
  },
  {
    title: 'A reporting change', short: 'MES interface change',
    actors: ['agent', 'eng'],
    text: 'The agent finds an MES interface change: brief interruptions are no longer published, and historian records show five stopped minutes counted as operating time. After the correction, Availability falls and Performance rises — headline OEE is unchanged, but the losses are now allocated correctly.',
    approval: 'Production engineer verifies and authorizes the correction',
    m: { plan: 450, op: 410, total: 24500, good: 23800 },
  },
  {
    title: 'Planning a material trial', short: 'Material trial planned',
    actors: ['agent', 'eng', 'tech'],
    text: 'The agent proposes short suspect–reference–suspect stock runs under the same recipe, setup and conditioning. During the pre-trial check the technician reports a sealing adjustment that was not yet recorded; the service records it and the trial is deferred until the setup is confirmed and temperature is stable.',
    approval: 'Engineer approves sampling, criteria, material use, downtime and restoration — approval precedes execution, but does not prove conditions still hold',
    m: { plan: 450, op: 410, total: 24500, good: 23800 },
  },
  {
    title: 'Result and lessons', short: 'Result & lessons',
    actors: ['tech', 'eng', 'agent'],
    text: 'Both suspect-stock runs show elevated defects; reference stock meets the quality criteria at Best Proven Rate. That supports a material-related effect under the tested conditions. The finding enters the knowledge graph with its evidence, and “check for reporting changes before comparing runs” becomes a candidate instruction for the agent, subject to evaluation.',
    approval: 'Engineer authorizes containment pending further assessment',
    m: { plan: 450, op: 410, total: 24500, good: 23800 },
  },
];
const ACTOR = {
  agent: ['a-agent', 'Agentic operator'],
  eng: ['a-eng', 'Production engineer'],
  tech: ['a-tech', 'Technician'],
  svc: ['a-svc', 'OEE service'],
};

function oee(m) {
  const A = m.op / m.plan;
  const P = m.total / (m.op * BPR);
  const Q = m.good / m.total;
  return { A, P, Q, O: A * P * Q };
}
const pct = (v) => `${(Math.round(v * 1000) / 10).toFixed(1)}%`;

function initOee() {
  const list = $('#oe-steps');
  if (!list) return;
  let cur = 0;
  const btns = STEPS.map((s, i) => {
    const b = h('button', 'step-btn');
    b.type = 'button';
    b.append(h('i', null, String(i + 1)), h('span', null, s.short));
    b.addEventListener('click', () => show(i));
    list.appendChild(b);
    return b;
  });
  $('#oe-prev').addEventListener('click', () => show(Math.max(0, cur - 1)));
  $('#oe-next').addEventListener('click', () => show(Math.min(STEPS.length - 1, cur + 1)));

  function show(i) {
    const prev = oee(STEPS[cur].m);
    cur = i;
    const s = STEPS[i];
    btns.forEach((b, k) => {
      b.classList.toggle('on', k === i);
      b.classList.toggle('done', k < i);
    });
    $('#oe-title').textContent = s.title;
    $('#oe-text').textContent = s.text;
    const actors = $('#oe-actors');
    actors.innerHTML = '';
    s.actors.forEach((a) => actors.appendChild(h('span', `actor ${ACTOR[a][0]}`, ACTOR[a][1])));
    const ap = $('#oe-approval');
    ap.hidden = !s.approval;
    ap.textContent = s.approval ? `✓ ${s.approval}` : '';
    const v = oee(s.m);
    $('#oe-oee').textContent = pct(v.O);
    const set = (id, val, calc, changed) => {
      const el = $(`#oe-${id}`);
      el.querySelector('b').textContent = pct(val);
      el.querySelector('.calc').textContent = calc;
      el.classList.toggle('changed', changed);
    };
    const n = (x) => x.toLocaleString('en-GB');
    set('a', v.A, `${s.m.op} min / ${s.m.plan} min`, Math.abs(v.A - prev.A) > 1e-9);
    set('p', v.P, `${n(s.m.total)} / ${n(s.m.op * BPR)}`, Math.abs(v.P - prev.P) > 1e-9);
    set('q', v.Q, `${n(s.m.good)} / ${n(s.m.total)}`, Math.abs(v.Q - prev.Q) > 1e-9);
    $('#oe-prev').disabled = i === 0;
    $('#oe-next').disabled = i === STEPS.length - 1;
  }
  show(0);
}

initLayers();
initDiag();
initLine();
initOee();
