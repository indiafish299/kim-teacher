import { NextRequest } from "next/server";
import { MAX_UPLOAD_BYTES, kindFor } from "@/lib/files";

/**
 * 파일 업로드 중계.
 *
 * 브라우저 → (이 라우트) → Anthropic Files API. 파일 내용은 우리 서버 메모리를 스쳐
 * 지나갈 뿐 어디에도 저장되지 않고, 키도 요청 헤더에서 한 번 읽고 버립니다.
 */

export const maxDuration = 60;

/** Vercel 서버리스 함수의 요청 본문 한도(4.5MB) 안쪽으로 잡습니다. */
const MAX_BYTES = MAX_UPLOAD_BYTES;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-user-api-key")?.trim();
  if (!apiKey) return json({ error: "API 키가 없습니다. 설정에서 키를 등록해 주세요." }, 401);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "파일을 읽지 못했습니다." }, 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "파일이 없습니다." }, 400);
  if (file.size === 0) return json({ error: "빈 파일입니다." }, 400);
  if (file.size > MAX_BYTES) {
    return json(
      { error: `파일이 너무 큽니다. ${Math.round(MAX_BYTES / 1024 / 1024)}MB 이하로 올려 주세요.` },
      413,
    );
  }

  const mime = file.type || "application/octet-stream";
  const upstream = new FormData();
  upstream.append("file", file, file.name);

  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/files", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: upstream,
    });
  } catch {
    return json({ error: "파일 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 502);
  }

  const text = await res.text();
  if (!res.ok) {
    let detail = text.slice(0, 300);
    try {
      detail = JSON.parse(text)?.error?.message ?? detail;
    } catch {
      /* keep raw */
    }
    if (res.status === 401 || res.status === 403) {
      return json({ error: "Claude API 키가 유효하지 않습니다. 설정에서 확인해 주세요." }, res.status);
    }
    return json({ error: detail || "파일을 올리지 못했습니다." }, res.status);
  }

  let data: { id?: string; filename?: string; size_bytes?: number; mime_type?: string };
  try {
    data = JSON.parse(text);
  } catch {
    return json({ error: "파일 서버 응답을 이해하지 못했습니다." }, 502);
  }
  if (!data.id) return json({ error: "파일을 올리지 못했습니다." }, 502);

  return json(
    {
      id: data.id,
      name: data.filename ?? file.name,
      mime: data.mime_type ?? mime,
      size: data.size_bytes ?? file.size,
      kind: kindFor(data.mime_type ?? mime, file.name),
    },
    200,
  );
}
