// Data intelligence platform demo — runs entirely in the browser.
// A simulated AIMM Precision machining department (two 5-axis machining
// centres with modern controllers, one legacy lathe behind an edge gateway)
// and an ERP that books hours per order. Raw records land in bronze, are
// cleaned and checked against a data contract into silver, and aggregated
// into gold tables that feed BI, a semantic layer and "ask your data".

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
function sv(tag, attrs = {}) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}
const visible = (id) => currentSlideId() === id;
const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
const pad = (n, w = 2) => String(n).padStart(w, '0');

function mulberry32(seed) {
  return function rnd() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gaussFrom(rnd) {
  let u = 0;
  while (u === 0) u = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
}
const gauss = () => gaussFrom(Math.random);

const TZ_OFFSET_H = 1; // Europe/Amsterdam in November (CET, UTC+1)
const isoUtc = (d) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');
function localStr(d) {
  const l = new Date(d.getTime() + TZ_OFFSET_H * 3600e3);
  return `${l.getUTCFullYear()}-${pad(l.getUTCMonth() + 1)}-${pad(l.getUTCDate())} ${pad(l.getUTCHours())}:${pad(l.getUTCMinutes())}:${pad(l.getUTCSeconds())}`;
}
function erpStr(d) {
  const l = new Date(d.getTime() + TZ_OFFSET_H * 3600e3);
  return `${pad(l.getUTCDate())}-${pad(l.getUTCMonth() + 1)} ${pad(l.getUTCHours())}:${pad(l.getUTCMinutes())}`;
}
const hhmm = (d) => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;

/* =========================================================================
   Master data (routing, machines) — high-mix, low-volume precision parts
   ========================================================================= */

const ITEMS = [
  { item: '30-1142-07', desc: 'Housing, vacuum chamber', mat: 'AlMg3', cust: 'Semicon OEM', wc: 'WC-5AX', prog: 'O4711_HSG_OP20', setup: 90, run: 38, bRun: 1.17, bSetup: 1.24, scrap: 0.03 },
  { item: '41-0088-02', desc: 'Bracket, gantry', mat: 'Ti6Al4V', cust: 'Medical systems', wc: 'WC-5AX', prog: 'O4802_BRK_OP20', setup: 75, run: 52, bRun: 1.27, bSetup: 1.12, scrap: 0.06 },
  { item: '30-0975-03', desc: 'Frame, wafer stage', mat: 'Invar 36', cust: 'Semicon OEM', wc: 'WC-5AX', prog: 'O4650_FRM_OP20', setup: 120, run: 95, bRun: 1.34, bSetup: 1.3, scrap: 0.07 },
  { item: '44-1302-05', desc: 'Cover, cleanroom', mat: 'Al6082', cust: 'Analytical instruments', wc: 'WC-5AX', prog: 'O4921_COV_OP20', setup: 45, run: 22, bRun: 0.95, bSetup: 0.92, scrap: 0.02 },
  { item: '61-0410-01', desc: 'Shaft, precision', mat: '42CrMo4', cust: 'Analytical instruments', wc: 'WC-TRN', prog: 'O5120', setup: 40, run: 18, bRun: 1.04, bSetup: 1.16, scrap: 0.02 },
  { item: '52-2210-11', desc: 'Manifold, cooling', mat: 'SS316L', cust: 'Semicon OEM', wc: 'WC-TRN', prog: 'O5188', setup: 55, run: 31, bRun: 1.11, bSetup: 0.96, scrap: 0.04 },
  { item: '61-0533-02', desc: 'Sleeve, spindle', mat: '1.4305', cust: 'Medical systems', wc: 'WC-TRN', prog: 'O5207', setup: 35, run: 14, bRun: 0.98, bSetup: 1.02, scrap: 0.02 },
];
const BY_PROG = new Map(ITEMS.map((i) => [i.prog, i]));

const MACHINES = [
  { id: 'mc-01', raw: 'mc-01', wc: 'WC-5AX', kind: 'json', label: '5-axis mc-01' },
  { id: 'mc-02', raw: 'mc-02', wc: 'WC-5AX', kind: 'json', label: '5-axis mc-02' },
  { id: 'mch-07', raw: 'MCH-07', wc: 'WC-TRN', kind: 'csv', label: 'Lathe MCH-07 (legacy)' },
];
const MACH_BY_RAW = new Map(MACHINES.map((m) => [m.raw, m]));
const OPERATORS = ['OP-114', 'OP-087', 'OP-231', 'OP-142'];

/* =========================================================================
   Historical gold data (last ~13 weeks), deterministic so answers are stable
   ========================================================================= */

const HISTORY = (() => {
  const rnd = mulberry32(20261113);
  const rows = [];
  let seq = 211;
  for (let w = 33; w <= 45; w++) {
    const n = 5 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const it = ITEMS[Math.floor(rnd() * ITEMS.length)];
      const mach = it.wc === 'WC-TRN' ? 'mch-07' : rnd() < 0.5 ? 'mc-01' : 'mc-02';
      const qty = 2 + Math.floor(rnd() * 15);
      const actSetup = it.setup * it.bSetup * (1 + gaussFrom(rnd) * 0.12) * (mach === 'mc-02' ? 1.08 : 1);
      const actRun = it.run * it.bRun * (1 + gaussFrom(rnd) * 0.07) * qty;
      let scrap = 0;
      for (let q = 0; q < qty; q++) if (rnd() < it.scrap) scrap++;
      const plan = it.setup + it.run * qty;
      rows.push({
        order: `PO-26${pad(Math.floor(w / 4.4) + 1)}-0${seq++}`,
        item: it.item,
        desc: it.desc,
        mat: it.mat,
        customer: it.cust,
        machine: mach,
        week: w,
        qty,
        scrap,
        planSetup: it.setup,
        actSetup: Math.round(actSetup),
        planTotal: plan,
        actTotal: Math.round(actSetup + actRun),
        variance: (actSetup + actRun) / plan - 1,
      });
    }
  }
  return rows;
})();

