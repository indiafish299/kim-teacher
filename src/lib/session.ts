import crypto from "node:crypto";

/**
 * Minimal Google OAuth + signed-cookie session. No dependency, no database.
 * Everything here is a no-op unless the three auth env vars are set, so the app
 * keeps working exactly as before when login is not configured.
 */

export const SESSION_COOKIE = "kt_session";
export const STATE_COOKIE = "kt_oauth_state";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type SessionUser = {
  sub: string;
  email: string;
  name: string;
  picture?: string;
};

export function authConfigured(): boolean {
  return Boolean(
    process.env.AUTH_SECRET && process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  );
}

export function syncConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return Boolean(url && token);
}

function hmac(body: string): string {
  return crypto.createHmac("sha256", process.env.AUTH_SECRET ?? "").update(body).digest("base64url");
}

export function signSession(user: SessionUser): string {
  const payload = { ...user, exp: Math.floor(Date.now() / 1000) + MAX_AGE };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmac(body)}`;
}

export function verifySession(token: string | undefined | null): SessionUser | null {
  if (!token || !process.env.AUTH_SECRET) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = hmac(body);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionUser & { exp: number };
    if (!p.exp || p.exp * 1000 < Date.now()) return null;
    if (!p.sub || !p.email) return null;
    return { sub: p.sub, email: p.email, name: p.name ?? "", picture: p.picture };
  } catch {
    return null;
  }
}

export function cookie(name: string, value: string, maxAge: number): string {
  const parts = [`${name}=${value}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${maxAge}`];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

/** Public origin of this deployment, used to build the OAuth redirect URI. */
export function origin(req: Request): string {
  const configured = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}

export function redirectUri(req: Request): string {
  return `${origin(req)}/api/auth/callback/google`;
}

/** Decodes a Google id_token without verifying — safe because we just got it over TLS
 *  from Google's token endpoint in exchange for our client secret. */
export function decodeIdToken(idToken: string): SessionUser | null {
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString());
    if (!payload.sub || !payload.email) return null;
    return {
      sub: String(payload.sub),
      email: String(payload.email),
      name: String(payload.name ?? payload.email.split("@")[0]),
      picture: payload.picture ? String(payload.picture) : undefined,
    };
  } catch {
    return null;
  }
}
