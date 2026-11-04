import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { useEffect, useState } from 'react';
import { canUse } from '../entitlements';
import {
  EDGE_MODELS,
  edgeModel,
  installIsCurrent,
  registerEdgeEngine,
  type EdgeEngine,
  type EdgeModelSpec,
} from './edgeEngine';
import { llamaAvailable, loadLlamaModel, RUNTIME_NAME, type LoadedModel } from './llamaRuntime';

/**
 * Offline AI syncing (Premium): download a pinned GGUF model to the device,
 * pick which one is active, and register it as the edge engine.
 *
 * - Files come from a pinned Hugging Face commit and must match the exact
 *   byte size in the catalog; anything else (a captive-portal page, a cut
 *   connection) is deleted, never loaded.
 * - Downloads write to `<file>.part` and only become the model once complete.
 * - When the catalog ships a new revision (via an app or OTA update), the
 *   installed file is reported as "update available" and the learner can
 *   re-download it; the old file stays usable until then.
 * - The model loads lazily on the first offline question, not at startup,
 *   so a 1–2 GB model never costs memory for learners who stay online.
 */
const K_INSTALLED = 'bolingo.edgeModels.v1';
const K_ACTIVE = 'bolingo.edgeModels.active';
/** Keep this much disk free after a download. */
const DISK_HEADROOM_BYTES = 500 * 1024 * 1024;

export interface InstalledModel {
  id: string;
  revision: string;
  bytes: number;
  uri: string;
  installedAt: number;
}

export interface ModelRow {
  spec: EdgeModelSpec;
  installed: InstalledModel | null;
  /** Installed from an older pinned revision. */
  updateAvailable: boolean;
  active: boolean;
}

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((fn) => fn());

export function modelDownloadsSupported(): boolean {
  return !!FileSystem.documentDirectory && llamaAvailable();
}

function modelsDir(): string {
  if (!FileSystem.documentDirectory) throw new Error('Model downloads need the Bolingo mobile app.');
  return `${FileSystem.documentDirectory}models/`;
}

async function readInstalled(): Promise<Record<string, InstalledModel>> {
  try {
    const raw = await AsyncStorage.getItem(K_INSTALLED);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, InstalledModel>) : {};
  } catch {
    return {};
  }
}

async function writeInstalled(map: Record<string, InstalledModel>): Promise<void> {
  try {
    await AsyncStorage.setItem(K_INSTALLED, JSON.stringify(map));
  } catch {}
}

export async function getActiveModelId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(K_ACTIVE);
  } catch {
    return null;
  }
}

export async function listModels(): Promise<ModelRow[]> {
  const installed = await readInstalled();
  const active = await getActiveModelId();
  const rows: ModelRow[] = [];
  for (const spec of EDGE_MODELS) {
    let entry: InstalledModel | null = installed[spec.id] ?? null;
    if (entry && FileSystem.documentDirectory) {
      const info = await FileSystem.getInfoAsync(entry.uri).catch(() => null);
      if (!info?.exists) entry = null; // file removed by the OS or the learner
    }
    rows.push({
      spec,
      installed: entry,
      updateAvailable: !!entry && !installIsCurrent(spec, entry),
      active: !!entry && active === spec.id,
    });
  }
  return rows;
}

export interface DownloadHandle {
  promise: Promise<InstalledModel>;
  cancel: () => Promise<void>;
}