/* =========================================================================
   Pipeline state
   ========================================================================= */

const RULES = { tz: true, states: true, units: true, dedupe: true, enforce: true };
const FAULTS = { unit: false, program: false, late: false };

const STATE_MAP = { ACTIVE: 'RUNNING', SETUP: 'SETUP', READY: 'IDLE', RUN: 'RUNNING', SET: 'SETUP', IDL: 'IDLE' };
const VALID_STATES = new Set(['RUNNING', 'SETUP', 'IDLE', 'DOWN']);

const CHECKS = [
  { id: 'ts', name: 'Timestamp is UTC, not in the future', table: 'silver.machine_events' },
  { id: 'state', name: 'State in {RUNNING, SETUP, IDLE, DOWN}', table: 'silver.machine_events' },
  { id: 'temp', name: 'Temperature between 5 and 80 °C', table: 'silver.machine_events' },
  { id: 'order', name: 'Every event resolves to an order', table: 'silver.machine_events' },
  { id: 'dup', name: 'No duplicate events', table: 'silver.machine_events' },
  { id: 'fresh', name: 'ERP booking within 1 h of operation end', table: 'silver.erp_bookings' },
];

const P = {
  tick: 0,
  clock: new Date(Date.UTC(2026, 10, 13, 5, 0, 0)), // 06:00 local
  bronze: [],
  silver: [],
  quarantine: [],
  counts: { bronze: 0, silver: 0, quarantine: 0, dedup: 0, erp: 0 },
  seen: new Set(),
  lastCounter: new Map(),
  orders: new Map(), // order id -> live order
  closed: [], // live closed gold rows
  checkHits: new Map(), // `${check}|${node}` -> { q: tick, pass: tick }
  temps: new Map(), // machine -> recent silver temps
  pendingErp: [],
  seq: 471,
};

const listeners = new Set();
const onTick = (fn) => listeners.add(fn);

function hit(check, node, kind) {
  const k = `${check}|${node}`;
  const v = P.checkHits.get(k) || {};
  v[kind] = P.tick;
  v.count = (v.count || 0) + 1;
  P.checkHits.set(k, v);
}

/* =========================================================================
   Factory simulator (producers)
   ========================================================================= */

const MIN_PER_TICK = 6;
const machinesState = MACHINES.map((m) => ({
  m,
  phase: 'IDLE',
  order: null,
  elapsed: 0,
  target: 0,
  counter: Math.floor(1000 + Math.random() * 800),
  temp: 40 + Math.random() * 4,
  idleTicks: 1,
}));

function newOrder(ms) {
  const options = ITEMS.filter((i) => i.wc === ms.m.wc);
  const it = options[Math.floor(Math.random() * options.length)];
  const qty = 3 + Math.floor(Math.random() * 10);
  const o = {
    order: `PO-2611-0${P.seq++}`,
    it,
    qty,
    machine: ms.m.id,
    operator: OPERATORS[Math.floor(Math.random() * OPERATORS.length)],
    start: new Date(P.clock),
    end: null,
    counted: 0,
    good: 0,
    scrap: 0,
    setupMin: 0,
    runMin: 0,
    booked: null,
    resolvedEvents: 0,
  };
  P.orders.set(o.order, o);
  return o;
}

function stepMachine(ms) {
  if (ms.phase === 'IDLE') {
    if (--ms.idleTicks <= 0) {
      ms.order = newOrder(ms);
      ms.phase = 'SETUP';
      ms.elapsed = 0;
      ms.target = ms.order.it.setup * ms.order.it.bSetup * (1 + gauss() * 0.1);
    }
  } else if (ms.phase === 'SETUP') {
    ms.elapsed += MIN_PER_TICK;
    if (ms.elapsed >= ms.target) {
      ms.phase = 'RUN';
      ms.elapsed = 0;
      ms.target = ms.order.it.run * ms.order.it.bRun * (1 + gauss() * 0.06);
    }
  } else if (ms.phase === 'RUN') {
    ms.elapsed += MIN_PER_TICK;
    if (ms.elapsed >= ms.target) {
      ms.elapsed -= ms.target;
      ms.target = ms.order.it.run * ms.order.it.bRun * (1 + gauss() * 0.06);
      ms.counter++;
      const o = ms.order;
      if (Math.random() < o.it.scrap) o.scrap++;
      else o.good++;
      if (o.good + o.scrap >= o.qty) {
        o.end = new Date(P.clock);
        const delay = FAULTS.late ? 40 + Math.floor(Math.random() * 10) : 1 + Math.floor(Math.random() * 3);
        P.pendingErp.push({ due: P.tick + delay, o });
        ms.phase = 'IDLE';
        ms.idleTicks = 1 + Math.floor(Math.random() * 2);
      }
    }
  }
  const run = ms.phase === 'RUN';
  ms.temp += ((run ? 46 : 38) - ms.temp) * 0.15 + gauss() * 0.3;
  emitMachine(ms);
}

function emitMachine(ms) {
  const prog = ms.order ? ms.order.it.prog : '';
  const stateRaw = ms.phase === 'RUN' ? 'ACTIVE' : ms.phase === 'SETUP' ? 'SETUP' : 'READY';
  if (ms.m.kind === 'json') {
    const programName = FAULTS.program && ms.m.id === 'mc-02' && ms.phase !== 'IDLE' ? '' : prog;
    const payload = {
      ts: isoUtc(P.clock),
      ExecutionState: stateRaw,
      ProgramName: programName,
      SpindleLoad: ms.phase === 'RUN' ? round(36 + gauss() * 4, 1) : 0,
      PartCounter: ms.counter,
      TempC: round(ms.temp, 1),
    };
    ingest({ source: ms.m.raw, kind: 'json', raw: JSON.stringify(payload) });
  } else {
    const st = { ACTIVE: 'RUN', SETUP: 'SET', READY: 'IDL' }[stateRaw];
    const tf = round(ms.temp * 1.8 + 32, 1);
    const temp = FAULTS.unit ? `temp=${tf}` : `temp_F=${tf}`;
    ingest({ source: ms.m.raw, kind: 'csv', raw: `${localStr(P.clock)};${ms.m.raw};${st};${prog};cnt=${ms.counter};${temp}` });
  }
}

