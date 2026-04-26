import type { UNSGenerationInput, UNSGenerationResult, UNSNode } from './types';

let counter = 0;
const nextId = () => `n${++counter}`;

const slugify = (s: string) =>
  s
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

const STANDARD_TAGS = ['status', 'mode', 'partCount', 'cycleTime', 'temperature', 'spindleLoad'];

interface Parsed {
  cellCount: number;
  cellLabel: string;
  machinesPerCell: number;
  machineLabel: string;
  hasAGV: boolean;
  agvCount: number;
  hasASRS: boolean;
}

const parseDescription = (text: string): Parsed => {
  const lower = text.toLowerCase();

  const numFromPhrase = (regex: RegExp, fallback: number) => {
    const m = lower.match(regex);
    if (!m) return fallback;
    const n = parseInt(m[1], 10);
    return isNaN(n) ? fallback : n;
  };

  const cellCount = numFromPhrase(/(\d+)\s*(cell|line|workshop|production line)/, 2);

  let cellLabel = 'Cell';
  if (/line/.test(lower)) cellLabel = 'Line';
  else if (/workshop/.test(lower)) cellLabel = 'Workshop';

  const machinesPerCell = numFromPhrase(/(\d+)\s*(machine|cnc|lathe|mill)/, 3);

  let machineLabel = 'Machine';
  if (/cnc/.test(lower)) machineLabel = 'CNC';
  else if (/lathe/.test(lower)) machineLabel = 'Lathe';
  else if (/mill/.test(lower)) machineLabel = 'Mill';

  const hasAGV = /agv|automated\s*guided/.test(lower);
  const agvCount = hasAGV ? numFromPhrase(/(\d+)\s*agv/, 2) : 0;
  const hasASRS = /as\/rs|asrs|storage|warehouse/.test(lower);

  return { cellCount, cellLabel, machinesPerCell, machineLabel, hasAGV, agvCount, hasASRS };
};

const tagNode = (name: string): UNSNode => ({
  id: nextId(),
  name,
  kind: 'tag',
  children: [],
});

const machineNode = (name: string): UNSNode => ({
  id: nextId(),
  name,
  kind: 'machine',
  children: STANDARD_TAGS.map(tagNode),
});

export const mockGenerate = async (
  input: UNSGenerationInput,
): Promise<UNSGenerationResult> => {
  // simulated latency
  await new Promise((r) => setTimeout(r, 700));

  counter = 0;
  const { enterpriseName, siteName, description } = input;
  const parsed = parseDescription(description);

  const cellNodes: UNSNode[] = [];
  for (let c = 1; c <= parsed.cellCount; c++) {
    const machines: UNSNode[] = [];
    for (let m = 1; m <= parsed.machinesPerCell; m++) {
      machines.push(machineNode(`${parsed.machineLabel}_${c}_${m}`));
    }
    cellNodes.push({
      id: nextId(),
      name: `${parsed.cellLabel}_${c}`,
      kind: parsed.cellLabel === 'Line' ? 'line' : 'cell',
      children: machines,
    });
  }

  const areaChildren: UNSNode[] = [...cellNodes];

  if (parsed.hasAGV) {
    const agvs: UNSNode[] = [];
    for (let i = 1; i <= parsed.agvCount; i++) {
      agvs.push({
        id: nextId(),
        name: `AGV_${i}`,
        kind: 'machine',
        children: ['status', 'battery', 'location', 'currentJob'].map(tagNode),
      });
    }
    areaChildren.push({
      id: nextId(),
      name: 'Intralogistics',
      kind: 'area',
      children: agvs,
    });
  }

  if (parsed.hasASRS) {
    areaChildren.push({
      id: nextId(),
      name: 'Storage',
      kind: 'area',
      children: [
        {
          id: nextId(),
          name: 'AS_RS_1',
          kind: 'machine',
          children: ['status', 'occupancy', 'pickQueue'].map(tagNode),
        },
      ],
    });
  }

  const tree: UNSNode = {
    id: nextId(),
    name: slugify(enterpriseName) || 'Enterprise',
    kind: 'enterprise',
    children: [
      {
        id: nextId(),
        name: slugify(siteName) || 'Site',
        kind: 'site',
        children: [
          {
            id: nextId(),
            name: 'Production',
            kind: 'area',
            children: areaChildren,
          },
        ],
      },
    ],
  };

  const notes: string[] = [
    'This is a mock generator running locally — no LLM call yet.',
    `Detected: ${parsed.cellCount} ${parsed.cellLabel.toLowerCase()}(s) with ${parsed.machinesPerCell} ${parsed.machineLabel.toLowerCase()}(s) each.`,
  ];
  if (parsed.hasAGV) notes.push(`${parsed.agvCount} AGV(s) added under an Intralogistics area.`);
  if (parsed.hasASRS) notes.push('AS/RS or storage detected — added a Storage area.');
  notes.push('Topic structure follows a simplified ISA-95 hierarchy.');

  return { tree, notes };
};

export const treeToTopicList = (root: UNSNode): string[] => {
  const out: string[] = [];
  const walk = (node: UNSNode, path: string[]) => {
    const here = [...path, node.name];
    if (node.children.length === 0) {
      out.push(here.join('/'));
    } else {
      for (const child of node.children) walk(child, here);
    }
  };
  walk(root, []);
  return out;
};
