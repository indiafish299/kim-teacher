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
  type ProviderId,
} from "@/lib/providers";
import { DEFAULT_TOOL_FLAGS, buildTools, type McpServer, type ToolFlags } from "@/lib/tools";
import type { Attachment } from "@/lib/types";

export const maxDuration = 300;

const MAX_MESSAGES = 40;
const MAX_CHARS = 60_000;
const MAX_PAUSE_RESUMES = 4;

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
  tools?: Partial<ToolFlags>;
  mcpServers?: McpServer[];
  containerId?: string;
};

/* ------------------------------------------------------------------ */
/* 정규화된 이벤트 프로토콜                                              */
/*   {text}  {tool:{...}}  {file:{...}}  {container}  {error}  [DONE]   */
/* ------------------------------------------------------------------ */

type Emit = (obj: unknown) => void;

function pick(obj: unknown, ...path: (string | number)[]): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string | number, unknown>)[key];
  }
  return cur;
}

/** 도구 결과 블록 안에 숨어 있는 file_id를 전부 긁어냅니다. */
function collectFileIds(node: unknown, out: Set<string>, depth = 0) {
  if (depth > 8 || node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectFileIds(item, out, depth + 1);
    return;
  }
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (k === "file_id" && typeof v === "string" && v.startsWith("file_")) out.add(v);
    else collectFileIds(v, out, depth + 1);
  }
}

function resultOk(block: Record<string, unknown>): boolean {
  if (block.is_error === true) return false;
  const c = block.content;
  if (c && typeof c === "object" && !Array.isArray(c)) {
    const inner = c as Record<string, unknown>;
    if (typeof inner.type === "string" && inner.type.includes("error")) return false;
    if (typeof inner.return_code === "number" && inner.return_code !== 0) return false;
  }
  return true;
}

async function fileMeta(id: string, apiKey: string) {
  try {
    const r = await fetch(`https://api.anthropic.com/v1/files/${id}`, {
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    });
    if (!r.ok) return { id, name: `${id}.bin` };
    const d = (await r.json()) as { filename?: string; mime_type?: string; size_bytes?: number };
    return { id, name: d.filename ?? `${id}.bin`, mime: d.mime_type, size: d.size_bytes };
  } catch {
    return { id, name: `${id}.bin` };
  }
}

type TurnResult = {
  stopReason: string | null;
  blocks: Record<string, unknown>[];
  container: string | null;
};

/** Anthropic 한 턴을 흘려보내면서 정규화 이벤트를 내보내고, 이어받기용 블록을 모읍니다. */
async function streamAnthropicTurn(
  res: Response,
  apiKey: string,
  emit: Emit,
  seenFiles: Set<string>,
): Promise<TurnResult> {
  const decoder = new TextDecoder();
  const reader = res.body!.getReader();

  const blocks: Record<string, unknown>[] = [];
  const textBuf: string[] = [];
  const jsonBuf: string[] = [];
  let stopReason: string | null = null;
  let container: string | null = null;
  let buffer = "";

  const finalize = (i: number) => {
    const b = blocks[i];
    if (!b) return;
    if (b.type === "text") b.text = textBuf[i] ?? "";
    if (b.type === "server_tool_use" || b.type === "mcp_tool_use") {
      const raw = jsonBuf[i] ?? "";
      try {
        b.input = raw ? JSON.parse(raw) : {};
      } catch {
        b.input = {};
      }
    }
  };

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

        switch (event.type) {
          case "error": {
            const m = pick(event, "error", "message");
            emit({ error: typeof m === "string" ? m : "생성 중 오류가 발생했습니다." });
            break;
          }

          case "message_start": {
            const c = pick(event, "message", "container", "id") ?? pick(event, "message", "container");
            if (typeof c === "string") container = c;
            break;
          }

          case "content_block_start": {
            const i = Number(event.index ?? 0);
            const cb = { ...((event.content_block as Record<string, unknown>) ?? {}) };
            blocks[i] = cb;
            textBuf[i] = typeof cb.text === "string" ? cb.text : "";
            jsonBuf[i] = "";

            if (cb.type === "server_tool_use" || cb.type === "mcp_tool_use") {
              emit({
                tool: {
                  id: String(cb.id ?? `t${i}`),
                  name: String(cb.name ?? "tool"),
                  phase: "start",
                },
              });
            } else if (typeof cb.type === "string" && cb.type.endsWith("_tool_result")) {
              // 결과 블록은 통째로 한 번에 옵니다.
              emit({
                tool: {
                  id: String(cb.tool_use_id ?? `t${i}`),
                  phase: "end",
                  ok: resultOk(cb),
                },
              });
              const ids = new Set<string>();
              collectFileIds(cb, ids);
              for (const id of ids) {
                if (seenFiles.has(id)) continue;
                seenFiles.add(id);
                emit({ file: await fileMeta(id, apiKey) });
              }
            }
            break;
          }

          case "content_block_delta": {
            const i = Number(event.index ?? 0);
            const dt = pick(event, "delta", "type");
            if (dt === "text_delta") {
              const t = pick(event, "delta", "text");
              if (typeof t === "string") {
                textBuf[i] = (textBuf[i] ?? "") + t;
                emit({ text: t });
              }
            } else if (dt === "input_json_delta") {
              const p = pick(event, "delta", "partial_json");
              if (typeof p === "string") jsonBuf[i] = (jsonBuf[i] ?? "") + p;
            }
            break;
          }

          case "content_block_stop": {
            finalize(Number(event.index ?? 0));
            break;
          }

          case "message_delta": {
            const sr = pick(event, "delta", "stop_reason");
            if (typeof sr === "string") stopReason = sr;
            const c = pick(event, "delta", "container", "id") ?? pick(event, "delta", "container");
            if (typeof c === "string") container = c;
            break;
          }
        }
      }
    }
  }

  blocks.forEach((_, i) => finalize(i));
  return { stopReason, blocks: blocks.filter(Boolean), container };
}

