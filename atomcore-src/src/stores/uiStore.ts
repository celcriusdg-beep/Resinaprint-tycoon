import { create } from 'zustand';
import type { BuildingType, LinkKind, Notice } from '../game/types';
import type { OfflineReport } from '../systems/offline/offline';

export type PanelId = 'status' | 'build' | 'research' | 'manage' | 'supply' | 'market' | 'goals' | 'sites' | 'settings';

export interface Toast extends Notice {
  id: number;
  at: number;
  count?: number;
}

export interface Placement {
  type: BuildingType;
  rot: number;
  x: number | null;
  z: number | null;
  /** When set, this placement relocates an existing building. */
  moveId?: number;
}

/** Connect mode: running a pipe or cable from one building to another. */
export interface ConnectMode {
  from: number;
  kind: LinkKind;
  target: number | null;
}

export type CameraCommand =
  | { kind: 'focus'; x: number; z: number; distance?: number; nonce: number }
  | { kind: 'rotate'; delta: number; nonce: number }
  | { kind: 'zoom'; factor: number; nonce: number }
  | { kind: 'reset'; nonce: number };

type DistOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type CameraInput = DistOmit<CameraCommand, 'nonce'>;

export type Modal =
  | { kind: 'offline'; report: OfflineReport }
  | { kind: 'confirm'; title: string; text: string; confirmLabel: string; danger?: boolean; onConfirm: () => void }
  | { kind: 'welcome' }
  | { kind: 'loadError'; text: string };

interface UIStore {
  panel: PanelId | null;
  selectedId: number | null;
  placement: Placement | null;
  toasts: Toast[];
  modal: Modal | null;
  camera: CameraCommand | null;
  hoverId: number | null;
  connect: ConnectMode | null;
  startConnect: (from: number, kind: LinkKind, target?: number | null) => void;
  setConnectTarget: (target: number | null) => void;
  /** Leave connect mode and go back to the source building. */
  cancelConnect: () => void;
  setPanel: (p: PanelId | null) => void;
  togglePanel: (p: PanelId) => void;
  select: (id: number | null) => void;
  startPlacement: (type: BuildingType) => void;
  startMove: (id: number, type: BuildingType, x: number, z: number, rot: number) => void;
  updatePlacement: (p: Partial<Placement>) => void;
  cancelPlacement: () => void;
  pushToast: (n: Notice) => void;
  dismissToast: (id: number) => void;
  setModal: (m: Modal | null) => void;
  cameraCmd: (c: CameraInput) => void;
  setHover: (id: number | null) => void;
}

let toastId = 1;
let nonce = 1;

export const useUI = create<UIStore>((set) => ({
  panel: null,
  selectedId: null,
  placement: null,
  toasts: [],
  modal: null,
  camera: null,
  hoverId: null,
  connect: null,
  startConnect: (from, kind, target = null) => set({ connect: { from, kind, target }, selectedId: null, panel: null, placement: null }),
  setConnectTarget: (target) => set((s) => (s.connect ? { connect: { ...s.connect, target } } : {})),
  cancelConnect: () => set((s) => (s.connect ? { connect: null, selectedId: s.connect.from } : {})),
  setPanel: (p) => set({ panel: p }),
  togglePanel: (p) => set((s) => ({ panel: s.panel === p ? null : p, selectedId: s.panel === p ? s.selectedId : null })),
  select: (id) => set((s) => ({ selectedId: id, panel: id !== null ? null : s.panel })),
  startPlacement: (type) => set((s) => ({ placement: { type, rot: s.placement?.moveId === undefined ? s.placement?.rot ?? 0 : 0, x: null, z: null }, selectedId: null })),
  updatePlacement: (p) => set((s) => (s.placement ? { placement: { ...s.placement, ...p } } : {})),
  startMove: (id, type, x, z, rot) => set({ placement: { type, rot, x, z, moveId: id }, selectedId: null, panel: null }),
  cancelPlacement: () => set((s) => (s.placement?.moveId !== undefined ? { placement: null, selectedId: s.placement.moveId } : { placement: null })),
  pushToast: (n) =>
    set((s) => {
      // Merge bursts of identical notices (e.g. several reactors tripping at once).
      const mergeable = n.kind === 'scram' || n.kind === 'bad' || n.kind === 'warn';
      const dup = mergeable ? s.toasts.find((x) => x.title === n.title && x.kind === n.kind && Date.now() - x.at < 6000) : undefined;
      if (dup) {
        const count = (dup.count ?? 1) + 1;
        const merged: Toast = { ...dup, count, text: `${n.text ?? ''} (×${count})`.trim(), at: Date.now() };
        return { toasts: s.toasts.map((x) => (x.id === dup.id ? merged : x)) };
      }
      const t: Toast = { ...n, id: toastId++, at: Date.now() };
      const toasts = [...s.toasts, t].slice(-4);
      return { toasts };
    }),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setModal: (m) => set({ modal: m }),
  cameraCmd: (c) => set({ camera: { ...c, nonce: nonce++ } as CameraCommand }),
  setHover: (id) => set({ hoverId: id }),
}));
