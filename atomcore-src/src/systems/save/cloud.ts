import type { GameState } from '../../game/types';
import { encodeSave, decodeSave } from './serialize';

// Cloud-save architecture. The game talks to a CloudSaveProvider; today the
// only provider is "none" (not configured), so the UI shows cloud sync as
// unavailable rather than pretending it works. A future backend (e.g. a small
// HTTPS API with user accounts) only needs to implement this interface and be
// registered with setCloudProvider().

export interface CloudSaveMeta {
  updatedAt: number;
  device: string;
  level: number;
}

export interface CloudSaveProvider {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;
  signIn(): Promise<void>;
  upload(code: string, meta: CloudSaveMeta): Promise<void>;
  download(): Promise<{ code: string; meta: CloudSaveMeta } | null>;
}

class NoCloudProvider implements CloudSaveProvider {
  readonly id = 'none';
  readonly name = 'Not configured';
  isConfigured() {
    return false;
  }
  async signIn() {
    throw new Error('Cloud saves are not available yet. Use Export / Import to move saves between devices.');
  }
  async upload() {
    throw new Error('Cloud saves are not available yet.');
  }
  async download() {
    return null;
  }
}

let provider: CloudSaveProvider = new NoCloudProvider();

export function getCloudProvider(): CloudSaveProvider {
  return provider;
}

export function setCloudProvider(p: CloudSaveProvider): void {
  provider = p;
}

export async function cloudUpload(s: GameState): Promise<void> {
  await provider.upload(encodeSave(s), { updatedAt: Date.now(), device: navigator.userAgent.slice(0, 60), level: s.level });
}

export async function cloudDownload(): Promise<GameState | null> {
  const res = await provider.download();
  return res ? decodeSave(res.code) : null;
}
