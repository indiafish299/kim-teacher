import { SESSION_COOKIE, cookie } from "@/lib/session";

export async function POST() {
  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": cookie(SESSION_COOKIE, "", 0) },
  });
}
