import { NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  STATE_COOKIE,
  authConfigured,
  cookie,
  decodeIdToken,
  origin,
  redirectUri,
  signSession,
} from "@/lib/session";

function fail(req: NextRequest, reason: string) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${origin(req)}/?login=${encodeURIComponent(reason)}`,
      "Set-Cookie": cookie(STATE_COOKIE, "", 0),
    },
  });
}

export async function GET(req: NextRequest) {
  if (!authConfigured()) return new Response("로그인이 설정되지 않았습니다.", { status: 501 });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const saved = req.cookies.get(STATE_COOKIE)?.value;

  if (url.searchParams.get("error")) return fail(req, "cancelled");
  if (!code || !state || !saved || state !== saved) return fail(req, "state");

  let tokenRes: Response;
  try {
    tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.AUTH_GOOGLE_ID!,
        client_secret: process.env.AUTH_GOOGLE_SECRET!,
        redirect_uri: redirectUri(req),
        grant_type: "authorization_code",
      }),
    });
  } catch {
    return fail(req, "network");
  }

  if (!tokenRes.ok) return fail(req, "token");

  const data = (await tokenRes.json()) as { id_token?: string };
  const user = data.id_token ? decodeIdToken(data.id_token) : null;
  if (!user) return fail(req, "profile");

  const headers = new Headers({ Location: `${origin(req)}/` });
  headers.append("Set-Cookie", cookie(SESSION_COOKIE, signSession(user), 60 * 60 * 24 * 30));
  headers.append("Set-Cookie", cookie(STATE_COOKIE, "", 0));
  return new Response(null, { status: 302, headers });
}