function emitErp(o) {
  const payload = {
    ProdOrder: o.order,
    Op: 20,
    WorkCenter: o.it.wc,
    Operator: o.operator,
    Start: erpStr(o.start),
    End: erpStr(o.end),
    QtyGood: o.good,
    QtyScrap: o.scrap,
  };
  ingest({ source: 'ERP', kind: 'erp', raw: JSON.stringify(payload) });
}

/* =========================================================================
   Bronze -> silver -> gold
   ========================================================================= */

let rowId = 0;
function ingest(rec) {
  const row = { id: ++rowId, ingest: new Date(P.clock), ...rec };
  P.bronze.push(row);
  if (P.bronze.length > 60) P.bronze.shift();
  P.counts.bronze++;
  toSilver(row);
}

function parseLocal(str) {
  // "YYYY-MM-DD HH:MM:SS" in plant local time
  const [d, t] = str.split(' ');
  const [Y, M, D] = d.split('-').map(Number);
  const [hh, mm, ss] = t.split(':').map(Number);
  const asUtc = Date.UTC(Y, M - 1, D, hh, mm, ss);
  return new Date(RULES.tz ? asUtc - TZ_OFFSET_H * 3600e3 : asUtc);
}

function parseErpTime(str) {
  const [d, t] = str.split(' ');
  const [D, M] = d.split('-').map(Number);
  const [hh, mm] = t.split(':').map(Number);
  const asUtc = Date.UTC(2026, M - 1, D, hh, mm);
  return new Date(RULES.tz ? asUtc - TZ_OFFSET_H * 3600e3 : asUtc);
}

function activeOrderFor(machineId, item) {
  // MES dispatch list: the released order for this item on this machine.
  let found = null;
  for (const o of P.orders.values()) if (o.machine === machineId && o.it === item && !o.booked) found = o;
  return found;
}

function toSilver(b) {
  // Deduplicate on the raw record (a gateway resend is byte-identical).
  const key = `${b.source}|${b.raw}`;
  const isDup = P.seen.has(key);
  P.seen.add(key);
  if (P.seen.size > 4000) P.seen = new Set([...P.seen].slice(-2000));

  if (b.kind === 'erp') return erpToSilver(b, isDup);

  const m = MACH_BY_RAW.get(b.source);
  const fails = [];
  let ts;
  let stateRaw;
  let prog;
  let counter;
  let temp;
  if (b.kind === 'json') {
    const p = JSON.parse(b.raw);
    ts = new Date(p.ts);
    stateRaw = p.ExecutionState;
    prog = p.ProgramName;
    counter = p.PartCounter;
    temp = p.TempC;
  } else {
    const [lts, , st, pr, cnt, tmp] = b.raw.split(';');
    ts = parseLocal(lts);
    stateRaw = st;
    prog = pr;
    counter = Number(cnt.split('=')[1]);
    const [tk, tv] = tmp.split('=');
    temp = Number(tv);
    if (tk === 'temp_F' && RULES.units) temp = round(((temp - 32) * 5) / 9, 1);
  }
  const state = RULES.states ? STATE_MAP[stateRaw] || stateRaw : stateRaw;
  const item = BY_PROG.get(prog) || null;
  const order = item ? activeOrderFor(m.id, item) : null;

  if (isDup) {
    if (RULES.dedupe) {
      P.counts.dedup++;
      hit('dup', m.id, 'caught');
      return;
    }
    hit('dup', m.id, 'leaked');
  }
  if (ts.getTime() > b.ingest.getTime() + 5 * 60e3) fails.push('ts');
  if (!VALID_STATES.has(state)) fails.push('state');
  if (!(temp >= 5 && temp <= 80)) fails.push('temp');
  if (state !== 'IDLE' && !order) fails.push('order');

  const row = { id: b.id, ts, machine: m.id, state, prog, order: order?.order || null, counter, temp, fails, dup: isDup };

  for (const f of fails) hit(f, m.id, RULES.enforce ? 'caught' : 'leaked');
  if (fails.length && RULES.enforce) {
    P.quarantine.push(row);
    if (P.quarantine.length > 40) P.quarantine.shift();
    P.counts.quarantine++;
    return;
  }

  // Parts produced = counter delta (the machine doesn't know about orders).
  const last = P.lastCounter.get(m.id);
  const delta = last == null ? 0 : Math.max(0, counter - last);
  P.lastCounter.set(m.id, counter);
  row.delta = delta;

  P.silver.push(row);
  if (P.silver.length > 60) P.silver.shift();
  P.counts.silver++;

  const tl = P.temps.get(m.id) || [];
  tl.push(temp);
  if (tl.length > 8) tl.shift();
  P.temps.set(m.id, tl);

  if (order) {
    order.resolvedEvents++;
    if (state === 'SETUP') order.setupMin += MIN_PER_TICK;
    if (state === 'RUNNING') order.runMin += MIN_PER_TICK;
    order.counted += delta;
  }
}

function erpToSilver(b, isDup) {
  if (isDup && RULES.dedupe) return;
  const p = JSON.parse(b.raw);
  const o = P.orders.get(p.ProdOrder);
  P.counts.erp++;
  if (!o) return;
  const end = parseErpTime(p.End);
  const lagH = (b.ingest - end) / 3600e3;
  if (lagH > 1) hit('fresh', 'erp', 'caught');
  o.booked = { good: p.QtyGood, scrap: p.QtyScrap, operator: p.Operator, lagH };
  P.counts.silver++;
  P.silver.push({ id: b.id, ts: end, machine: 'erp', state: 'BOOKED', order: o.order, counter: null, temp: null, fails: [], erp: p });
  if (P.silver.length > 60) P.silver.shift();
  closeIfDone(o);
}

