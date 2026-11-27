// Swappable random source so tests can be deterministic.

let rand: () => number = Math.random;

export function setRandom(fn: () => number): void {
  rand = fn;
}

export function random(): number {
  return rand();
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(list: T[]): T {
  return list[Math.floor(random() * list.length)];
}

export function between(a: number, b: number): number {
  return a + random() * (b - a);
}

/** Standard normal sample (Box-Muller). */
export function gauss(): number {
  const u = Math.max(1e-9, random());
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function weighted<T>(items: [T, number][]): T {
  const total = items.reduce((a, [, w]) => a + w, 0);
  let r = random() * total;
  for (const [it, w] of items) {
    r -= w;
    if (r <= 0) return it;
  }
  return items[items.length - 1][0];
}
