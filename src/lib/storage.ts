import type { Conversation, Settings } from "./types";
import { DEFAULT_MODEL } from "./agent";

const CONV_KEY = "kimteacher.conversations.v1";
const SETTINGS_KEY = "kimteacher.settings.v1";

export const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  model: DEFAULT_MODEL,
  schoolLevel: "",
  grade: "",
  subject: "",
  extraContext: "",
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
    return { ...DEFAULT_SETTINGS, ...safeParse(localStorage.getItem(SETTINGS_KEY), {}) };
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
    /* quota exceeded or storage unavailable */
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
  if (sameDay) {
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}
