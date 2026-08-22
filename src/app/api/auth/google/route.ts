import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { STATE_COOKIE, authConfigured, cookie, redirectUri } from "@/lib/session";

export async function GET(req: NextRequest) {
  if (!authConfigured()) {
    return new Response("로그인이 설정되지 않았습니다.", { status: 501 });
  }

  const state = crypto.randomBytes(16).toString("base64url");
  const params = new URLSearchParams({
    client_id: process.env.AUTH_GOOGLE_ID!,
    redirect_uri: redirectUri(req),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
    access_type: "online",
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      "Set-Cookie": cookie(STATE_COOKIE, state, 600),
    },
  });
}
