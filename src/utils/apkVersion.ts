import Constants from 'expo-constants';

const RELEASES_API = 'https://api.github.com/repos/Tyoxic/MaintBot/releases/latest';
const RELEASES_URL = 'https://github.com/Tyoxic/MaintBot/releases/latest';
const FETCH_TIMEOUT_MS = 5000;

export type ApkCheckStatus = 'up-to-date' | 'update-available' | 'error';

export interface ApkStatus {
  status: ApkCheckStatus;
  currentVersion: string;
  latestVersion: string | null;
  releaseUrl: string;
  releaseName: string | null;
}

function parseVersion(v: string): number[] {
  return v
    .replace(/^v/i, '')
    .split('.')
    .map((n) => {
      const parsed = parseInt(n, 10);
      return isFinite(parsed) ? parsed : 0;
    });
}

export function isNewerVersion(latest: string, current: string): boolean {
  const l = parseVersion(latest);
  const c = parseVersion(current);
  const len = Math.max(l.length, c.length);
  for (let i = 0; i < len; i++) {
    const a = l[i] ?? 0;
    const b = c[i] ?? 0;
    if (a !== b) return a > b;
  }
  return false;
}

export async function checkApkVersion(): Promise<ApkStatus> {
  const currentVersion = Constants.expoConfig?.version ?? '1.0.0';
  const fallback: ApkStatus = {
    status: 'error',
    currentVersion,
    latestVersion: null,
    releaseUrl: RELEASES_URL,
    releaseName: null,
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(RELEASES_API, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) return fallback;

    const data = (await response.json()) as {
      tag_name?: unknown;
      name?: unknown;
      html_url?: unknown;
    };

    if (typeof data.tag_name !== 'string') return fallback;

    const latestVersion = data.tag_name.replace(/^v/i, '');
    const status: ApkCheckStatus = isNewerVersion(latestVersion, currentVersion)
      ? 'update-available'
      : 'up-to-date';

    return {
      status,
      currentVersion,
      latestVersion,
      releaseUrl: typeof data.html_url === 'string' ? data.html_url : RELEASES_URL,
      releaseName: typeof data.name === 'string' ? data.name : null,
    };
  } catch {
    return fallback;
  }
}
