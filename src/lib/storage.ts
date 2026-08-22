import type { Conversation, Settings, TaskItem } from "./types";
import { DEFAULT_PROVIDER, PROVIDERS, getProvider, type ProviderId } from "./providers";
import { DEFAULT_INTIMACY } from "./agent";
import { DEFAULT_TOOL_FLAGS, type McpServer } from "./tools";

const CONV_KEY = "kimteacher.conversations.v1";
const SETTINGS_KEY = "kimteacher.settings.v2";
const LEGACY_SETTINGS_KEY = "kimteacher.settings.v1";
const TASKS_KEY = "kimteacher.tasks.v1";

function emptyByProvider(fn: (p: ProviderId) => string): Record<ProviderId, string> {
  return PROVIDERS.reduce(
    (acc, p) => {
      acc[p.id] = fn(p.id);
      return acc;
    },
    {} as Record<ProviderId, string>,
  );
}

export const DEFAULT_SETTINGS: Settings = {
  provider: DEFAULT_PROVIDER,
  userName: "",
  intimacy: DEFAULT_INTIMACY,
  keys: emptyByProvider(() => ""),
  models: emptyByProvider((id) => getProvider(id).defaultModel),
  schoolLevel: "",
  grade: "",
  subject: "",
  extraContext: "",
  tools: { ...DEFAULT_TOOL_FLAGS },
  mcpServers: [],
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = safeParse<Partial<Settings>>(localStorage.getItem(SETTINGS_KEY), {});
    const merged: Settings = {
      ...DEFAULT_SETTINGS,
      ...stored,
      keys: { ...DEFAULT_SETTINGS.keys, ...(stored.keys ?? {}) },
      models: { ...DEFAULT_SETTINGS.models, ...(stored.models ?? {}) },
      tools: { ...DEFAULT_TOOL_FLAGS, ...(stored.tools ?? {}) },
      mcpServers: Array.isArray(stored.mcpServers) ? stored.mcpServers : [],
    };

    // v5까지는 MCP 서버를 하나만 넣을 수 있었습니다. 있으면 목록으로 옮깁니다.
    if (merged.mcpServers.length === 0 && stored.mcpUrl) {
      merged.mcpServers = [
        {
          id: uid(),
          name: "내 MCP 서버",
          url: stored.mcpUrl,
          token: stored.mcpToken ?? "",
          enabled: true,
        } satisfies McpServer,
      ];
    }
    delete merged.mcpUrl;
    delete merged.mcpToken;

    // One-time migration from the single-provider v1 settings.
    if (!localStorage.getItem(SETTINGS_KEY)) {
      const legacy = safeParse<{ apiKey?: string; model?: string } & Partial<Settings>>(
        localStorage.getItem(LEGACY_SETTINGS_KEY),
        {},
      );
      if (legacy.apiKey) merged.keys.anthropic = legacy.apiKey;
      if (legacy.model) merged.models.anthropic = legacy.model;
      merged.schoolLevel = legacy.schoolLevel ?? merged.schoolLevel;
      merged.grade = legacy.grade ?? merged.grade;
      merged.subject = legacy.subject ?? merged.subject;
      merged.extraContext = legacy.extraContext ?? merged.extraContext;
    }

    if (!PROVIDERS.some((p) => p.id === merged.provider)) merged.provider = DEFAULT_PROVIDER;
    return merged;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable */
  }
}

export function activeKey(s: Settings) {
  return s.keys[s.provider] ?? "";
}

export function activeModel(s: Settings) {
  return s.models[s.provider] ?? getProvider(s.provider).defaultModel;
}

export function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const list = safeParse<Conversation[]>(localStorage.getItem(CONV_KEY), []);
    if (!Array.isArray(list)) return [];
    return list.filter((c) => c && typeof c.id === "string" && Array.isArray(c.messages));
  } catch {
    return [];
  }
}

export function saveConversations(list: Conversation[]) {
  try {
    localStorage.setItem(CONV_KEY, JSON.stringify(list.slice(0, 200)));
  } catch {
    /* quota exceeded */
  }
}

export function loadTasks(): TaskItem[] {
  if (typeof window === "undefined") return [];
  try {
    const list = safeParse<TaskItem[]>(localStorage.getItem(TASKS_KEY), []);
    if (!Array.isArray(list)) return [];
    return list.filter((t) => t && typeof t.id === "string" && typeof t.title === "string");
  } catch {
    return [];
  }
}

export function saveTasks(list: TaskItem[]) {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(list.slice(0, 300)));
  } catch {
    /* quota exceeded */
  }
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function makeTitle(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "새 대화";
  return clean.length > 28 ? clean.slice(0, 28) + "…" : clean;
}

export function formatDay(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay) return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

export function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
}

/** "오늘" / "어제" / "8월 20일 (수)" — used for the chat date separators. */
export function formatDateChip(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (diff === 0) return "오늘";
  if (diff === 1) return "어제";
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
}

export function sameDay(a: number, b: number) {
  const x = new Date(a);
  const y = new Date(b);
  return (
    x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate()
  );
}

/** Whole-day difference between today and an ISO date. Negative = past. */
export function daysUntil(iso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const target = new Date(iso + "T00:00:00");
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function ddayLabel(iso: string): string {
  const d = daysUntil(iso);
  if (d === null) return "";
  if (d === 0) return "D-day";
  return d > 0 ? `D-${d}` : `D+${-d}`;
}

export function formatDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [, m, d] = iso.split("-");
  return `${Number(m)}월 ${Number(d)}일`;
}
