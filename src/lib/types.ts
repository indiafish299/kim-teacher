import type { Intimacy, ModeId } from "./agent";
import type { MoodId } from "./mood";
import type { ProviderId } from "./providers";
import type { McpServer, ToolFlags } from "./tools";

export type Role = "user" | "assistant";

/** 사용자가 붙인 파일. 실제 내용은 Anthropic Files API에만 있고 우리는 id만 들고 있습니다. */
export type Attachment = {
  /** Anthropic file_id */
  id: string;
  name: string;
  mime: string;
  size: number;
  /** 어떤 콘텐츠 블록으로 보낼지 */
  kind: "document" | "image" | "container";
};

/** 김선생이 도구를 쓰는 동안 화면에 뜨는 한 줄. */
export type ToolEvent = {
  id: string;
  name: string;
  done: boolean;
  ok?: boolean;
};

/** 코드 실행으로 만들어진 결과 파일. */
export type GeneratedFile = {
  id: string;
  name: string;
  mime?: string;
  size?: number;
};

export type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  error?: boolean;
  mood?: MoodId;
  attachments?: Attachment[];
  tools?: ToolEvent[];
  files?: GeneratedFile[];
};

export type Conversation = {
  id: string;
  title: string;
  mode: ModeId;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  /** 코드 실행 컨테이너를 대화 안에서 재사용하면 앞서 만든 파일을 이어서 씁니다. */
  containerId?: string;
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
  userName: string;
  intimacy: Intimacy;
  keys: Record<ProviderId, string>;
  models: Record<ProviderId, string>;
  schoolLevel: string;
  grade: string;
  subject: string;
  extraContext: string;
  tools: ToolFlags;
  mcpServers: McpServer[];
  /** v5 이전 설정. 불러올 때 mcpServers로 옮기고 비웁니다. */
  mcpUrl?: string;
  mcpToken?: string;
};
