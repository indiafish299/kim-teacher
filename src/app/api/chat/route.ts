import { NextRequest } from "next/server";
import { buildSystemPrompt, MODELS, DEFAULT_MODEL, type ModeId } from "@/lib/agent";

export const maxDuration = 60;

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ALLOWED_MODELS = new Set<string>(MODELS.map((m) => m.id));
const MAX_MESSAGES = 40;
const MAX_CHARS = 60_000;

type IncomingMessage = { role: "user" | "assistant"; content: string };

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-user-api-key")?.trim();
  if (!apiKey || !apiKey.startsWith("sk-ant-")) {
    return json({ error: "API 키가 없거나 형식이 올바르지 않습니다. 설정에서 키를 등록해 주세요." }, 401);
  }

  let body: {
    messages?: IncomingMessage[];
    mode?: ModeId;
    model?: string;
    profile?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "요청 형식이 올바르지 않습니다." }, 400);
  }

  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  const messages = rawMessages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }))
    .slice(-MAX_MESSAGES);

  if (messages.length === 0) {
    return json({ error: "보낼 메시지가 없습니다." }, 400);
  }

  const model = body.model && ALLOWED_MODELS.has(body.model) ? body.model : DEFAULT_MODEL;
  const mode: ModeId = (body.mode ?? "assist") as ModeId;

  let system = buildSystemPrompt(mode);
  const profile = typeof body.profile === "string" ? body.profile.trim().slice(0, 2000) : "";
  if (profile) {
    system += `\n\n## 사용자(선생님) 정보\n${profile}\n이 정보를 답변의 기본 전제로 삼되, 사용자가 다르게 말하면 그쪽을 따릅니다.`;
  }

  let upstream: Response;
  try {
    upstream = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 8000,
        stream: true,
        system,
        messages,
      }),
    });
  } catch {
    return json({ error: "Anthropic 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 502);
  }

  if (!upstream.ok || !upstream.body) {
    let detail = "";
    try {
      const err = await upstream.json();
      detail = err?.error?.message ?? "";
    } catch {
      /* ignore */
    }
    const friendly =
      upstream.status === 401
        ? "API 키가 유효하지 않습니다. 키를 다시 확인해 주세요."
        : upstream.status === 429
          ? "요청이 몰렸습니다. 잠시 후 다시 시도해 주세요."
          : upstream.status === 400 && detail.includes("credit")
            ? "API 크레딧이 부족합니다. Anthropic 콘솔에서 결제 정보를 확인해 주세요."
            : detail || "요청을 처리하지 못했습니다.";
    return json({ error: friendly }, upstream.status);
  }

  return new Response(upstream.body, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
