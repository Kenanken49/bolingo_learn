import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { openURL } from 'expo-linking';
import { api } from './api';
import { track } from './telemetry';
import {
  decideUpdate,
  parseRelease,
  type LatestRelease,
  type UpdateDecision,
} from './releaseManifest';

/**
 * Asks the website whether it is serving a newer Android build than this
 * install, and opens the download when the learner accepts.
 *
 * The app is sideloaded — no store watches it — so the release record published
 * beside the APK (`/downloads/latest.json`, copied by `scripts/publish-apk.sh`)
 * is the only way an installed phone learns a newer build exists. JS-only work
 * still goes out silently through EAS Update; this covers the rebuilds that OTA
 * cannot touch, and hands the learner the download rather than a dead end:
 * Android will not let an app install an APK over itself.
 *
 * The version rule itself is pure data in `lib/releaseManifest.ts` so the
 * publish gate can exercise it without a device.
 */

const MANIFEST_PATH = '/downloads/latest.json';
/** Background polish, not a blocking screen: give up well before a learner notices. */
const TIMEOUT_MS = 8000;

/** Version this install was built with, from the app config baked into the binary. */
export function installedVersion(): string {
  return Constants.expoConfig?.version ?? '';
}

function installedPackage(): string | null {
  return Constants.expoConfig?.android?.package ?? null;
}

/**
 * Turning a release down lasts the running session only. A sideloaded install
 * has no other way to hear about a rebuild, so "Not now" must not become
 * "never" — the next launch asks again, and a newer build asks regardless.
 */
let dismissedVersion: string | null = null;

// One fetch per session, shared by the dashboard offer and the Settings check.
let releasePromise: Promise<LatestRelease | null> | null = null;

function withTimeout<T>(task: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`release manifest timed out after ${ms}ms`)), ms);
    task.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

async function loadRelease(force: boolean): Promise<LatestRelease | null> {
  if (!releasePromise || force) {
    releasePromise = (async () => {
      try {
        return parseRelease(await withTimeout(api<unknown>(MANIFEST_PATH), TIMEOUT_MS));
      } catch {
        // Offline, DNS trouble, an old server, a record that no longer parses —
        // all of them mean the same thing to the learner: say nothing.
        return null;
      }
    })();
  }
  return releasePromise;
}

/** Whether this install should offer the published build, and what it points at. */
export async function checkAppUpdate(force = false): Promise<UpdateDecision> {
  if (Platform.OS !== 'android') {
    // The artefact is an APK. iOS has no sideload path and the web build is
    // reloaded from the server anyway, so neither should make a request.
    return { offer: false, reason: 'not-installable' };
  }
  const release = await loadRelease(force);
  if (!release) return { offer: false, reason: 'unreachable' };
  const decision = decideUpdate({
    platform: Platform.OS,
    installed: installedVersion(),
    installedPackage: installedPackage(),
    release,
    dismissedVersion,
  });
  if (decision.offer) track('app_update_available', { from: installedVersion(), to: decision.release.version });
  return decision;
}

/** Hide this release for the rest of the session. */
export function dismissAppUpdate(version: string): void {
  dismissedVersion = version;
}

/** Open the published download in the browser, where Android can install it. */
export async function downloadRelease(release: LatestRelease): Promise<boolean> {
  try {
    await openURL(release.url);
    track('app_update_download_opened', { version: release.version });
    return true;
  } catch {
    return false;
  }
}