function closeIfDone(o) {
  if (!o.booked || !o.end) return;
  const planTotal = o.it.setup + o.it.run * o.qty;
  const act = o.setupMin + o.runMin;
  P.closed.push({
    order: o.order,
    item: o.it.item,
    desc: o.it.desc,
    mat: o.it.mat,
    customer: o.it.cust,
    machine: o.machine,
    week: 46,
    qty: o.qty,
    scrap: o.booked.scrap,
    planSetup: o.it.setup,
    actSetup: o.setupMin,
    planTotal,
    actTotal: act,
    variance: act / planTotal - 1,
    live: true,
  });
  if (P.closed.length > 30) P.closed.shift();
}

function goldOrders() {
  // Most recent orders first, one row per order (gold.order_actuals).
  const rows = [...P.orders.values()].slice(-12).reverse().map((o) => {
    const planSoFar = o.it.setup + o.it.run * Math.max(o.counted, 0);
    const act = o.setupMin + o.runMin;
    const status = o.booked ? 'Closed' : o.end ? 'Awaiting' : o.counted || o.runMin ? 'Running' : 'Setup';
    return {
      order: o.order,
      item: o.it.item,
      machine: o.machine,
      qty: o.qty,
      counted: o.counted,
      planH: round((o.it.setup + o.it.run * o.qty) / 60, 1),
      actH: round(act / 60, 1),
      variance: o.counted > 0 ? act / planSoFar - 1 : null,
      status,
      good: o.booked?.good,
      scrap: o.booked?.scrap,
    };
  });
  return rows;
}

function machineTemp(id) {
  const t = P.temps.get(id);
  if (!t || !t.length) return null;
  return round(t.reduce((a, b) => a + b, 0) / t.length, 1);
}

function tick() {
  P.tick++;
  P.clock = new Date(P.clock.getTime() + MIN_PER_TICK * 60e3);
  for (const ms of machinesState) stepMachine(ms);
  const due = P.pendingErp.filter((x) => x.due <= P.tick);
  P.pendingErp = P.pendingErp.filter((x) => x.due > P.tick);
  for (const x of due) emitErp(x.o);
  // Freshness check on the ERP side: a finished operation without a booking
  // after one hour is flagged (the gold order stays "awaiting booking").
  for (const x of P.pendingErp) if (P.clock - x.o.end > 3600e3) hit('fresh', 'erp', 'caught');
  // Keep the live order list bounded.
  if (P.orders.size > 40) {
    const keep = [...P.orders.entries()].slice(-30);
    P.orders = new Map(keep);
  }
  for (const fn of listeners) fn();
}

function duplicateBurst() {
  const recent = P.bronze.filter((b) => b.kind !== 'erp').slice(-15);
  for (const b of recent) ingest({ source: b.source, kind: b.kind, raw: b.raw });
  toast(`Gateway reconnect: ${recent.length} messages re-sent`);
}

/* =========================================================================
   Shared rendering bits
   ========================================================================= */

function fmtPct(v) {
  if (v == null) return '—';
  const s = round(v * 100, 0);
  return `${s > 0 ? '+' : ''}${s}%`;
}
const varClass = (v) => (v == null ? '' : v > 0.2 ? 'bad' : v > 0.05 ? 'warn' : 'ok');

function ruleToggles(box) {
  const defs = [
    ['tz', 'Normalise time zone'],
    ['states', 'Harmonise states'],
    ['units', 'Convert units'],
    ['dedupe', 'Deduplicate'],
    ['enforce', 'Enforce contract'],
  ];
  for (const [k, label] of defs) {
    const lab = h('label', 'chip-toggle');
    const cb = h('input');
    cb.type = 'checkbox';
    cb.checked = RULES[k];
    cb.dataset.rule = k;
    cb.addEventListener('change', () => {
      RULES[k] = cb.checked;
      document.querySelectorAll(`input[data-rule="${k}"]`).forEach((x) => (x.checked = cb.checked));
      toast(`${label}: ${cb.checked ? 'on' : 'off'}`);
    });
    lab.append(cb, document.createTextNode(label));
    box.appendChild(lab);
  }
}

/* =========================================================================
   Title slide — live pipeline counters
   ========================================================================= */

function initTitle() {
  onTick(() => {
    if (!visible('d-title')) return;
    $('#t-clock').textContent = `${hhmm(new Date(P.clock.getTime() + TZ_OFFSET_H * 3600e3))} plant time`;
    $('#t-bronze').textContent = P.counts.bronze.toLocaleString('en-GB');
    $('#t-silver').textContent = P.counts.silver.toLocaleString('en-GB');
    $('#t-quar').textContent = P.counts.quarantine.toLocaleString('en-GB');
    $('#t-gold').textContent = (HISTORY.length + P.closed.length).toLocaleString('en-GB');
  });
}

/* =========================================================================
   Slide — medallion pipeline
   ========================================================================= */

