import type { Attachment } from "./types";

export type ProviderId = "anthropic" | "openai" | "google" | "xai";

export type ModelOption = {
  id: string;
  label: string;
  note: string;
};

export type Provider = {
  id: ProviderId;
  label: string;
  short: string;
  keyPlaceholder: string;
  keyHint: string;
  consoleUrl: string;
  consoleLabel: string;
  models: ModelOption[];
  defaultModel: string;
  /** MCP 서버 연결, 서버 도구, 파일 첨부는 지금은 Claude에서만 됩니다. */
  supportsMcp: boolean;
  supportsTools: boolean;
};

export const PROVIDERS: Provider[] = [
  {
    id: "anthropic",
    label: "Claude",
    short: "Claude",
    keyPlaceholder: "sk-ant-api03-...",
    keyHint: "sk-ant- 으로 시작합니다",
    consoleUrl: "https://console.anthropic.com/settings/keys",
    consoleLabel: "Anthropic 콘솔",
    models: [
      { id: "claude-sonnet-5", label: "Sonnet 5", note: "속도와 품질의 균형 · 일상 업무에 권장" },
      { id: "claude-opus-5", label: "Opus 5", note: "가장 꼼꼼함 · 복잡한 상담과 긴 문서에" },
      { id: "claude-haiku-4-5", label: "Haiku 4.5", note: "가장 빠르고 저렴 · 짧은 문구 다듬기에" },
    ],
    defaultModel: "claude-sonnet-5",
    supportsMcp: true,
    supportsTools: true,
  },
  {
    id: "openai",
    label: "ChatGPT",
    short: "GPT",
    keyPlaceholder: "sk-...",
    keyHint: "OpenAI 플랫폼에서 발급한 비밀 키",
    consoleUrl: "https://platform.openai.com/api-keys",
    consoleLabel: "OpenAI 플랫폼",
    models: [
      { id: "gpt-5.6-terra", label: "GPT-5.6 Terra", note: "성능과 비용의 균형 · 기본 권장" },
      { id: "gpt-5.6-sol", label: "GPT-5.6 Sol", note: "가장 강력함 · 복잡한 문서 작업에" },
      { id: "gpt-5.6-luna", label: "GPT-5.6 Luna", note: "가장 저렴 · 짧은 작업에" },
    ],
    defaultModel: "gpt-5.6-terra",
    supportsMcp: false,
    supportsTools: false,
  },
  {
    id: "google",
    label: "Gemini",
    short: "Gemini",
    keyPlaceholder: "API 키 붙여넣기",
    keyHint: "Google AI Studio에서 발급",
    consoleUrl: "https://aistudio.google.com/apikey",
    consoleLabel: "Google AI Studio",
    models: [
      { id: "gemini-3.7-flash", label: "Gemini 3.7 Flash", note: "최신 · 빠르고 똑똑함 · 기본 권장" },
      { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash", note: "이전 세대 · 안정적" },
      { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite", note: "가장 빠르고 저렴" },
    ],
    defaultModel: "gemini-3.7-flash",
    supportsMcp: false,
    supportsTools: false,
  },
  {
    id: "xai",
    label: "Grok",
    short: "Grok",
    keyPlaceholder: "xai-...",
    keyHint: "xAI 콘솔에서 발급",
    consoleUrl: "https://console.x.ai",
    consoleLabel: "xAI 콘솔",
    models: [
      { id: "grok-4.6", label: "Grok 4.6", note: "현재 주력 모델 · 기본 권장" },
      { id: "grok-4.5", label: "Grok 4.5", note: "이전 세대" },
      { id: "grok-4.3", label: "Grok 4.3", note: "더 저렴하고 빠름" },
    ],
    defaultModel: "grok-4.6",
    supportsMcp: false,
    supportsTools: false,
  },
];

export const DEFAULT_PROVIDER: ProviderId = "anthropic";

export function getProvider(id: string | undefined): Provider {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

export function isValidModel(providerId: string, model: string) {
  return getProvider(providerId).models.some((m) => m.id === model);
}

/* ------------------------------------------------------------------ */
/* Upstream request building                                           */
/* ------------------------------------------------------------------ */

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
};

export type UpstreamRequest = {
  url: string;
  headers: Record<string, string>;
  body: string;
};

export type BuildArgs = {
  providerId: ProviderId;
  apiKey: string;
  model: string;
  system: string;
  messages: ChatTurn[];
  /** Anthropic 서버 도구 정의 */
  tools?: Record<string, unknown>[];
  mcpServers?: Record<string, unknown>[];
  betas?: string[];
  /** 코드 실행 컨테이너 재사용 */
  containerId?: string;
  /** pause_turn 으로 끊긴 턴을 이어받을 때 붙이는 원본 블록들 */
  carry?: unknown[];
};

/** 한 턴의 사용자 메시지를 Anthropic 콘텐츠 블록 배열로. */
function anthropicContent(turn: ChatTurn): unknown {
  const files = turn.attachments ?? [];
  if (files.length === 0) return turn.content;

  const blocks: unknown[] = [];
  for (const f of files) {
    if (f.kind === "image") {
      blocks.push({ type: "image", source: { type: "file", file_id: f.id } });
    } else if (f.kind === "document") {
      blocks.push({
        type: "document",
        source: { type: "file", file_id: f.id },
        title: f.name.slice(0, 100),
      });
    } else {
      blocks.push({ type: "container_upload", file_id: f.id });
    }
  }
  blocks.push({ type: "text", text: turn.content || "이 파일을 봐 주세요." });
  return blocks;
}

export function buildUpstreamRequest(args: BuildArgs): UpstreamRequest {
  const { providerId, apiKey, model, system, messages } = args;

  switch (providerId) {
    case "anthropic": {
      const headers: Record<string, string> = {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      };
      if (args.betas?.length) headers["anthropic-beta"] = args.betas.join(",");

      const built: unknown[] = messages.map((m) => ({
        role: m.role,
        content: m.role === "user" ? anthropicContent(m) : m.content,
      }));
      if (args.carry?.length) built.push({ role: "assistant", content: args.carry });

      const body: Record<string, unknown> = {
        model,
        max_tokens: 8000,
        stream: true,
        system,
        messages: built,
      };
      if (args.tools?.length) body.tools = args.tools;
      if (args.mcpServers?.length) body.mcp_servers = args.mcpServers;
      if (args.containerId) body.container = args.containerId;

      return { url: "https://api.anthropic.com/v1/messages", headers, body: JSON.stringify(body) };
    }

    case "openai":
    case "xai": {
      const url =
        providerId === "openai"
          ? "https://api.openai.com/v1/chat/completions"
          : "https://api.x.ai/v1/chat/completions";
      return {
        url,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          stream: true,
          messages: [
            { role: "system", content: system },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ],
        }),
      };
    }

    case "google": {
      return {
        url: "https://generativelanguage.googleapis.com/v1beta/interactions",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          model,
          system_instruction: system,
          store: false,
          stream: true,
          input: messages.map((m) => ({
            type: m.role === "user" ? "user_input" : "model_output",
            content: [{ type: "text", text: m.content }],
          })),
        }),
      };
    }
  }
}

