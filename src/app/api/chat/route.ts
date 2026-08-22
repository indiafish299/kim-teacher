import { NextRequest } from "next/server";
import { buildSystemPrompt, type Intimacy, type ModeId } from "@/lib/agent";
import {
  buildUpstreamRequest,
  extractDelta,
  extractError,
  friendlyHttpError,
  getProvider,
  isValidModel,
  type ChatTurn,
  type McpConfig,
  type ProviderId,
} from "@/lib/providers";

export const maxDuration = 120;

const MAX_MESSAGES = 40;
const MAX_CHARS = 60_000;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

type Body = {
  messages?: ChatTurn[];
  mode?: ModeId;
  provider?: string;
  model?: string;
  profile?: string;
  userName?: string;
  intimacy?: number;
  mcpUrl?: string;
  mcpToken?: string;
};

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-user-api-key")?.trim();
  if (!apiKey) {
    return json({ error: "API 키가 없습니다. 설정에서 키를 등록해 주세요." }, 401);
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "요청 형식이 올바르지 않습니다." }, 400);
  }

  const provider = getProvider(body.provider);
  const providerId: ProviderId = provider.id;
  const model = body.model && isValidModel(providerId, body.model) ? body.model : provider.defaultModel;
  const mode: ModeId = (body.mode ?? "assist") as ModeId;

  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }))
    .slice(-MAX_MESSAGES);

  if (messages.length === 0) {
    return json({ error: "보낼 메시지가 없습니다." }, 400);
  }

  const profile = typeof body.profile === "string" ? body.profile.trim().slice(0, 2000) : "";
  const userName = typeof body.userName === "string" ? body.userName.trim().slice(0, 30) : "";
  const intimacy: Intimacy = body.intimacy === 1 || body.intimacy === 3 ? body.intimacy : 2;
  const system = buildSystemPrompt(mode, { userName, intimacy, profile });

  let mcp: McpConfig = null;
  const mcpUrl = typeof body.mcpUrl === "string" ? body.mcpUrl.trim() : "";
  if (provider.supportsMcp && mcpUrl.startsWith("https://")) {
    mcp = { url: mcpUrl.slice(0, 500), token: (body.mcpToken ?? "").trim().slice(0, 4000) };
  }

  const upstream = buildUpstreamRequest(providerId, apiKey, model, system, messages, mcp);

  let res: Response;
  try {
    res = await fetch(upstream.url, {
      method: "POST",
      headers: upstream.headers,
      body: upstream.body,
    });
  } catch {
    return json({ error: `${provider.label} 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.` }, 502);
  }

  if (!res.ok || !res.body) {
    let detail = "";
    try {
      const text = await res.text();
      try {
        const parsed = JSON.parse(text);
        detail =
          parsed?.error?.message ??
          parsed?.error?.status ??
          parsed?.message ??
          (Array.isArray(parsed) ? parsed[0]?.error?.message : "") ??
          "";
      } catch {
        detail = text.slice(0, 300);
      }
    } catch {
      /* ignore */
    }
    return json({ error: friendlyHttpError(providerId, res.status, detail) }, res.status);
  }

  /* Normalize every provider's SSE into: data: {"text": "..."} / data: {"error": "..."} / data: [DONE] */
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = res.body.getReader();

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      let buffer = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let idx: number;
          while ((idx = buffer.indexOf("\n\n")) !== -1) {
            const chunk = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);

            for (const line of chunk.split("\n")) {
              if (!line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;

              let event: Record<string, unknown>;
              try {
                event = JSON.parse(payload);
              } catch {
                continue;
              }

              const err = extractError(providerId, event);
              if (err) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err })}\n\n`));
                continue;
              }
              const text = extractDelta(providerId, event);
              if (text) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
              }
            }
          }
        }
      } catch {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: "응답이 중간에 끊겼습니다." })}\n\n`),
        );
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
    cancel() {
      void reader.cancel();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
      connection: "keep-alive",
    },
  });
}