/* ------------------------------------------------------------------ */

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

  const messages: ChatTurn[] = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, MAX_CHARS),
      attachments: Array.isArray(m.attachments)
        ? (m.attachments as Attachment[])
            .filter((a) => a && typeof a.id === "string" && a.id.startsWith("file_"))
            .slice(0, 8)
        : undefined,
    }))
    .slice(-MAX_MESSAGES);

  if (messages.length === 0) {
    return json({ error: "보낼 메시지가 없습니다." }, 400);
  }

  const needsContainer = messages.some((m) => m.attachments?.some((a) => a.kind === "container"));

  const flags: ToolFlags = provider.supportsTools
    ? {
        webFetch: body.tools?.webFetch ?? DEFAULT_TOOL_FLAGS.webFetch,
        // 엑셀·한글 같은 파일을 붙였다면 코드 실행이 있어야 열어볼 수 있습니다.
        code: (body.tools?.code ?? DEFAULT_TOOL_FLAGS.code) || needsContainer,
      }
    : { webFetch: false, code: false };

  const servers: McpServer[] = provider.supportsMcp && Array.isArray(body.mcpServers)
    ? body.mcpServers
        .filter((s) => s && typeof s.url === "string" && s.url.startsWith("https://"))
        .slice(0, 5)
    : [];

  const profile = typeof body.profile === "string" ? body.profile.trim().slice(0, 2000) : "";
  const userName = typeof body.userName === "string" ? body.userName.trim().slice(0, 30) : "";
  const intimacy: Intimacy = body.intimacy === 1 || body.intimacy === 3 ? body.intimacy : 2;
  const system = buildSystemPrompt(mode, {
    userName,
    intimacy,
    profile,
    tools: flags,
    mcpNames: servers.filter((s) => s.enabled).map((s) => s.name),
  });

  const { tools, mcpServers, betas } = buildTools(flags, servers);
  const containerId =
    typeof body.containerId === "string" && /^container_[A-Za-z0-9_-]{1,120}$/.test(body.containerId)
      ? body.containerId
      : undefined;

  const send = (carry: unknown[] | undefined, container: string | undefined) =>
    buildUpstreamRequest({
      providerId,
      apiKey,
      model,
      system,
      messages,
      tools,
      mcpServers,
      betas,
      containerId: container,
      carry,
    });

  let usedContainer = containerId;
  const fire = async (carry?: unknown[]) => {
    const built = send(carry, usedContainer);
    return fetch(built.url, { method: "POST", headers: built.headers, body: built.body });
  };

  let res: Response;
  try {
    res = await fire();
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

    // 컨테이너가 만료됐거나 못 쓰는 경우엔 새 컨테이너로 한 번 더 시도합니다.
    if (usedContainer && /container/i.test(detail)) {
      usedContainer = undefined;
      try {
        res = await fire();
      } catch {
        return json({ error: `${provider.label} 서버에 연결하지 못했습니다.` }, 502);
      }
    }

    if (!res.ok || !res.body) {
      return json({ error: friendlyHttpError(providerId, res.status, detail) }, res.status);
    }
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const emit: Emit = (obj) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      try {
        if (providerId === "anthropic") {
          const seenFiles = new Set<string>();
          let current = res;
          let carry: unknown[] = [];
          let lastContainer = usedContainer ?? null;

          for (let round = 0; ; round++) {
            const turn = await streamAnthropicTurn(current, apiKey, emit, seenFiles);
            if (turn.container && turn.container !== lastContainer) {
              lastContainer = turn.container;
              emit({ container: turn.container });
            }
            if (turn.stopReason !== "pause_turn" || round >= MAX_PAUSE_RESUMES) break;

            carry = [...carry, ...turn.blocks];
            const r = await fire(carry);
            if (!r.ok || !r.body) {
              emit({ error: "작업을 이어가지 못했습니다. 다시 시도해 주세요." });
              break;
            }
            current = r;
          }
        } else {
          await streamGeneric(res, providerId, emit);
        }
      } catch {
        emit({ error: "응답이 중간에 끊겼습니다." });
      }

      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      closed = true;
      controller.close();
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

/** Claude 외 사업자: 텍스트만 흘려보내면 됩니다. */
async function streamGeneric(res: Response, providerId: ProviderId, emit: Emit) {
  const decoder = new TextDecoder();
  const reader = res.body!.getReader();
  let buffer = "";

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
          emit({ error: err });
          continue;
        }
        const text = extractDelta(providerId, event);
        if (text) emit({ text });
      }
    }
  }
}