/* ------------------------------------------------------------------ */
/* Delta extraction — one normalized shape for every provider          */
/* ------------------------------------------------------------------ */

type AnyEvent = Record<string, unknown>;

function pick(obj: unknown, ...path: (string | number)[]): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string | number, unknown>)[key];
  }
  return cur;
}

/** Returns incremental text for one SSE payload, or null when the event carries none. */
export function extractDelta(providerId: ProviderId, event: AnyEvent): string | null {
  switch (providerId) {
    case "anthropic": {
      if (event.type === "content_block_delta" && pick(event, "delta", "type") === "text_delta") {
        const t = pick(event, "delta", "text");
        return typeof t === "string" ? t : null;
      }
      return null;
    }
    case "openai":
    case "xai": {
      const t = pick(event, "choices", 0, "delta", "content");
      return typeof t === "string" && t.length > 0 ? t : null;
    }
    case "google": {
      if (event.event_type === "step.delta" && pick(event, "delta", "type") === "text") {
        const t = pick(event, "delta", "text");
        return typeof t === "string" ? t : null;
      }
      // Legacy generateContent shape, just in case the account is routed there.
      const legacy = pick(event, "candidates", 0, "content", "parts", 0, "text");
      return typeof legacy === "string" && legacy.length > 0 ? legacy : null;
    }
  }
}

/** Returns an error message if the SSE payload is an upstream error event. */
export function extractError(providerId: ProviderId, event: AnyEvent): string | null {
  if (event.type === "error" || event.event_type === "error") {
    const m = pick(event, "error", "message") ?? pick(event, "message");
    return typeof m === "string" ? m : "생성 중 오류가 발생했습니다.";
  }
  if (providerId === "openai" || providerId === "xai") {
    const m = pick(event, "error", "message");
    if (typeof m === "string") return m;
  }
  return null;
}

export function friendlyHttpError(providerId: ProviderId, status: number, detail: string): string {
  const name = getProvider(providerId).label;
  if (status === 401 || status === 403) {
    return `${name} API 키가 유효하지 않습니다. 설정에서 키를 다시 확인해 주세요.`;
  }
  if (status === 429) {
    return "요청이 몰렸거나 사용 한도에 걸렸습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (status === 404) {
    return `선택한 모델을 이 키로 사용할 수 없습니다. 설정에서 다른 모델을 골라보세요. (${detail || "not found"})`;
  }
  if (detail.toLowerCase().includes("credit") || detail.toLowerCase().includes("quota")) {
    return `${name} 크레딧이나 사용 한도가 부족합니다. 결제 정보를 확인해 주세요.`;
  }
  return detail || "요청을 처리하지 못했습니다.";
}
