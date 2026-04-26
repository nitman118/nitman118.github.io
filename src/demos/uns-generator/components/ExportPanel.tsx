import { useState } from 'react';
import type { UNSNode } from '../types';
import { treeToTopicList } from '../mockGenerator';
import styles from '../styles.module.css';

interface Props {
  root: UNSNode;
}

type Format = 'topics' | 'json';

export function ExportPanel({ root }: Props) {
  const [format, setFormat] = useState<Format>('topics');
  const [copied, setCopied] = useState(false);

  const value =
    format === 'topics'
      ? treeToTopicList(root).join('\n')
      : JSON.stringify(root, null, 2);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={styles.exportPanel}>
      <div className={styles.exportHeader}>
        <div className={styles.tabRow}>
          <button
            type="button"
            className={`${styles.tab} ${format === 'topics' ? styles.tabActive : ''}`}
            onClick={() => setFormat('topics')}
          >
            MQTT topics
          </button>
          <button
            type="button"
            className={`${styles.tab} ${format === 'json' ? styles.tabActive : ''}`}
            onClick={() => setFormat('json')}
          >
            JSON
          </button>
        </div>
        <button type="button" className={styles.copyBtn} onClick={copy}>
          <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} />
          {copied ? ' Copied' : ' Copy'}
        </button>
      </div>
      <pre className={styles.codeBlock}>{value}</pre>
    </div>
  );
}
