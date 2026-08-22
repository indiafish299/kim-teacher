import type { ModeId } from "./agent";
import type { ProviderId } from "./providers";

export type Role = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  error?: boolean;
};

export type Conversation = {
  id: string;
  title: string;
  mode: ModeId;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
};

export type TaskItem = {
  id: string;
  title: string;
  /** ISO date (YYYY-MM-DD) when known */
  due: string;
  group: string;
  done: boolean;
  createdAt: number;
};

export type Settings = {
  provider: ProviderId;
  keys: Record<ProviderId, string>;
  models: Record<ProviderId, string>;
  schoolLevel: string;
  grade: string;
  subject: string;
  extraContext: string;
  mcpUrl: string;
  mcpToken: string;
};
