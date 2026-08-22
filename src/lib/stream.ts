import type { ModeId } from "./agent";
import type { ProviderId } from "./providers";

export type StreamArgs = {
  apiKey: string;
  provider: ProviderId;
  model: string;
  mode: ModeId;
  profile: string;
  userName: string;
  intimacy: number;
  mcpUrl?: string;
  mcpToken?: string;
  messages: { role: "user" | "assistant"; content: string }[];
  signal: AbortSignal;
  onDelta: (text: string) => void;
};

export async function streamChat({
  apiKey,
  provider,
  model,
  mode,
  profile,
  userName,
  intimacy,
  mcpUrl,
  mcpToken,
  messages,
  signal,
  onDelta,
}: StreamArgs): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user-api-key": apiKey,
    },
    body: JSON.stringify({ messages, mode, provider, model, profile, userName, intimacy, mcpUrl, mcpToken }),
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
        try {
          const event = JSON.parse(payload) as { text?: string; error?: string };
          if (event.error) throw new Error(event.error);
          if (event.text) onDelta(event.text);
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
  }
}
