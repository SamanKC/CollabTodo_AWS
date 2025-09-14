/**
 * Minimal API client for the SPA.
 * - Uses ID token for Cognito authorizer (must be 'Authorization: Bearer <id_token>')
 * - Joins URL segments safely
 * - Throws detailed errors with status/body for easier debugging
 */
import { getIdToken } from './auth';

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, '');
  const p = path.replace(/^\/+/, '');
  return `${b}/${p}`;
}

async function request<T>(method: 'GET'|'POST'|'PATCH'|'DELETE', path: string, body?: unknown): Promise<T> {
  const base = import.meta.env.VITE_API_BASE as string;
  if (!base) throw new Error('VITE_API_BASE is not set');
  const url = joinUrl(base, path);

  const idToken = getIdToken(); // <- ID token required by Cognito APIGW authorizer
  if (!idToken) throw new Error('Not authenticated (no id_token)');

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    mode: 'cors',
  });

  const text = await res.text();
  if (!res.ok) {
    // Try to parse JSON error; otherwise expose raw text
    let details: unknown = undefined;
    try { details = JSON.parse(text); } catch { details = text; }
    throw new Error(`HTTP ${res.status} ${res.statusText} at ${path} :: ${typeof details === 'string' ? details : JSON.stringify(details)}`);
  }

  // Parse JSON body if present; allow empty body
  if (!text) return undefined as unknown as T;
  try { return JSON.parse(text) as T; } catch { return (text as unknown) as T; }
}

export const api = {
  me: () => request<{ userId: string; email: string; issuer: string }>('GET', '/v1/me'),
  createList: (input: { title: string; description?: string }) =>
    request('POST', '/v1/lists', input),
};
