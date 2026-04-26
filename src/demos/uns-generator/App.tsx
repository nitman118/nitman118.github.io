import { useState } from 'react';
import { InputPanel } from './components/InputPanel';
import { TreeView } from './components/TreeView';
import { ExportPanel } from './components/ExportPanel';
import { mockGenerate } from './mockGenerator';
import type { UNSGenerationInput, UNSGenerationResult } from './types';
import styles from './styles.module.css';

const DEFAULT_INPUT: UNSGenerationInput = {
  enterpriseName: 'KMWE',
  siteName: 'Eindhoven',
  description: '',
};

export default function App() {
  const [input, setInput] = useState<UNSGenerationInput>(DEFAULT_INPUT);
  const [result, setResult] = useState<UNSGenerationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await mockGenerate(input);
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.app}>
      <div className={styles.layout}>
        <div className={styles.left}>
          <InputPanel
            value={input}
            onChange={setInput}
            onSubmit={handleGenerate}
            loading={loading}
          />

          {result && (
            <div className={styles.notesPanel}>
              <h4 className={styles.notesTitle}>
                <i className="fa-solid fa-circle-info" /> Notes
              </h4>
              <ul>
                {result.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className={styles.right}>
          <h3 className={styles.panelTitle}>2. Generated UNS hierarchy</h3>
          {error && <div className={styles.error}>{error}</div>}

          {!result && !loading && (
            <div className={styles.emptyState}>
              <i className="fa-solid fa-sitemap" />
              <p>Describe your factory on the left and hit "Generate" to see a candidate Unified Namespace tree.</p>
            </div>
          )}

          {loading && (
            <div className={styles.emptyState}>
              <span className={styles.spinner} />
              <p>Generating tree…</p>
            </div>
          )}

          {result && (
            <>
              <TreeView root={result.tree} />

              <h3 className={styles.panelTitle} style={{ marginTop: '2rem' }}>
                3. Export
              </h3>
              <ExportPanel root={result.tree} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