function initPipeline() {
  ruleToggles($('#p-rules'));
  const bronzeEl = $('#p-bronze');
  const silverEl = $('#p-silver');
  const goldEl = $('#p-gold');
  let lastBronze = 0;
  let lastSilver = 0;

  onTick(() => {
    if (!visible('d-pipeline')) return;
    $('#p-clock').textContent = `${hhmm(new Date(P.clock.getTime() + TZ_OFFSET_H * 3600e3))} plant time`;
    $('#p-n-bronze').textContent = P.counts.bronze;
    $('#p-n-silver').textContent = P.counts.silver;
    $('#p-n-quar').textContent = P.counts.quarantine;
    $('#p-n-dedup').textContent = P.counts.dedup;

    // Bronze: raw text, newest first
    const newB = P.bronze.filter((b) => b.id > lastBronze);
    lastBronze = P.bronze.length ? P.bronze[P.bronze.length - 1].id : lastBronze;
    for (const b of newB.slice(-8)) {
      const r = h('div', `raw-row k-${b.kind}`);
      r.append(h('span', 'src', b.source), h('span', 'txt', b.raw));
      bronzeEl.prepend(r);
    }
    while (bronzeEl.children.length > 20) bronzeEl.lastChild.remove();

    // Silver: typed rows, newest first; quarantined rows shown inline
    const fresh = [...P.silver.filter((s) => s.id > lastSilver).map((s) => ({ ...s, q: false })),
      ...P.quarantine.filter((s) => s.id > lastSilver).map((s) => ({ ...s, q: true }))].sort((a, b) => a.id - b.id);
    if (fresh.length) lastSilver = fresh[fresh.length - 1].id;
    for (const s of fresh.slice(-8)) {
      const tr = h('tr', s.q ? 'quar' : s.fails?.length ? 'leak' : '');
      const cells = s.machine === 'erp'
        ? [hhmm(s.ts), 'ERP', 'BOOKED', s.order.slice(-4), `${s.erp.QtyGood}/${s.erp.QtyScrap}`, 'good/scrap']
        : [hhmm(s.ts), s.machine, s.state, s.order ? s.order.slice(-4) : '∅', s.q ? '' : `+${s.delta ?? 0}`, s.temp == null ? '' : `${s.temp} °C`];
      cells.forEach((c, i) => tr.appendChild(h('td', i === 3 && !s.order ? 'nul' : '', c)));
      if (s.q) {
        const td = tr.lastChild;
        td.textContent = `⛔ ${s.fails.join(', ')}`;
        td.className = 'qreason';
      }
      silverEl.prepend(tr);
    }
    while (silverEl.children.length > 19) silverEl.lastChild.remove();

    // Gold: order actuals
    goldEl.innerHTML = '';
    for (const g of goldOrders()) {
      const tr = h('tr');
      const st = h('td', `st st-${g.status.split(' ')[0]}`, g.status);
      tr.append(
        h('td', 'mono', g.order.slice(-4)),
        h('td', 'mono', g.item),
        h('td', 'num', `${g.counted}/${g.qty}`),
        h('td', 'num', `${g.planH} h`),
        h('td', 'num', `${g.actH} h`),
        h('td', `num var ${varClass(g.variance)}`, fmtPct(g.variance)),
        st,
      );
      goldEl.appendChild(tr);
    }
    const t = machineTemp('mch-07');
    const tEl = $('#p-temp');
    tEl.textContent = t == null ? '—' : `${t} °C`;
    tEl.className = t != null && t > 80 ? 'bad' : '';
  });
}

/* =========================================================================
   Slide — break the data (contracts + lineage)
   ========================================================================= */

const NODES = [
  { id: 'mc-01', x: 70, y: 70, label: 'mc-01', kind: 'src' },
  { id: 'mc-02', x: 70, y: 170, label: 'mc-02', kind: 'src' },
  { id: 'mch-07', x: 70, y: 270, label: 'MCH-07', kind: 'src' },
  { id: 'erp', x: 70, y: 400, label: 'ERP', kind: 'src' },
  { id: 'b-m', x: 225, y: 170, label: 'bronze.machine_raw', kind: 'bronze' },
  { id: 'b-e', x: 225, y: 400, label: 'bronze.erp_raw', kind: 'bronze' },
  { id: 's-m', x: 390, y: 170, label: 'silver.machine_events', kind: 'silver' },
  { id: 's-e', x: 390, y: 400, label: 'silver.erp_bookings', kind: 'silver' },
  { id: 'g-h', x: 555, y: 110, label: 'gold.machine_health', kind: 'gold' },
  { id: 'g-o', x: 555, y: 330, label: 'gold.order_actuals', kind: 'gold' },
  { id: 'c-oee', x: 715, y: 110, label: 'OEE report', kind: 'use' },
  { id: 'c-q', x: 715, y: 290, label: 'Quote accuracy', kind: 'use' },
  { id: 'c-ask', x: 715, y: 400, label: 'Ask your data', kind: 'use' },
];
const EDGES = [
  ['mc-01', 'b-m'], ['mc-02', 'b-m'], ['mch-07', 'b-m'], ['erp', 'b-e'],
  ['b-m', 's-m'], ['b-e', 's-e'],
  ['s-m', 'g-h'], ['s-m', 'g-o'], ['s-e', 'g-o'],
  ['g-h', 'c-oee'], ['g-o', 'c-q'], ['g-o', 'c-ask'],
];
// Which gold tables a check's bad data would corrupt.
const IMPACT = { ts: ['g-o', 'g-h'], state: ['g-o', 'g-h'], temp: ['g-h'], order: ['g-o'], dup: ['g-o'], fresh: ['g-o'] };

