import { useEffect, useState, type ReactNode } from 'react';
import { useStore } from '../store';

export function Button({ children, onClick, kind = 'default', disabled, small, wide }: {
  children: ReactNode; onClick?: () => void; kind?: 'default' | 'primary' | 'danger' | 'ghost' | 'gold'; disabled?: boolean; small?: boolean; wide?: boolean;
}) {
  return (
    <button className={`btn ${kind}${small ? ' small' : ''}${wide ? ' wide' : ''}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

export function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      <div className="section-head">
        <h2>{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Toast() {
  const t = useStore((s) => s.toast);
  const [shown, setShown] = useState<typeof t>(null);
  useEffect(() => {
    if (!t) return;
    setShown(t);
    const h = setTimeout(() => setShown(null), 2600);
    return () => clearTimeout(h);
  }, [t]);
  if (!shown) return null;
  return <div className={`toast${shown.bad ? ' bad' : ''}`}>{shown.text}</div>;
}

export function Modal({ children, onClose, title }: { children: ReactNode; onClose: () => void; title?: string }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>{title}</b>
          <button className="x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Price input with − / + steps. */
export function PriceInput({ value, onChange, big }: { value: number; onChange: (v: number) => void; big?: boolean }) {
  const step = value >= 100 ? 5 : value >= 10 ? 1 : value >= 1 ? 0.25 : 0.05;
  return (
    <div className={`price-input${big ? ' big' : ''}`}>
      <button onClick={() => onChange(Math.max(0.05, +(value - step).toFixed(2)))}>−</button>
      <input inputMode="decimal" value={value} onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(v); }} />
      <button onClick={() => onChange(+(value + step).toFixed(2))}>+</button>
    </div>
  );
}
