// Interactive pieces for "The ABCD of Data in Manufacturing" — a talk for
// first-year students. Every technical term can be tapped for a plain-language
// definition, on the slides and in the article.

import { currentSlideId } from '../shared/deck.js';
import { initCards } from '../shared/widgets.js';

const $ = (sel, root = document) => root.querySelector(sel);
function h(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

/* =========================================================================
   Glossary — short, plain-language definitions
   ========================================================================= */

export const GLOSSARY = {
  ai: ['Artificial intelligence (AI)', 'Software that performs tasks we normally associate with human thinking, such as recognising patterns, making predictions or understanding language.'],
  ml: ['Machine learning (ML)', 'A kind of AI that learns patterns from examples (data) instead of following rules a programmer wrote by hand.'],
  llm: ['Large language model (LLM)', 'An AI model trained on huge amounts of text so it can read and write language, such as the model behind a chatbot.'],
  agent: ['AI agent / agentic AI', 'An AI system that does not just answer a question but plans steps and uses tools (search, calculations, other software) to complete a task.'],
  mcp: ['MCP (Model Context Protocol)', 'An open standard that lets AI agents connect to tools and data sources in one consistent way, instead of a custom connection for every system.'],
  kg: ['Knowledge graph', 'A way of storing knowledge as things (machines, parts, orders) and the relationships between them, so both people and software can follow the connections.'],
  anomaly: ['Anomaly detection', 'Automatically spotting data that behaves differently from normal, for example a machine vibrating more than usual.'],
  pdm: ['Predictive maintenance', 'Fixing a machine just before it is likely to fail, based on its data, instead of waiting for a breakdown or following a fixed calendar.'],
  twin: ['Digital twin', 'A digital model of a real machine or factory that is kept up to date with live data, so you can test “what if?” questions safely.'],
  bi: ['Business intelligence (BI)', 'Turning data into reports and dashboards so people can see what is happening and decide what to do.'],
  kpi: ['KPI (key performance indicator)', 'A number that shows how well something is going against a goal, such as “95% of orders delivered on time”.'],
  dashboard: ['Dashboard', 'A screen that shows the most important numbers and charts at a glance, usually updated automatically.'],
  spog: ['Single pane of glass', 'One screen or place where you can see all the information you need, instead of logging into many systems.'],
  oee: ['OEE (Overall Equipment Effectiveness)', 'How much of the planned time a machine really produced good parts at full speed. OEE = Availability × Performance × Quality.'],
  otd: ['OTD (On-Time Delivery)', 'The share of customer orders delivered on or before the promised date.'],
  wo: ['Work order', 'An instruction to make a specific quantity of a part by a certain date; it travels through the factory with the job.'],
  ci: ['Continuous improvement (CI)', 'A way of working where teams keep making small, measured improvements every day, instead of waiting for one big project.'],
  literacy: ['Data literacy', 'The ability to read, question and use data sensibly: knowing what a number means and when not to trust it.'],
  tribal: ['Tribal knowledge', 'Know-how that lives in people’s heads and is passed on informally, not written down anywhere.'],
  silo: ['Data silo', 'Data locked inside one system or department, so others cannot easily use or combine it.'],
  erp: ['ERP (Enterprise Resource Planning)', 'The company’s main business system for orders, purchasing, stock, planning and finance. Examples: SAP, Microsoft Dynamics, Odoo.'],
  mes: ['MES (Manufacturing Execution System)', 'Software that tracks and controls what happens on the shop floor: which order runs where, quality checks and recipes.'],
  plm: ['PLM (Product Lifecycle Management)', 'The system that manages a product’s design data: drawings, versions and engineering changes.'],
  tdm: ['TDM (Tool Data Management)', 'A system that stores data about cutting tools: types, dimensions, where they are and how they are used.'],
  scada: ['SCADA', 'Supervisory Control and Data Acquisition: software that lets operators monitor and control a whole process or plant area from screens.'],
  plc: ['PLC (Programmable Logic Controller)', 'A rugged industrial computer that controls a machine in real time, reading sensors and switching motors and valves.'],
  sensor: ['Sensor', 'A device that measures something physical, such as temperature, vibration or position, and turns it into a signal.'],
  cnc: ['CNC machine', 'Computer Numerical Control: a machine tool (mill, lathe) that cuts material automatically by following a program.'],
  cam: ['CAM (Computer-Aided Manufacturing)', 'Software engineers use to turn a 3D design into the program a CNC machine follows.'],
  isa95: ['ISA-95', 'An international standard that describes the levels of a factory (from sensors up to ERP) and how information should flow between them.'],
  rami: ['RAMI 4.0', 'The Reference Architectural Model for Industrie 4.0: a German framework for describing how the parts of a smart factory fit together.'],
  itot: ['IT and OT', 'IT (information technology) runs business software and data; OT (operational technology) runs the machines and controls on the shop floor.'],
  tag: ['Tag', 'In OT, a named data point coming from a machine, for example “MC07_SPINDLE_TEMP”.'],
  semantic: ['Semantic layer', 'A translation layer that gives data a shared meaning, so “machine running” means the same thing in every system and report.'],
  db: ['Database', 'Organised storage for data that many programs and people can query at the same time.'],
  dwh: ['Data warehouse', 'A central database designed for reporting, where cleaned data from many systems is brought together.'],
  lakehouse: ['Data lakehouse', 'A modern data platform that combines cheap storage for any kind of data (a “lake”) with the structure of a warehouse.'],
  streaming: ['Streaming', 'Processing data continuously as it arrives, within seconds, instead of in daily or hourly batches.'],
  etl: ['ETL (Extract–Transform–Load)', 'The three steps of moving data: take it out of a source, clean and reshape it, then load it into the data platform.'],
  medallion: ['Medallion architecture', 'Organising a data platform in layers: bronze (raw), silver (cleaned) and gold (ready for reports) — like raw material, semi-finished and finished product.'],
  uns: ['UNS (Unified Namespace)', 'One central, real-time hub where every factory system publishes its data under a clear name, so others can subscribe to it.'],
  aas: ['AAS (Asset Administration Shell)', 'A standard “digital passport” for a machine or product that describes its identity, properties and documents.'],
  nodered: ['Node-RED', 'A free, visual programming tool for connecting machines and data by wiring blocks together in a browser.'],
  descriptive: ['Descriptive → prescriptive analytics', 'Four levels of analysis: what happened (descriptive), why (diagnostic), what will happen (predictive), and what should we do (prescriptive).'],
  iso22400: ['ISO 22400', 'An international standard that defines KPIs for manufacturing operations, so everyone calculates numbers like OEE the same way.'],
  scor: ['SCOR model', 'The Supply Chain Operations Reference model by ASCM: a standard way to describe and measure a supply chain, from planning to delivery and returns.'],
};

/* Tooltip for .term elements — works on the scaled slides and in the article. */
function initTerms() {
  const shell = document.getElementById('deck-shell');
  const mk = () => {
    const t = h('div', 'term-pop');
    t.setAttribute('role', 'tooltip');
    t.hidden = true;
    return t;
  };
  const inDeck = mk();
  const inPage = mk();
  shell.appendChild(inDeck);
  document.body.appendChild(inPage);
  let pinned = null;

  document.querySelectorAll('.term').forEach((el) => {
    const g = GLOSSARY[el.dataset.t];
    if (!g) return;
    el.tabIndex = 0;
    el.setAttribute('aria-label', `${el.textContent}: ${g[1]}`);
  });

  function show(el) {
    const g = GLOSSARY[el.dataset.t];
    if (!g) return;
    const pop = el.closest('#deck-shell') ? inDeck : inPage;
    (pop === inDeck ? inPage : inDeck).hidden = true;
    pop.innerHTML = '';
    pop.append(h('b', null, g[0]), h('span', null, g[1]));
    pop.hidden = false;
    const r = el.getBoundingClientRect();
    const w = Math.min(340, window.innerWidth - 24);
    pop.style.width = `${w}px`;
    let x = r.left + r.width / 2 - w / 2;
    x = Math.max(12, Math.min(window.innerWidth - w - 12, x));
    pop.style.left = `${x}px`;
    const ph = pop.offsetHeight;
    const below = r.bottom + 10 + ph < window.innerHeight;
    pop.style.top = `${below ? r.bottom + 10 : r.top - ph - 10}px`;
  }
  const hide = () => {
    inDeck.hidden = true;
    inPage.hidden = true;
  };

  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest && e.target.closest('.term');
    if (el && !pinned) show(el);
  });
  document.addEventListener('mouseout', (e) => {
    const el = e.target.closest && e.target.closest('.term');
    if (el && !pinned) hide();
  });
  document.addEventListener('focusin', (e) => {
    if (e.target.classList?.contains('term')) show(e.target);
  });
  document.addEventListener('focusout', (e) => {
    if (e.target.classList?.contains('term') && pinned !== e.target) hide();
  });
  document.addEventListener('click', (e) => {
    const el = e.target.closest && e.target.closest('.term');
    if (el) {
      e.preventDefault();
      if (pinned === el) {
        pinned = null;
        hide();
      } else {
        pinned = el;
        show(el);
      }
      return;
    }
    if (pinned) {
      pinned = null;
      hide();
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { pinned = null; hide(); } });
  window.addEventListener('scroll', () => { if (!pinned) hide(); }, { passive: true });
  document.addEventListener('slidechange', () => { pinned = null; hide(); });
}

