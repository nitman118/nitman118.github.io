import type { UNSGenerationInput } from '../types';
import styles from '../styles.module.css';

interface Props {
  value: UNSGenerationInput;
  onChange: (next: UNSGenerationInput) => void;
  onSubmit: () => void;
  loading: boolean;
}

const SAMPLES: { label: string; description: string }[] = [
  {
    label: 'Small precision shop',
    description:
      'KMWE Eindhoven has 3 production cells, each with 4 CNC machines. There are 2 AGVs delivering parts and a vertical AS/RS for tools.',
  },
  {
    label: 'Two-line assembly plant',
    description:
      'A factory with 2 assembly lines, each line has 6 stations. There is one AGV moving parts between lines.',
  },
  {
    label: 'Job shop',
    description:
      'A workshop with 5 lathes and 2 mills. No AGVs. One central storage rack.',
  },
];

export function InputPanel({ value, onChange, onSubmit, loading }: Props) {
  const set = (patch: Partial<UNSGenerationInput>) => onChange({ ...value, ...patch });
  const canSubmit = value.description.trim().length > 0 && !loading;

  return (
    <div className={styles.inputPanel}>
      <h3 className={styles.panelTitle}>1. Describe your factory</h3>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Enterprise</span>
          <input
            type="text"
            className={styles.input}
            value={value.enterpriseName}
            onChange={(e) => set({ enterpriseName: e.target.value })}
            placeholder="KMWE"
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Site</span>
          <input
            type="text"
            className={styles.input}
            value={value.siteName}
            onChange={(e) => set({ siteName: e.target.value })}
            placeholder="Eindhoven"
          />
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Description</span>
        <textarea
          rows={5}
          className={styles.textarea}
          value={value.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="A factory with 3 cells, each with 4 CNC machines, and 2 AGVs..."
        />
      </label>

      <div className={styles.samples}>
        <span className={styles.samplesLabel}>Try a sample:</span>
        {SAMPLES.map((s) => (
          <button
            type="button"
            key={s.label}
            className={styles.chip}
            onClick={() => set({ description: s.description })}
          >
            {s.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        className={styles.primaryBtn}
        onClick={onSubmit}
        disabled={!canSubmit}
      >
        {loading ? (
          <>
            <span className={styles.spinner} aria-hidden="true" />
            Generating…
          </>
        ) : (
          <>Generate UNS tree →</>
        )}
      </button>
    </div>
  );
}
