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
  /**
   * A folder of the qla.dev account rather than a subdomain: the repository sits at
   * `public_html/abc`, so the API is a path rather than a host.
   *
   * `/public` is in there on purpose. `backend/.htaccess` does rewrite `/abc/backend/api/…`
   * into `public/`, and Apache serves it — but Laravel works out its own base path from
   * `SCRIPT_NAME`, which stays `/abc/backend/public/index.php`. With `/public` missing from the
   * URL that is no longer a prefix of the request, so nothing is stripped, the router is handed
   * `/abc/backend/api/health` instead of `/api/health`, and every route 404s.
   *
   * The fix that removes this line is a subdomain whose document root IS `backend/public` —
   * `https://abc.qla.dev/api`, which is what this constant said before anything was deployed.
   */
  production: 'https://qla.dev/abc/backend/public/api',
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