/* Key-terms grid and article glossary are built from the same list. */
function initGlossaryLists() {
  const grid = $('#gl-grid');
  if (grid) {
    for (const k of grid.dataset.keys.split(',')) {
      const g = GLOSSARY[k.trim()];
      if (!g) continue;
      const c = h('div', 'flip gl');
      const fr = h('div', 'fr');
      fr.appendChild(h('b', null, g[0]));
      c.append(fr, h('div', 'bk', g[1]));
      grid.appendChild(c);
    }
    initCards(grid);
  }
  const dl = $('#gl-article');
  if (dl) {
    const items = Object.values(GLOSSARY).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [t, d] of items) dl.append(h('dt', null, t), h('dd', null, d));
  }
}

/* =========================================================================
   Data → information → action
   ========================================================================= */

const PIPE = [
  { k: 'Connect', icon: '🔌', what: 'Hook up the sources that create data: sensors, CNC machines, ERP, tool data and product data.', ex: 'A milling machine reports its status every second: running, idle or stopped.' },
  { k: 'Collect', icon: '🧩', what: 'Gather the data and translate it into agreed formats, so data from different machines fits together.', ex: '“RUN”, “ACTIVE” and “1” from three different machines all become “RUNNING”.' },
  { k: 'Store', icon: '🗄️', what: 'Keep it in one central data platform, so everyone uses the same copy instead of their own spreadsheet.', ex: 'A year of machine states for every machine, in one table.' },
  { k: 'Analyze', icon: '📊', what: 'Turn data into information with reports, dashboards and AI.', ex: '“Machine 7 was stopped for 14% of its planned time last week, mostly waiting for tools.”' },
  { k: 'Act', icon: '🛠️', what: 'People (or software) make a decision based on that information.', ex: 'The team prepares tools before the shift starts, so machine 7 doesn’t wait.' },
  { k: 'Improve', icon: '🔁', what: 'Check whether it worked, and move up the ladder from “what happened?” to “what should we do?”.', ex: 'Next week: stoppages for tools dropped from 14% to 6%. Tackle the next reason.' },
];