export function startModelDownload(
  spec: EdgeModelSpec,
  isPremium: boolean,
  onProgress: (fraction: number) => void
): DownloadHandle {
  let resumable: FileSystem.DownloadResumable | null = null;
  let cancelled = false;
  const promise = (async () => {
    if (!canUse('offline_model', isPremium)) throw new Error('Offline AI models are a Premium feature.');
    if (!modelDownloadsSupported()) throw new Error('This build of the app cannot run on-device models.');
    const free = await FileSystem.getFreeDiskStorageAsync().catch(() => Number.POSITIVE_INFINITY);
    if (free < spec.bytes + DISK_HEADROOM_BYTES) {
      throw new Error(`Not enough space: ${spec.name} needs about ${Math.ceil((spec.bytes + DISK_HEADROOM_BYTES) / 1e9)} GB free.`);
    }
    const dir = modelsDir();
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
    const finalUri = `${dir}${spec.fileName}`;
    const partUri = `${finalUri}.part`;
    resumable = FileSystem.createDownloadResumable(spec.url, partUri, {}, (p) => {
      const total = p.totalBytesExpectedToWrite > 0 ? p.totalBytesExpectedToWrite : spec.bytes;
      onProgress(Math.min(1, p.totalBytesWritten / total));
    });
    const result = await resumable.downloadAsync();
    if (cancelled || !result) {
      // Don't leave a partial multi-GB file behind.
      await FileSystem.deleteAsync(partUri, { idempotent: true }).catch(() => {});
      throw new Error('Download cancelled.');
    }
    if (result.status !== 200) {
      await FileSystem.deleteAsync(partUri, { idempotent: true });
      throw new Error(`Download failed (HTTP ${result.status}). Try again on Wi-Fi.`);
    }
    const info = await FileSystem.getInfoAsync(partUri);
    const size = info.exists ? (info as { size?: number }).size ?? 0 : 0;
    if (size !== spec.bytes) {
      await FileSystem.deleteAsync(partUri, { idempotent: true });
      throw new Error('The downloaded file was incomplete or wrong, so it was deleted. Please try again.');
    }
    await FileSystem.deleteAsync(finalUri, { idempotent: true });
    await FileSystem.moveAsync({ from: partUri, to: finalUri });
    const entry: InstalledModel = {
      id: spec.id,
      revision: spec.revision,
      bytes: spec.bytes,
      uri: finalUri,
      installedAt: Date.now(),
    };
    const map = await readInstalled();
    map[spec.id] = entry;
    await writeInstalled(map);
    if (!(await getActiveModelId())) await setActiveModel(spec.id, isPremium);
    else emit();
    return entry;
  })();
  return {
    promise,
    cancel: async () => {
      cancelled = true;
      await resumable?.pauseAsync().catch(() => {});
    },
  };
}

export async function deleteModel(id: string, isPremium: boolean): Promise<void> {
  const map = await readInstalled();
  const entry = map[id];
  if (entry) {
    await FileSystem.deleteAsync(entry.uri, { idempotent: true }).catch(() => {});
    await FileSystem.deleteAsync(`${entry.uri}.part`, { idempotent: true }).catch(() => {});
    delete map[id];
    await writeInstalled(map);
  }
  if ((await getActiveModelId()) === id) {
    try {
      await AsyncStorage.removeItem(K_ACTIVE);
    } catch {}
  }
  await activateEdgeEngine(isPremium);
}

export async function setActiveModel(id: string | null, isPremium: boolean): Promise<void> {
  try {
    if (id) await AsyncStorage.setItem(K_ACTIVE, id);
    else await AsyncStorage.removeItem(K_ACTIVE);
  } catch {}
  await activateEdgeEngine(isPremium);
}

let loaded: { id: string; model: LoadedModel } | null = null;
let loading: Promise<LoadedModel> | null = null;

async function releaseLoaded(): Promise<void> {
  const current = loaded;
  loaded = null;
  if (current) await current.model.release().catch(() => {});
}

/**
 * Register the active installed model as the edge engine — or clear the
 * slot if there is none, the learner is not Premium, or the runtime is
 * missing. Cheap: the model itself loads on first use.
 */
export async function activateEdgeEngine(isPremium: boolean): Promise<boolean> {
  const id = await getActiveModelId();
  const spec = edgeModel(id);
  const entry = spec ? (await readInstalled())[spec.id] : undefined;
  const ok = !!spec && !!entry && canUse('offline_model', isPremium) && llamaAvailable();
  if (!ok || !spec || !entry) {
    registerEdgeEngine(null);
    await releaseLoaded();
    emit();
    return false;
  }
  if (loaded && loaded.id !== spec.id) await releaseLoaded();
  const engine: EdgeEngine = {
    runtime: RUNTIME_NAME,
    modelId: spec.name,
    async generate(prompt, opts) {
      if (!loaded) {
        if (!loading) {
          loading = loadLlamaModel(entry.uri).finally(() => {
            loading = null;
          });
        }
        loaded = { id: spec.id, model: await loading };
      }
      return loaded.model.generate(prompt, { maxTokens: opts?.maxTokens });
    },
  };
  registerEdgeEngine(engine);
  emit();
  return true;
}

/** Re-render when models are installed, removed or switched. */
export function useModelStoreVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    const fn = () => setV((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return v;
}
