import { useAuthStore, type Credential } from '../store/auth';

/** An answer other than 2xx. body is the parsed JSON body, when there is one. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Headers that authenticate a request with the given credential. */
export function authHeaders(credential: Credential | null): Record<string, string> {
  if (!credential) return {};

  return credential.kind === 'token'
    ? { Authorization: `Bearer ${credential.token}` }
    : { 'x-api-key': credential.apiKey };
}

export interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  /** Authenticate with this credential instead of the stored one (the login page checks a key this way). */
  credential?: Credential | null;
}

/**
 * Calls the API at the same origin. Throws ApiError for any status other than 2xx; a 401 also
 * signs the user out, so the app goes back to the login page.
 */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const credential = options.credential !== undefined ? options.credential : useAuthStore.getState().credential;
  const headers: Record<string, string> = { Accept: 'application/json', ...authHeaders(credential) };

  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(path, {
    method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  const body = parseJson(text);

  if (!response.ok) {
    if (response.status === 401 && options.credential === undefined) useAuthStore.getState().signOut();

    throw new ApiError(response.status, errorMessage(body) ?? (response.statusText || `HTTP ${response.status}`), body);
  }

  return body as T;
}

function parseJson(text: string): unknown {
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Nest errors carry message as a string or a list of validation messages. */
function errorMessage(body: unknown): string | undefined {
  if (typeof body === 'string') return body || undefined;
  if (typeof body !== 'object' || body === null || !('message' in body)) return undefined;

  const { message } = body as { message: unknown };

  if (Array.isArray(message)) return message.join('; ');

  return typeof message === 'string' ? message : undefined;
}
