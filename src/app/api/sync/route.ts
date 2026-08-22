import { NextRequest } from "next/server";
import { SESSION_COOKIE, syncConfigured, verifySession } from "@/lib/session";
import { kvGet, kvSet } from "@/lib/kv";

export const dynamic = "force-dynamic";

/** Upstash free tier caps request size; keep well under it. */
const MAX_BYTES = 700_000;

function key(sub: string) {
  return `kt:u:${sub}`;
}

function guard(req: NextRequest) {
  if (!syncConfigured()) {
    return { error: Response.json({ error: "동기화가 설정되지 않았습니다." }, { status: 501 }) };
  }
  const user = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return { error: Response.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
  }
  return { user };
}

export async function GET(req: NextRequest) {
  const g = guard(req);
  if (g.error) return g.error;
  try {
    const raw = await kvGet(key(g.user!.sub));
    return Response.json(raw ? JSON.parse(raw) : { rev: 0, data: null });
  } catch {
    return Response.json({ error: "동기화 저장소를 읽지 못했습니다." }, { status: 502 });
  }
}

export async function PUT(req: NextRequest) {
  const g = guard(req);
  if (g.error) return g.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const payload = JSON.stringify({ rev: Date.now(), data: (body as { data?: unknown })?.data ?? null });
  if (payload.length > MAX_BYTES) {
    return Response.json({ error: "동기화할 데이터가 너무 큽니다." }, { status: 413 });
  }

  try {
    await kvSet(key(g.user!.sub), payload);
    return Response.json({ ok: true, rev: JSON.parse(payload).rev });
  } catch {
    return Response.json({ error: "동기화 저장소에 쓰지 못했습니다." }, { status: 502 });
  }
}
