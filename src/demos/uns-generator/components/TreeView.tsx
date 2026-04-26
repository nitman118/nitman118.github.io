import { useState } from 'react';
import type { UNSNode, UNSNodeKind } from '../types';
import styles from '../styles.module.css';

interface Props {
  root: UNSNode;
}

const KIND_ICON: Record<UNSNodeKind, string> = {
  enterprise: 'fa-building',
  site: 'fa-location-dot',
  area: 'fa-layer-group',
  line: 'fa-grip-lines',
  cell: 'fa-square',
  machine: 'fa-microchip',
  tag: 'fa-tag',
};

const KIND_LABEL: Record<UNSNodeKind, string> = {
  enterprise: 'enterprise',
  site: 'site',
  area: 'area',
  line: 'line',
  cell: 'cell',
  machine: 'machine',
  tag: 'tag',
};

interface NodeProps {
  node: UNSNode;
  depth: number;
  defaultOpen?: boolean;
}

function Node({ node, depth, defaultOpen = true }: NodeProps) {
  const [open, setOpen] = useState(defaultOpen);
  const hasChildren = node.children.length > 0;

  return (
    <div className={styles.nodeWrap}>
      <div
        className={styles.node}
        style={{ paddingLeft: `${depth * 1.1}rem` }}
        onClick={() => hasChildren && setOpen(!open)}
        role={hasChildren ? 'button' : undefined}
        tabIndex={hasChildren ? 0 : -1}
      >
        {hasChildren ? (
          <i className={`fa-solid ${open ? 'fa-chevron-down' : 'fa-chevron-right'} ${styles.chevron}`} />
        ) : (
          <span className={styles.chevronSpace} />
        )}
        <i className={`fa-solid ${KIND_ICON[node.kind]} ${styles.nodeIcon}`} />
        <span className={styles.nodeName}>{node.name}</span>
        <span className={styles.nodeKind}>{KIND_LABEL[node.kind]}</span>
      </div>
      {open && hasChildren && (
        <div>
          {node.children.map((c) => (
            <Node
              key={c.id}
              node={c}
              depth={depth + 1}
              defaultOpen={c.kind !== 'machine'}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TreeView({ root }: Props) {
  return (
    <div className={styles.tree}>
      <Node node={root} depth={0} />
    </div>
  );
}
