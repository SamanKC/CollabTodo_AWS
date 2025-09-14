import { z } from "zod";

const tokenResponse = z.object({
  id_token: z.string(),
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number(),
  token_type: z.string(),
});
export type TokenResponse = z.infer<typeof tokenResponse>;

export function buildAuthUrl() {
  const base = import.meta.env.VITE_COGNITO_DOMAIN;
  const client = import.meta.env.VITE_COGNITO_CLIENT_ID;
  const redirect = import.meta.env.VITE_COGNITO_REDIRECT_URI;
  const state = crypto.randomUUID();
  const verifier = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
  sessionStorage.setItem("pkce_verifier", verifier);
  const challenge = base64UrlEncode(sha256(verifier));
  return `${base}/oauth2/authorize?response_type=code&client_id=${client}&redirect_uri=${encodeURIComponent(
    redirect
  )}&scope=openid+profile+email&state=${state}&code_challenge=${challenge}&code_challenge_method=S256`;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const domain = import.meta.env.VITE_COGNITO_DOMAIN;
  const client = import.meta.env.VITE_COGNITO_CLIENT_ID;
  const redirect = import.meta.env.VITE_COGNITO_REDIRECT_URI;
  const verifier = sessionStorage.getItem("pkce_verifier")!;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: client,
    code,
    redirect_uri: redirect,
    code_verifier: verifier,
  });
  const res = await fetch(`${domain}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await res.json();
  return tokenResponse.parse(json);
}

function sha256(buffer: string) {
  const encoder = new TextEncoder();
  return crypto.subtle.digest("SHA-256", encoder.encode(buffer));
}

function base64UrlEncode(buf: ArrayBuffer | Uint8Array) {
  let binary = "";
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
