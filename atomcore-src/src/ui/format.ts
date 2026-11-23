const SUFFIX: [number, string][] = [
  [1e15, 'Q'],
  [1e12, 'T'],
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'k'],
];

export function fmtNum(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '—';
  const a = Math.abs(n);
  for (const [v, s] of SUFFIX) {
    if (a >= v) {
      const x = n / v;
      return `${x.toFixed(Math.abs(x) >= 100 ? 0 : digits)}${s}`;
    }
  }
  if (a >= 100) return Math.round(n).toString();
  return n.toFixed(a >= 10 ? Math.min(digits, 1) : digits).replace(/\.0+$/, '');
}

export function fmtMoney(n: number, digits = 1): string {
  const neg = n < 0;
  const a = Math.abs(n);
  const body = a < 10 && a > 0 && Math.abs(a - Math.round(a)) > 0.005
    ? a.toFixed(a < 1 ? 2 : 1)
    : a < 1000 ? Math.round(a).toLocaleString('en-US') : fmtNum(a, digits >= 2 ? 2 : digits);
  return `${neg ? '−' : ''}$${body}`;
}

export function fmtMoneyFull(n: number): string {
  return `${n < 0 ? '−' : ''}$${Math.round(Math.abs(n)).toLocaleString('en-US')}`;
}

export function fmtPower(mw: number): string {
  const a = Math.abs(mw);
  if (a >= 1e6) return `${(mw / 1e6).toFixed(2)} TW`;
  if (a >= 1000) return `${(mw / 1000).toFixed(a >= 1e4 ? 1 : 2)} GW`;
  if (a >= 100) return `${Math.round(mw)} MW`;
  return `${mw.toFixed(1)} MW`;
}

export function fmtEnergy(mwh: number): string {
  const a = Math.abs(mwh);
  if (a >= 1e6) return `${(mwh / 1e6).toFixed(2)} TWh`;
  if (a >= 1000) return `${(mwh / 1000).toFixed(2)} GWh`;
  return `${fmtNum(mwh)} MWh`;
}

export function fmtTime(sec: number): string {
  sec = Math.max(0, Math.round(sec));
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ${`${sec % 60}`.padStart(2, '0')}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${`${m % 60}`.padStart(2, '0')}m`;
}

export function fmtPct(f: number, digits = 0): string {
  return `${(f * 100).toFixed(digits)}%`;
}
