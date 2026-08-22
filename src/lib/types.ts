import type { ModeId } from "./agent";

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

export type Settings = {
  apiKey: string;
  model: string;
  schoolLevel: string;
  grade: string;
  subject: string;
  extraContext: string;
};
