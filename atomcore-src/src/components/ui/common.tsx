import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icons';
import { audio } from '../../systems/audio/audio';

export function Bar({ value, max = 1, color, warn, height = 6 }: { value: number; max?: number; color?: string; warn?: boolean; height?: number }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1e-9, max)) * 100));
  return (
    <div className="bar" style={{ height }}>
      <div className={`bar-fill${warn ? ' warn' : ''}`} style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'good' | 'bad' | 'warn' | 'dim' }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${tone ?? ''}`}>{value}</div>
      {sub !== undefined && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function Button({
  children, onClick, icon, variant = 'default', disabled, small, title, wide,
}: {
  children?: ReactNode; onClick?: () => void; icon?: IconName; variant?: 'default' | 'primary' | 'danger' | 'ghost' | 'good';
  disabled?: boolean; small?: boolean; title?: string; wide?: boolean;
}) {
  return (
    <button
      type="button"
      className={`btn btn-${variant}${small ? ' btn-sm' : ''}${wide ? ' btn-wide' : ''}`}
      disabled={disabled}
      title={title}
      onClick={() => {
        if (disabled) return;
        onClick?.();
      }}
    >
      {icon && <Icon name={icon} size={small ? 15 : 17} />}
      {children && <span>{children}</span>}
    </button>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; icon?: IconName }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={t.id === value} className={`tab${t.id === value ? ' active' : ''}`}
          onClick={() => { audio.sfx('click'); onChange(t.id); }}>
          {t.icon && <Icon name={t.icon} size={15} />}
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="section">
      <div className="section-head">
        <h3>{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Toggle({ on, onChange, disabled, label, sub }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string; sub?: ReactNode }) {
  return (
    <label className={`toggle-row${disabled ? ' disabled' : ''}`}>
      <div>
        <div className="toggle-label">{label}</div>
        {sub && <div className="toggle-sub">{sub}</div>}
      </div>
      <button type="button" role="switch" aria-checked={on} disabled={disabled}
        className={`switch${on ? ' on' : ''}`} onClick={() => { if (!disabled) { audio.sfx('click'); onChange(!on); } }}>
        <span />
      </button>
    </label>
  );
}

export function Slider({ value, onChange, min = 0, max = 1, step = 0.01, label, format }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label?: string; format?: (v: number) => string;
}) {
  return (
    <div className="slider-row">
      {label && (
        <div className="slider-head">
          <span>{label}</span>
          <span className="mono">{format ? format(value) : value.toFixed(2)}</span>
        </div>
      )}
      <input type="range" min={min} max={max} step={step} value={value}
        style={{ ['--pct' as string]: `${((value - min) / (max - min)) * 100}%` }}
        onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

export function Sparkline({ values, color = '#4fd1ff', height = 46, fill = true, min }: { values: number[]; color?: string; height?: number; fill?: boolean; min?: number }) {
  if (values.length < 2) return <div className="spark-empty" style={{ height }}>Collecting data…</div>;
  const lo = min ?? Math.min(...values);
  const hi = Math.max(...values, lo + 1e-9);
  const w = 100;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, height - 3 - ((v - lo) / (hi - lo)) * (height - 6)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ height }}>
      {fill && <path d={`${d} L${w},${height} L0,${height} Z`} fill={color} opacity={0.14} />}
      <path d={d} fill="none" stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
