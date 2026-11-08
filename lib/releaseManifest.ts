/**
 * The release record the website publishes next to the APK, and the rule for
 * when an installed app should offer it.
 *
 * `public/downloads/latest.json` is copied into the container by
 * `scripts/publish-apk.sh` and served at `/downloads/latest.json`; it is the
 * only signal a sideloaded install has that a newer build exists, because no
 * store notices for it. This module holds the whole decision as pure data —
 * platform, installed version, manifest, dismissal — so `scripts/check-web-publish.cjs`
 * can exercise it against the shipped file without a device, and so nothing
 * about version arithmetic can drift between the two screens that ask.
 *
 * No React Native imports on purpose.
 */

/** Shape of `/downloads/latest.json`. Only `version` and `url` are required. */
export interface LatestRelease {
  /** Human-facing release the app compares against its own version, e.g. "1.1.0". */
  version: string;
  /** Absolute download URL for the APK, e.g. "https://bolingo.co.ke/download/android". */
  url: string;
  /** File the host is serving, for the "what am I about to install" line. */
  fileName?: string;
  sizeBytes?: number;
  sha256?: string;
  publishedAt?: string;
  /** Minimum Android release this build runs on, e.g. "7.0". */
  minAndroid?: string;
  /** Application id the APK installs over. A mismatch means the wrong file is published. */
  packageName?: string;
}

export type UpdateReject =
  /** This build cannot install the artefact the manifest points at (iOS, web). */
  | 'not-installable'
  /** The manifest names a different application id than this install. */
  | 'wrong-package'
  /** Either side's version could not be read as a number sequence. */
  | 'unknown-version'
  /** The published build is the same version or older than this install. */
  | 'not-newer'
  /** The learner already turned this exact release down. */
  | 'dismissed'
  /** The manifest could not be fetched or parsed. */
  | 'unreachable';

export type UpdateDecision = { offer: true; release: LatestRelease } | { offer: false; reason: UpdateReject };

export interface UpdateInput {
  /** `Platform.OS` of the running install. */
  platform: string;
  /** Version this install was built with. */
  installed: string;
  /** Application id of this install, when the build reports one. */
  installedPackage?: string | null;
  release: LatestRelease;
  /** Release the learner dismissed on this device, if any. */
  dismissedVersion?: string | null;
}

/** A release number as segments: "1.10.2" → [1, 10, 2]. `null` when unreadable. */
export function parseVersion(raw: string | null | undefined): number[] | null {
  if (typeof raw !== 'string') return null;
  const match = raw.trim().match(/^\d+(?:\.\d+)*/);
  if (!match) return null;
  const segments = match[0].split('.').map((part) => Number(part));
  if (segments.some((segment) => !Number.isFinite(segment))) return null;
  return segments;
}

/**
 * -1 when `a` is older, 1 when newer, 0 when the same or either side is
 * unreadable. Comparing numerically is the whole point: the string "1.10.0" is
 * a lower string than "1.9.0" and would never be offered as an update.
 */
export function compareVersions(a: string | null | undefined, b: string | null | undefined): -1 | 0 | 1 {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return 0;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0);
    if (delta > 0) return 1;
    if (delta < 0) return -1;
  }
  return 0;
}

/** The bytes the app fetches, validated. Throws when the record cannot be trusted. */
export function parseRelease(raw: unknown): LatestRelease {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('release record is not an object');
  const body = raw as Record<string, unknown>;
  if (typeof body.version !== 'string' || !parseVersion(body.version)) {
    throw new Error('release record has no readable version');
  }
  // Only https: a bare http download prompt on a learner's phone is not a thing
  // this app will ever raise, and a misconfigured host must fail closed.
  if (typeof body.url !== 'string' || !/^https:\/\//.test(body.url)) {
    throw new Error('release record has no https download url');
  }
  const release: LatestRelease = { version: body.version, url: body.url };
  for (const key of ['fileName', 'sha256', 'publishedAt', 'minAndroid', 'packageName'] as const) {
    if (typeof body[key] === 'string') release[key] = body[key] as string;
  }
  if (typeof body.sizeBytes === 'number' && Number.isFinite(body.sizeBytes) && body.sizeBytes > 0) {
    release.sizeBytes = body.sizeBytes;
  }
  return release;
}

/** Size in MB for the "about 166 MB" line; `null` when the record omits it. */
export function releaseSizeLabel(release: LatestRelease): string | null {
  if (!release.sizeBytes) return null;
  return `${Math.round(release.sizeBytes / (1024 * 1024))} MB`;
}

/**
 * The single rule for whether to raise an update. Everything about "newer"
 * lives here, so the dashboard offer and the Settings check cannot disagree.
 */
export function decideUpdate({
  platform,
  installed,
  installedPackage,
  release,
  dismissedVersion,
}: UpdateInput): UpdateDecision {
  // The published artefact is an Android APK. An iPhone install and the browser
  // build both get their newest code another way, so neither may offer it.
  if (platform !== 'android') return { offer: false, reason: 'not-installable' };
  // Guard the one failure that would actively mislead: a manifest published for
  // a different app, or an APK built from a different id than this install.
  if (release.packageName && installedPackage && release.packageName !== installedPackage) {
    return { offer: false, reason: 'wrong-package' };
  }
  if (!parseVersion(installed) || !parseVersion(release.version)) return { offer: false, reason: 'unknown-version' };
  if (compareVersions(release.version, installed) <= 0) return { offer: false, reason: 'not-newer' };
  if (dismissedVersion && dismissedVersion === release.version) return { offer: false, reason: 'dismissed' };
  return { offer: true, release };
}