function initPipe() {
  const row = $('#pp-row');
  if (!row) return;
  const detail = $('#pp-detail');
  const btns = PIPE.map((p, i) => {
    const b = h('button', 'pp-step');
    b.type = 'button';
    b.append(h('span', 'pp-ic', p.icon), h('b', null, p.k), h('i', null, String(i + 1)));
    b.addEventListener('click', () => show(i));
    row.appendChild(b);
    return b;
  });
  function show(i) {
    btns.forEach((b, k) => b.classList.toggle('on', k === i));
    const p = PIPE[i];
    detail.innerHTML = '';
    detail.append(h('div', 'pp-k', `Step ${i + 1} · ${p.k}`), h('p', 'pp-what', p.what));
    const ex = h('div', 'pp-ex');
    ex.append(h('b', null, 'Example: '), document.createTextNode(p.ex));
    detail.append(ex);
  }
  show(0);
}

/* =========================================================================
   OEE calculator
   ========================================================================= */

function initOee() {
  const dt = $('#oc-down');
  if (!dt) return;
  const sp = $('#oc-speed');
  const sc = $('#oc-scrap');
  const PLANNED = 480;
  const pc = (v) => `${(Math.round(v * 1000) / 10).toFixed(1)}%`;
  function update() {
    const down = +dt.value;
    const speed = +sp.value;
    const scrap = +sc.value;
    const A = (PLANNED - down) / PLANNED;
    const P = 1 - speed / 100;
    const Q = 1 - scrap / 100;
    const O = A * P * Q;
    $('#oc-down-v').textContent = `${down} min`;
    $('#oc-speed-v').textContent = `${speed}%`;
    $('#oc-scrap-v').textContent = `${scrap}%`;
    const set = (id, v) => {
      $(`#oc-${id}`).style.width = `${v * 100}%`;
      $(`#oc-${id}-n`).textContent = pc(v);
    };
    set('a', A);
    set('p', P);
    set('q', Q);
    $('#oc-oee').textContent = pc(O);
    const ideal = PLANNED; // 1 part per minute at full speed
    $('#oc-parts').textContent = `${Math.round(ideal * O)} good parts out of ${ideal} possible`;
    const big = [['downtime', 1 - A], ['slow running', 1 - P], ['scrap', 1 - Q]].sort((a, b) => b[1] - a[1])[0];
    $('#oc-hint').textContent = O >= 0.85
      ? 'That is around the often-quoted “world-class” level of 85%.'
      : `Biggest loss right now: ${big[0]}. That is where to start improving.`;
  }
  [dt, sp, sc].forEach((x) => x.addEventListener('input', update));
  update();
}

