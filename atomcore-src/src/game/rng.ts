/** Small seeded PRNG (mulberry32) for reproducible daily objectives and tests. */
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

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Replaceable random source so tests can make the simulation deterministic. */
let rand: () => number = Math.random;
export function random(): number {
  return rand();
}
export function setRandom(fn: () => number): void {
  rand = fn;
}

export function pick<T>(arr: T[], r: () => number = random): T {
  return arr[Math.floor(r() * arr.length) % arr.length];
}
