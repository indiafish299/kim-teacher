import type { ModeId } from "./agent";
import type { ProviderId } from "./providers";
import type { McpServer, ToolFlags } from "./tools";
import type { Attachment, GeneratedFile } from "./types";

export type StreamArgs = {
  apiKey: string;
  provider: ProviderId;
  model: string;
  mode: ModeId;
  profile: string;
  userName: string;
  intimacy: number;
  tools: ToolFlags;
  mcpServers: McpServer[];
  containerId?: string;
  messages: { role: "user" | "assistant"; content: string; attachments?: Attachment[] }[];
  signal: AbortSignal;
  onDelta: (text: string) => void;
  onTool?: (e: { id: string; name?: string; phase: "start" | "end"; ok?: boolean }) => void;
  onFile?: (f: GeneratedFile) => void;
  onContainer?: (id: string) => void;
};

type Event = {
  text?: string;
  error?: string;
  tool?: { id: string; name?: string; phase: "start" | "end"; ok?: boolean };
  file?: GeneratedFile;
  container?: string;
};

export async function streamChat({
  apiKey,
  provider,
  model,
  mode,
  profile,
  userName,
  intimacy,
  tools,
  mcpServers,
  containerId,
  messages,
  signal,
  onDelta,
  onTool,
  onFile,
  onContainer,
}: StreamArgs): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user-api-key": apiKey,
    },
    body: JSON.stringify({
      messages,
      mode,
      provider,
      model,
      profile,
      userName,
      intimacy,
      tools,
      mcpServers,
      containerId,
    }),
    signal,
  });

  if (!res.ok || !res.body) {
    let message = "요청을 처리하지 못했습니다.";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
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
        if (!payload) continue;
        if (payload === "[DONE]") return;

        let event: Event;
        try {
          event = JSON.parse(payload) as Event;
        } catch {
          continue;
        }
        if (event.error) throw new Error(event.error);
        if (event.text) onDelta(event.text);
        if (event.tool) onTool?.(event.tool);
        if (event.file) onFile?.(event.file);
        if (event.container) onContainer?.(event.container);
      }
    }
  }
}