/* =========================================================================
   Top floor → shop floor drill-down (fictional data)
   ========================================================================= */

const WOS = [
  { id: 'WO-4521', part: 'Bracket assembly', machine: 'Mill 07', due: '07 Mar', late: '2 days behind', why: 'Waiting for a tool change on Mill 07', status: 'Tool change', action: 'Prepare the tool set before the shift; start WO-4521 first.' },
  { id: 'WO-4533', part: 'Turbine blade finishing', machine: 'CMM 02', due: '08 Mar', late: 'In inspection queue', why: 'Measuring-machine backlog: 4 parts ahead', status: 'In queue', action: 'Move one inspection to the second measuring machine.' },
  { id: 'WO-4548', part: 'Landing-gear pin', machine: 'Mill 12', due: '06 Mar', late: 'Critical', why: 'Rework after a failed quality check', status: 'Rework', action: 'Re-machine today; quality engineer checks the first part.' },
];

function initDrill() {
  const box = $('#dr');
  if (!box) return;
  const roleBtns = [...document.querySelectorAll('#dr-role button')];
  const lv = [1, 2, 3].map((n) => $(`#dr-l${n}`));
  const list = $('#dr-wos');
  const board = $('#dr-board');
  let sel = null;
  WOS.forEach((w) => {
    const c = h('button', 'dr-wo');
    c.type = 'button';
    c.append(h('b', null, w.id), h('span', null, w.part), h('small', null, `Due ${w.due} · ${w.late}`), h('em', null, w.why));
    c.addEventListener('click', () => {
      sel = w;
      [...list.children].forEach((x) => x.classList.toggle('on', x === c));
      renderBoard();
      setRole('operator');
    });
    list.appendChild(c);
  });
  function renderBoard() {
    board.innerHTML = '';
    const head = h('tr');
    ['Work order', 'Part', 'Machine', 'Status', 'Due', 'Today’s action'].forEach((x) => head.appendChild(h('th', null, x)));
    board.appendChild(head);
    WOS.forEach((w) => {
      const tr = h('tr', w === sel ? 'on' : '');
      [w.id, w.part, w.machine, w.status, w.due, w.action].forEach((x) => tr.appendChild(h('td', null, x)));
      board.appendChild(tr);
    });
  }
  function setRole(r) {
    roleBtns.forEach((b) => b.classList.toggle('on', b.dataset.role === r));
    const n = { ceo: 0, planner: 1, operator: 2 }[r];
    lv.forEach((el, i) => el.classList.toggle('focus', i === n));
  }
  roleBtns.forEach((b) => b.addEventListener('click', () => setRole(b.dataset.role)));
  $('#dr-why').addEventListener('click', () => setRole('planner'));
  renderBoard();
  setRole('ceo');
}

/* =========================================================================
   Automation pyramid (ISA-95 levels)
   ========================================================================= */

