/**
 * Which backend the app talks to, and how.
 *
 * The switch is freightbook's: a map of named backends plus one env var that picks between them,
 * rather than a URL pasted wherever it is needed. Set `EXPO_PUBLIC_API_BACKEND` to a key below.
 *
 * `EXPO_PUBLIC_API_URL` overrides the map outright. Native needs that escape hatch in a way the
 * web client does not: `127.0.0.1` is the host machine on the iOS simulator but the PHONE on a
 * real device, so testing on hardware means pointing at the machine's LAN address.
 */
const API_BACKENDS = {
  local: 'http://127.0.0.1:8000/api',
  production: 'https://abc.qla.dev/api',
} as const;

type BackendName = keyof typeof API_BACKENDS;

const configured = String(process.env.EXPO_PUBLIC_API_BACKEND ?? 'local').toLowerCase();

export const API_BACKEND: BackendName =
  configured in API_BACKENDS ? (configured as BackendName) : 'local';

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || API_BACKENDS[API_BACKEND])
  .replace(/\/+$/, '');

/** Every response the API gives carries these four keys. */
export type ApiEnvelope<T> = {
  message: string;
  data: T;
  meta: Record<string, unknown> | unknown[];
  errors: Record<string, string[]> | unknown[];
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors: Record<string, string[]> = {}
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body) headers.set('Content-Type', 'application/json');

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (cause) {
    // A refused connection is the usual first run: the API is not up, or this is a device that
    // cannot see 127.0.0.1. Say which URL was tried rather than "Network request failed".
    throw new ApiError(`Ne mogu doći do ${url}`, 0);
  }

  const envelope = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || !envelope) {
    throw new ApiError(
      envelope?.message ?? `HTTP ${response.status}`,
      response.status,
      (envelope?.errors as Record<string, string[]>) ?? {}
    );
  }

  return envelope.data;
}
