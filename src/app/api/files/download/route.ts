import { NextRequest } from "next/server";

/**
 * 코드 실행으로 만들어진 파일 내려받기.
 *
 * <a download>로는 인증 헤더를 붙일 수 없어서, 클라이언트가 키를 헤더에 담아
 * POST 하면 우리가 Anthropic에서 받아 그대로 흘려보냅니다.
 */

export const maxDuration = 60;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

const HEADERS = (apiKey: string) => ({
  "x-api-key": apiKey,
  "anthropic-version": "2023-06-01",
});

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-user-api-key")?.trim();
  if (!apiKey) return json({ error: "API 키가 없습니다." }, 401);

  let body: { id?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "요청 형식이 올바르지 않습니다." }, 400);
  }

  const id = (body.id ?? "").trim();
  if (!/^file_[A-Za-z0-9_-]{1,120}$/.test(id)) return json({ error: "파일 주소가 올바르지 않습니다." }, 400);

  let res: Response;
  try {
    res = await fetch(`https://api.anthropic.com/v1/files/${id}/content`, {
      headers: HEADERS(apiKey),
    });
  } catch {
    return json({ error: "파일 서버에 연결하지 못했습니다." }, 502);
  }

  if (!res.ok || !res.body) {
    return json({ error: "파일을 가져오지 못했습니다. 대화가 오래되면 파일이 만료될 수 있습니다." }, res.status);
  }

  const name = (body.name ?? "download").replace(/["\\\r\n]/g, "").slice(0, 120);
  return new Response(res.body, {
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/octet-stream",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      "cache-control": "no-store",
    },
  });
}
