/* Simple Cognito PKCE auth helper for SPA (TypeScript, strict)
   Expects these env vars in .env.local:
   VITE_COGNITO_DOMAIN, VITE_COGNITO_CLIENT_ID, VITE_REDIRECT_URI, VITE_LOGOUT_REDIRECT_URI
*/
const region = import.meta.env.VITE_REGION as string;
const domain = import.meta.env.VITE_COGNITO_DOMAIN as string; // e.g. collabtodo-app.auth.ap-southeast-2.amazoncognito.com
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID as string;
const redirectUri = import.meta.env.VITE_REDIRECT_URI as string;
const logoutRedirect = import.meta.env.VITE_LOGOUT_REDIRECT_URI as string;

const PKCE_VERIFIER_KEY = "pkce:code_verifier";
const TOKENS_KEY = "tokens";

export type Tokens = {
  id_token?: string;
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  /** epoch seconds (client-side computed) */
  expires_at?: number;
};

function nowEpoch(): number {
  return Math.floor(Date.now() / 1000);
}
function saveTokens(t: Tokens) {
  localStorage.setItem(TOKENS_KEY, JSON.stringify(t));
}
export function getTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}
export function getIdToken(): string | null {
  return getTokens()?.id_token ?? null;
}
export function getAccessToken(): string | null {
  return getTokens()?.access_token ?? null;
}
export function isAuthenticated(): boolean {
  const t = getTokens();
  return !!(t?.id_token && t.expires_at && t.expires_at > nowEpoch() + 30);
}

// ----- PKCE helpers -----
function base64UrlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(hash);
}
function randomString(len = 96): string {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return base64UrlEncode(arr.buffer).slice(0, len);
}
function buildOAuthUrl(path: string, params: Record<string, string>) {
  const u = new URL(`https://${domain}/oauth2/${path}`);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  return u.toString();
}
function buildLogoutUrl(params: Record<string, string>) {
  const u = new URL(`https://${domain}/logout`);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  return u.toString();
}

// ----- Public API -----
export async function login() {
  const codeVerifier = randomString(96);
  sessionStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier);
  const codeChallenge = await sha256(codeVerifier);

  const url = buildOAuthUrl("authorize", {
    client_id: clientId,
    response_type: "code",
    scope: "openid email profile",
    redirect_uri: redirectUri,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    state: "spa",
  });
  window.location.href = url;
}

export async function handleCallback(): Promise<Tokens | null> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if (!code) return null;

  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY) || "";
  const form = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    redirect_uri: redirectUri,
  });
  if (verifier) form.set("code_verifier", verifier);

  const resp = await fetch(`https://${domain}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`Token exchange failed (${resp.status}): ${errText}`);
  }

  const tokens = (await resp.json()) as Tokens;
  tokens.expires_at = nowEpoch() + (tokens.expires_in ?? 3600) - 30;
  saveTokens(tokens);

  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  window.history.replaceState({}, document.title, "/");
  return tokens;
}

export async function refreshIfNeeded(): Promise<Tokens | null> {
  const t = getTokens();
  if (!t?.refresh_token) return t ?? null;
  if (t.expires_at && t.expires_at > nowEpoch() + 60) return t;

  const form = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    refresh_token: t.refresh_token,
  });

  const resp = await fetch(`https://${domain}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });

  if (!resp.ok) {
    localStorage.removeItem(TOKENS_KEY);
    return null;
  }

  const next = (await resp.json()) as Tokens;
  if (!next.refresh_token) next.refresh_token = t.refresh_token;
  next.expires_at = nowEpoch() + (next.expires_in ?? 3600) - 30;
  saveTokens(next);
  return next;
}

export function logout() {
  localStorage.removeItem(TOKENS_KEY);
  const url = buildLogoutUrl({
    client_id: clientId,
    logout_uri: logoutRedirect,
  });
  window.location.href = url;
}
