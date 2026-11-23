import { create } from 'zustand';
import { loadSettingsRaw, saveSettingsRaw } from '../systems/save/storage';

export type Quality = 'auto' | 'low' | 'medium' | 'high';

export interface Settings {
  master: number;
  sfx: number;
  ambience: number;
  music: number;
  muted: boolean;
  quality: Quality;
  dayNight: boolean;
  showFps: boolean;
  haptics: boolean;
  seenWelcome: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  master: 0.8,
  sfx: 0.7,
  ambience: 0.5,
  music: 0.35,
  muted: false,
  quality: 'auto',
  dayNight: true,
  showFps: false,
  haptics: true,
  seenWelcome: false,
};

interface SettingsStore extends Settings {
  loaded: boolean;
  set: (patch: Partial<Settings>) => void;
  load: () => Promise<void>;
}

export const useSettings = create<SettingsStore>((set, get) => ({
  ...DEFAULT_SETTINGS,
  loaded: false,
  set: (patch) => {
    set(patch);
    const { loaded: _l, set: _s, load: _ld, ...rest } = { ...get() };
    void _l; void _s; void _ld;
    void saveSettingsRaw(rest).catch(() => undefined);
  },
  load: async () => {
    try {
      const raw = await loadSettingsRaw<Partial<Settings>>();
      const params = new URLSearchParams(window.location.search);
      const q = params.get('quality');
      const override: Partial<Settings> = q && ['auto', 'low', 'medium', 'high'].includes(q) ? { quality: q as Quality } : {};
      set({ ...DEFAULT_SETTINGS, ...(raw ?? {}), ...override, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
}));

export function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window);
}

/** Resolve "auto" to a concrete quality tier for this device. */
export function resolveQuality(q: Quality): Exclude<Quality, 'auto'> {
  if (q !== 'auto') return q;
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (isTouchDevice() || small) return mem !== undefined && mem <= 2 ? 'low' : 'medium';
  return 'high';
}