function initBreak() {
  ruleToggles($('#b-rules'));
  const list = $('#b-checks');
  const rows = new Map();
  for (const c of CHECKS) {
    const r = h('div', 'check');
    const icon = h('span', 'check-icon', '✓');
    const body = h('div', 'check-body');
    body.append(h('b', null, c.name), h('small', 'mono', c.table));
    const stat = h('span', 'check-stat', 'passing');
    r.append(icon, body, stat);
    list.appendChild(r);
    rows.set(c.id, { r, icon, stat });
  }

  const fBtns = document.querySelectorAll('[data-fault]');
  fBtns.forEach((b) =>
    b.addEventListener('click', () => {
      const k = b.dataset.fault;
      if (k === 'dupes') {
        duplicateBurst();
        return;
      }
      FAULTS[k] = !FAULTS[k];
      b.classList.toggle('on', FAULTS[k]);
      b.querySelector('.f-state').textContent = FAULTS[k] ? 'active' : 'off';
    }),
  );
  $('#b-reset').addEventListener('click', () => {
    Object.keys(FAULTS).forEach((k) => (FAULTS[k] = false));
    Object.keys(RULES).forEach((k) => (RULES[k] = true));
    document.querySelectorAll('input[data-rule]').forEach((x) => (x.checked = true));
    fBtns.forEach((b) => {
      b.classList.remove('on');
      const s = b.querySelector('.f-state');
      if (s) s.textContent = 'off';
    });
    P.checkHits.clear();
    toast('All sources healthy, all rules on');
  });

  // Lineage graph
  const svg = $('#b-lineage');
  const edgeEls = [];
  const nodeEls = new Map();
  for (const [a, b] of EDGES) {
    const A = NODES.find((n) => n.id === a);
    const B = NODES.find((n) => n.id === b);
    const p = sv('path', { d: `M${A.x + 62} ${A.y} C ${(A.x + B.x) / 2 + 20} ${A.y}, ${(A.x + B.x) / 2 - 20} ${B.y}, ${B.x - 62} ${B.y}`, class: 'ln-edge' });
    svg.appendChild(p);
    edgeEls.push({ a, b, p });
  }
  for (const n of NODES) {
    const g = sv('g', { class: `ln-node k-${n.kind}` });
    g.appendChild(sv('rect', { x: n.x - 64, y: n.y - 22, width: 128, height: 44, rx: 9 }));
    const t = sv('text', { x: n.x, y: n.y + 5 });
    t.textContent = n.label.length > 20 ? n.label.replace('.', '.​') : n.label;
    g.appendChild(t);
    if (n.label.includes('.')) {
      const [a, b] = n.label.split('.');
      t.textContent = '';
      const t1 = sv('tspan', { x: n.x, dy: '-3', class: 'ln-tier' });
      t1.textContent = a;
      const t2 = sv('tspan', { x: n.x, dy: '15' });
      t2.textContent = b;
      t.setAttribute('y', n.y - 2);
      t.append(t1, t2);
    }
    svg.appendChild(g);
    nodeEls.set(n.id, g);
  }

  const RECENT = 12;
  onTick(() => {
    if (!visible('d-break')) return;
    const status = new Map(); // node -> 'red' | 'amber'
    const mark = (id, s) => {
      if (status.get(id) === 'red') return;
      status.set(id, s);
    };
    const downstream = (from, s) => {
      mark(from, s);
      for (const e of EDGES) if (e[0] === from) downstream(e[1], s);
    };

    for (const c of CHECKS) {
      let caught = 0;
      let leaked = 0;
      for (const [k, v] of P.checkHits) {
        if (!k.startsWith(`${c.id}|`)) continue;
        const node = k.split('|')[1];
        if (v.caught != null && P.tick - v.caught <= RECENT) {
          caught++;
          mark(node, 'red');
          mark(node === 'erp' ? 'b-e' : 'b-m', 'amber');
          mark(node === 'erp' ? 's-e' : 's-m', 'amber');
        }
        if (v.leaked != null && P.tick - v.leaked <= RECENT) {
          leaked++;
          mark(node, 'red');
          mark(node === 'erp' ? 'b-e' : 'b-m', 'red');
          mark(node === 'erp' ? 's-e' : 's-m', 'red');
          for (const g of IMPACT[c.id]) downstream(g, 'red');
        }
      }
      // A late booking is flagged, not blocked: orders stay "awaiting booking".
      if (c.id === 'fresh' && caught) for (const g of IMPACT.fresh) downstream(g, 'amber');

      const row = rows.get(c.id);
      row.r.className = `check ${leaked ? 'leak' : caught ? 'caught' : ''}`;
      row.icon.textContent = leaked ? '✗' : caught ? (c.id === 'fresh' ? '!' : '⛔') : '✓';
      row.stat.textContent = leaked
        ? 'failing — bad data reached gold'
        : caught
          ? c.id === 'dup' ? 'duplicates dropped' : c.id === 'fresh' ? 'late — orders flagged' : 'violations quarantined'
          : 'passing';
    }

    for (const [id, g] of nodeEls) g.classList.toggle('red', status.get(id) === 'red');
    for (const [id, g] of nodeEls) g.classList.toggle('amber', status.get(id) === 'amber');
    for (const e of edgeEls) {
      const sa = status.get(e.a);
      const sb = status.get(e.b);
      e.p.setAttribute('class', `ln-edge ${sa && sb ? (sa === 'red' && sb === 'red' ? 'red' : 'amber') : ''}`);
    }

    // What the business sees
    const t = machineTemp('mch-07');
    const tEl = $('#b-dash-temp');
    tEl.textContent = t == null ? '—' : `${t} °C`;
    tEl.className = `dash-val ${t != null && t > 80 ? 'bad' : ''}`;
    const open = goldOrders();
    const unresolved = [...P.orders.values()].filter((o) => o.machine === 'mc-02' && !o.booked).slice(-1)[0];
    const awaiting = open.filter((o) => o.status === 'Awaiting').length;
    $('#b-dash-await').textContent = awaiting;
    $('#b-dash-await').className = `dash-val ${awaiting ? 'warn' : ''}`;
    const v = unresolved ? (unresolved.setupMin + unresolved.runMin) / 60 : null;
    $('#b-dash-mc02').textContent = v == null ? '—' : `${round(v, 1)} h booked to ${unresolved.order.slice(-4)}`;
  });
}

/* =========================================================================
   Slide — ask your data (scripted, grounded in gold + semantic layer)
   ========================================================================= */

function allGold() {
  return [...HISTORY, ...P.closed];
}