const LEVELS = [
  { n: 4, name: 'Enterprise', sys: 'ERP', term: 'erp', time: 'months · weeks · days', what: 'Plans what to make and when, handles orders, purchasing, stock and finance.', ex: 'SAP, Microsoft Dynamics, Odoo' },
  { n: 3, name: 'Management', sys: 'MES', term: 'mes', time: 'days · hours · minutes', what: 'Runs the shop floor: which order goes to which machine, quality reporting, recipes.', ex: 'Shop-floor control, quality reporting, recipe management' },
  { n: 2, name: 'Supervision', sys: 'SCADA', term: 'scada', time: 'minutes · seconds', what: 'Lets operators watch and steer a whole line or plant area from screens.', ex: 'Control-room screens, alarms, trends' },
  { n: 1, name: 'Control', sys: 'PLC', term: 'plc', time: 'seconds · milliseconds', what: 'Controls one machine in real time, running its logic many times per second.', ex: 'Machine controllers, CNC controls' },
  { n: 0, name: 'Field', sys: 'Sensors & actuators', term: 'sensor', time: 'milliseconds', what: 'Measures the physical world and moves things: temperature, position, motors, valves.', ex: 'Temperature probes, encoders, motors, valves' },
];

function initPyramid() {
  const box = $('#py');
  if (!box) return;
  const detail = $('#py-detail');
  const els = LEVELS.map((L, i) => {
    const b = h('button', `py-l py-${L.n}`);
    b.type = 'button';
    b.style.width = `${44 + i * 14}%`;
    b.append(h('b', null, L.sys), h('span', null, `Level ${L.n} · ${L.name}`));
    b.addEventListener('click', () => show(i));
    box.appendChild(b);
    return b;
  });
  function show(i) {
    els.forEach((e, k) => e.classList.toggle('on', k === i));
    const L = LEVELS[i];
    detail.innerHTML = '';
    const t = h('h3', null, '');
    const term = h('span', 'term', L.sys);
    term.dataset.t = L.term;
    term.tabIndex = 0;
    t.append(term, document.createTextNode(` — Level ${L.n}, ${L.name}`));
    detail.append(t, h('p', null, L.what));
    const meta = h('div', 'py-meta');
    meta.append(h('span', null, `⏱ Decisions in: ${L.time}`), h('span', null, `Examples: ${L.ex}`));
    detail.append(meta);
  }
  show(0);
}

/* =========================================================================
   Data infrastructure maturity path
   ========================================================================= */

const STAGES = [
  { k: 'Spreadsheets', term: null, what: 'Data is copied by hand into Excel files. Quick to start, but every person has their own version and numbers disagree.' },
  { k: 'Database', term: 'db', what: 'Data is stored centrally and several people and programs can use the same copy.' },
  { k: 'Data warehouse', term: 'dwh', what: 'Data from many systems is cleaned and combined for reporting, usually loaded with ETL every night.' },
  { k: 'Lakehouse', term: 'lakehouse', what: 'Any kind of data (tables, sensor values, documents) at large scale, organised in bronze, silver and gold layers.' },
  { k: 'Streaming', term: 'streaming', what: 'Data flows continuously and is processed within seconds, e.g. via a Unified Namespace, so screens and alerts are live.' },
];

function initMaturity() {
  const row = $('#mt-row');
  if (!row) return;
  const detail = $('#mt-detail');
  const btns = STAGES.map((s, i) => {
    const b = h('button', 'mt-step');
    b.type = 'button';
    b.append(h('i', null, String(i + 1)), h('b', null, s.k));
    b.addEventListener('click', () => show(i));
    row.appendChild(b);
    return b;
  });
  function show(i) {
    btns.forEach((b, k) => {
      b.classList.toggle('on', k === i);
      b.classList.toggle('done', k < i);
    });
    const s = STAGES[i];
    detail.innerHTML = '';
    const head = h('b', null, '');
    if (s.term) {
      const t = h('span', 'term', s.k);
      t.dataset.t = s.term;
      t.tabIndex = 0;
      head.append(`Stage ${i + 1}: `, t);
    } else head.textContent = `Stage ${i + 1}: ${s.k}`;
    detail.append(head, h('span', null, s.what));
  }
  show(0);
}

/* =========================================================================
   Quiz: which letter?
   ========================================================================= */

const QUIZ = [
  { q: 'A screen on the shop floor shows today’s late work orders.', a: 'B', why: 'Making data visible so people can decide: that is business intelligence.' },
  { q: 'Software notices that a spindle vibrates differently from its normal pattern.', a: 'A', why: 'Recognising patterns in data automatically: AI (anomaly detection).' },
  { q: 'Connecting the machines and the ERP system to one central data store.', a: 'D', why: 'Getting data out of silos and into one place: data infrastructure.' },
  { q: 'Every morning the team picks the top downtime reason and tries a fix.', a: 'C', why: 'Small, measured improvements every day: continuous improvement culture.' },
  { q: 'Agreeing that “machine running” means exactly the same in every system.', a: 'D', why: 'Shared meaning (a semantic layer) is part of the data foundation.' },
  { q: 'A chatbot answers CAM engineers’ questions using the factory’s own tool data.', a: 'A', why: 'A language model grounded in company data: AI.' },
];
const LETTER = { A: 'AI', B: 'BI', C: 'CI', D: 'DI' };

function initQuiz() {
  const box = $('#qz');
  if (!box) return;
  let i = 0;
  let score = 0;
  let answered = false;
  const q = $('#qz-q');
  const fb = $('#qz-fb');
  const prog = $('#qz-prog');
  const btns = [...document.querySelectorAll('#qz-opts button')];
  const next = $('#qz-next');
  function render() {
    answered = false;
    const item = QUIZ[i];
    q.textContent = item.q;
    prog.textContent = `Question ${i + 1} of ${QUIZ.length} · score ${score}`;
    fb.textContent = '';
    fb.className = 'qz-fb';
    btns.forEach((b) => { b.className = `qz-opt l-${b.dataset.a}`; b.disabled = false; });
    next.hidden = true;
  }
  btns.forEach((b) => b.addEventListener('click', () => {
    if (answered) return;
    answered = true;
    const item = QUIZ[i];
    const ok = b.dataset.a === item.a;
    if (ok) score++;
    btns.forEach((x) => {
      x.disabled = true;
      if (x.dataset.a === item.a) x.classList.add('right');
      else if (x === b) x.classList.add('wrong');
    });
    fb.className = `qz-fb ${ok ? 'ok' : 'no'}`;
    fb.textContent = `${ok ? 'Correct!' : `It’s ${item.a} (${LETTER[item.a]}).`} ${item.why}`;
    prog.textContent = `Question ${i + 1} of ${QUIZ.length} · score ${score}`;
    next.hidden = false;
    next.textContent = i === QUIZ.length - 1 ? 'Start again' : 'Next question →';
  }));
  next.addEventListener('click', () => {
    if (i === QUIZ.length - 1) { i = 0; score = 0; } else i++;
    render();
  });
  render();
}

/* =========================================================================
   Flywheel: gently highlight each letter in turn
   ========================================================================= */

function initFlywheel() {
  const nodes = [...document.querySelectorAll('.fw-node')];
  if (!nodes.length) return;
  // Reveal what each letter stands for, one click at a time.
  const rows = [...document.querySelectorAll('#fw-letters .letter-row')];
  rows.forEach((r) => r.classList.add('hid'));
  const reveal = (l) => {
    const r = rows.find((x) => x.dataset.l === l);
    const n = nodes.find((x) => x.dataset.l === l);
    if (!r || !n) return;
    r.classList.remove('hid');
    n.classList.add('shown');
    n.querySelector('span').textContent = r.dataset.short;
    if (rows.every((x) => !x.classList.contains('hid'))) $('#fw-hint').hidden = true;
  };
  nodes.forEach((n) => n.addEventListener('click', () => reveal(n.dataset.l)));
  rows.forEach((r) => r.addEventListener('click', (e) => { if (!e.target.closest('.term')) reveal(r.dataset.l); }));
  $('#fw-all').addEventListener('click', () => rows.forEach((r) => reveal(r.dataset.l)));
  let k = 0;
  setInterval(() => {
    if (!['b-flywheel', 'b-start'].includes(currentSlideId())) return;
    nodes.forEach((n, j) => n.classList.toggle('pulse', j === k % nodes.length));
    k++;
  }, 1400);
}

initTerms();
initGlossaryLists();
initPipe();
initOee();
initDrill();
initPyramid();
initMaturity();
initQuiz();
initFlywheel();