function groupBy(rows, key) {
  const m = new Map();
  for (const r of rows) {
    const k = typeof key === 'function' ? key(r) : r[key];
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
}
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;

const QUESTIONS = [
  {
    id: 'variance',
    q: 'Which items exceed quoted machining time by more than 20%?',
    match: /(exceed|over|quote|quoted|variance|longer)/i,
    intent: 'metric machining_time_variance · by item · last 90 days · filter > 20%',
    sql: `SELECT item, description,
       COUNT(*)                                  AS orders,
       ROUND(AVG(machining_time_variance)*100,1) AS avg_variance_pct
FROM   gold.order_actuals
WHERE  closed_at >= CURRENT_DATE - INTERVAL 90 DAY
GROUP  BY item, description
HAVING AVG(machining_time_variance) > 0.20
ORDER  BY avg_variance_pct DESC;`,
    run() {
      const g = [...groupBy(allGold(), 'item')].map(([item, rs]) => ({
        label: item,
        sub: `${rs[0].desc} · ${rs[0].mat}`,
        orders: rs.length,
        value: avg(rs.map((r) => r.variance)) * 100,
      })).sort((a, b) => b.value - a.value);
      const hits = g.filter((x) => x.value > 20);
      return {
        cols: ['Item', 'Description', 'Orders', 'Avg variance'],
        rows: hits.map((x) => [x.label, x.sub, x.orders, `+${round(x.value, 1)}%`]),
        chart: { data: g.map((x) => ({ label: x.label, value: x.value, hi: x.value > 20 })), unit: '%', threshold: 20 },
        insight: `${hits.length} items run more than 20% over quote — ${hits.map((x) => x.sub.split(' · ')[1]).join(', ')}. Quoting norms for these materials should be revisited.`,
      };
    },
  },
  {
    id: 'setup',
    q: 'How do actual setup times compare with plan per machine?',
    match: /(setup|set-up|changeover)/i,
    intent: 'metric avg_setup_minutes (planned vs actual) · by machine · last 90 days',
    sql: `SELECT machine,
       ROUND(AVG(planned_setup_min)) AS planned,
       ROUND(AVG(actual_setup_min))  AS actual
FROM   gold.order_actuals
WHERE  closed_at >= CURRENT_DATE - INTERVAL 90 DAY
GROUP  BY machine
ORDER  BY actual - planned DESC;`,
    run() {
      const g = [...groupBy(allGold(), 'machine')].map(([m, rs]) => ({
        label: m,
        plan: avg(rs.map((r) => r.planSetup)),
        act: avg(rs.map((r) => r.actSetup)),
      })).sort((a, b) => b.act - b.plan - (a.act - a.plan));
      const worst = g[0];
      return {
        cols: ['Machine', 'Planned (min)', 'Actual (min)', 'Difference'],
        rows: g.map((x) => [x.label, Math.round(x.plan), Math.round(x.act), `${x.act > x.plan ? '+' : ''}${Math.round(x.act - x.plan)} min`]),
        chart: { data: g.map((x) => ({ label: x.label, value: x.act, value2: x.plan })), unit: ' min', pair: ['Actual', 'Planned'] },
        insight: `${worst.label} needs ${Math.round(worst.act - worst.plan)} min more setup than planned on average — a candidate for SMED or better fixturing.`,
      };
    },
  },
  {
    id: 'scrap',
    q: 'Which customers’ parts had the highest scrap rate?',
    match: /(scrap|reject|nok|quality|customer)/i,
    intent: 'metric scrap_rate · by customer · last 90 days',
    sql: `SELECT customer,
       SUM(qty_scrap)                                 AS scrapped,
       SUM(qty)                                       AS produced,
       ROUND(100.0 * SUM(qty_scrap) / SUM(qty), 1)    AS scrap_rate_pct
FROM   gold.order_actuals
WHERE  closed_at >= CURRENT_DATE - INTERVAL 90 DAY
GROUP  BY customer
ORDER  BY scrap_rate_pct DESC;`,
    run() {
      const g = [...groupBy(allGold(), 'customer')].map(([c, rs]) => {
        const sc = rs.reduce((a, r) => a + r.scrap, 0);
        const q = rs.reduce((a, r) => a + r.qty, 0);
        return { label: c, sc, q, value: (100 * sc) / q };
      }).sort((a, b) => b.value - a.value);
      return {
        cols: ['Customer', 'Scrapped', 'Produced', 'Scrap rate'],
        rows: g.map((x) => [x.label, x.sc, x.q, `${round(x.value, 1)}%`]),
        chart: { data: g.map((x) => ({ label: x.label, value: x.value, hi: x === g[0] })), unit: '%' },
        insight: `${g[0].label} parts scrap most (${round(g[0].value, 1)}%), driven by titanium and Invar items.`,
      };
    },
  },
  {
    id: 'trend',
    q: 'Is our quoting getting more accurate week by week?',
    match: /(trend|week|improv|accura|over time)/i,
    intent: 'metric machining_time_variance · by ISO week · last 13 weeks',
    sql: `SELECT iso_week,
       ROUND(AVG(machining_time_variance)*100,1) AS avg_variance_pct
FROM   gold.order_actuals
WHERE  closed_at >= CURRENT_DATE - INTERVAL 13 WEEK
GROUP  BY iso_week
ORDER  BY iso_week;`,
    run() {
      const g = [...groupBy(allGold(), 'week')].sort((a, b) => a[0] - b[0]).map(([w, rs]) => ({ label: `W${w}`, value: avg(rs.map((r) => r.variance)) * 100 }));
      const first = avg(g.slice(0, 4).map((x) => x.value));
      const last = avg(g.slice(-4).map((x) => x.value));
      return {
        cols: ['Week', 'Avg variance'],
        rows: g.map((x) => [x.label, `${x.value > 0 ? '+' : ''}${round(x.value, 1)}%`]),
        chart: { data: g.map((x) => ({ label: x.label, value: x.value })), unit: '%', threshold: 0 },
        insight: `Not yet: orders still run ${round(last, 0)}% over quote on average (first four weeks: ${round(first, 0)}%). The variance is structural, not noise.`,
      };
    },
  },
];

function barChart(el, spec) {
  el.innerHTML = '';
  const data = spec.data;
  const W = 430;
  const rowH = Math.min(36, Math.floor(330 / data.length));
  const H = rowH * data.length + 26;
  const labelW = 104;
  const vals = data.flatMap((d) => [d.value, d.value2 ?? d.value]);
  const min = Math.min(0, ...vals, spec.threshold ?? 0);
  const max = Math.max(...vals, spec.threshold ?? 0) * 1.12 || 1;
  const x = (v) => labelW + ((v - min) / (max - min)) * (W - labelW - 60);
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart' });
  data.forEach((d, i) => {
    const y = 6 + i * rowH;
    const t = sv('text', { x: labelW - 10, y: y + rowH / 2 + 5, class: 'c-label' });
    t.textContent = d.label;
    svg.appendChild(t);
    const bh = d.value2 != null ? (rowH - 8) / 2 : rowH - 10;
    const x0 = x(Math.min(0, d.value));
    svg.appendChild(sv('rect', { x: x0, y: y + 3, width: Math.max(2, Math.abs(x(d.value) - x(0))), height: bh, rx: 3, class: `c-bar ${d.hi ? 'hi' : ''}` }));
    if (d.value2 != null) svg.appendChild(sv('rect', { x: x(0), y: y + 4 + bh, width: Math.max(2, x(d.value2) - x(0)), height: bh, rx: 3, class: 'c-bar2' }));
    const v = sv('text', { x: x(Math.max(d.value, d.value2 ?? -Infinity, 0)) + 6, y: y + rowH / 2 + 5, class: 'c-val' });
    v.textContent = `${round(d.value, 1)}${spec.unit}`;
    svg.appendChild(v);
  });
  svg.appendChild(sv('line', { x1: x(0), x2: x(0), y1: 2, y2: H - 18, class: 'c-axis' }));
  if (spec.threshold) {
    svg.appendChild(sv('line', { x1: x(spec.threshold), x2: x(spec.threshold), y1: 2, y2: H - 18, class: 'c-thr' }));
    const t = sv('text', { x: x(spec.threshold), y: H - 4, class: 'c-thr-label' });
    t.textContent = `${spec.threshold}${spec.unit} threshold`;
    svg.appendChild(t);
  }
  if (spec.pair) {
    const lg = sv('text', { x: W - 4, y: H - 4, class: 'c-legend' });
    lg.textContent = `■ ${spec.pair[0]}   ┅ ${spec.pair[1]}`;
    svg.appendChild(lg);
  }
  el.appendChild(svg);
}

function initAsk() {
  const input = $('#a-q');
  const chips = $('#a-chips');
  const plan = $('#a-plan');
  const resBox = $('#a-res');
  let timers = [];

  for (const q of QUESTIONS) {
    const b = h('button', 'btn small', q.q);
    b.type = 'button';
    b.addEventListener('click', () => {
      input.value = q.q;
      ask(q.q);
    });
    chips.appendChild(b);
  }

  function ask(text) {
    timers.forEach(clearTimeout);
    timers = [];
    plan.innerHTML = '';
    resBox.innerHTML = '';
    const q = QUESTIONS.find((x) => x.match.test(text));
    const step = (label, node, delay, box = plan) =>
      timers.push(setTimeout(() => {
        const s = h('div', 'a-step');
        s.appendChild(h('div', 'a-step-label', label));
        s.appendChild(node);
        box.appendChild(s);
      }, delay));

    if (!q) {
      const n = h('div', 'a-refuse');
      n.textContent = 'I can only answer with metrics defined in the semantic layer, so I won’t guess. Available: machining_time_variance, avg_setup_minutes, scrap_rate. Try one of the suggested questions.';
      step('Answer', n, 150, resBox);
      return;
    }

    step('1 · Understood as', h('div', 'a-intent mono', q.intent), 100);
    const pre = h('pre', 'code-block a-sql');
    step('2 · Generated SQL (governed: gold tables, read-only)', pre, 400);
    timers.push(setTimeout(() => {
      let i = 0;
      const typer = setInterval(() => {
        i += 14;
        pre.textContent = q.sql.slice(0, i);
        if (i >= q.sql.length) clearInterval(typer);
      }, 16);
      timers.push(typer);
    }, 420));

    timers.push(setTimeout(() => {
      const res = q.run();
      const wrap = h('div', 'a-result');
      const table = h('table', 'a-table');
      const thead = h('tr');
      res.cols.forEach((c) => thead.appendChild(h('th', null, c)));
      table.appendChild(thead);
      res.rows.slice(0, 7).forEach((r) => {
        const tr = h('tr');
        r.forEach((c) => tr.appendChild(h('td', null, String(c))));
        table.appendChild(tr);
      });
      const chart = h('div', 'a-chart');
      wrap.append(table, chart);
      const s = h('div', 'a-step');
      s.append(h('div', 'a-step-label', '3 · Result'), wrap);
      resBox.appendChild(s);
      barChart(chart, res.chart);
      const ins = h('div', 'a-insight');
      ins.append(h('b', null, 'Answer: '), document.createTextNode(res.insight));
      const src = h('div', 'a-src mono', `Sources: gold.order_actuals (${allGold().length} orders) · metric owner: manufacturing engineering · refreshed ${hhmm(new Date(P.clock.getTime() + TZ_OFFSET_H * 3600e3))}`);
      const s2 = h('div', 'a-step');
      s2.append(ins, src);
      resBox.appendChild(s2);
    }, 1500));
  }

  $('#a-form').addEventListener('submit', (e) => {
    e.preventDefault();
    ask(input.value);
  });
}

/* =========================================================================
   Boot
   ========================================================================= */

initTitle();
initPipeline();
initBreak();
initAsk();
// Warm up so every view has data the moment it is shown.
for (let i = 0; i < 40; i++) tick();
setInterval(tick, 650);
