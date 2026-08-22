import type { ModeId } from "./agent";

export type StreamArgs = {
  apiKey: string;
  model: string;
  mode: ModeId;
  profile: string;
  messages: { role: "user" | "assistant"; content: string }[];
  signal: AbortSignal;
  onDelta: (text: string) => void;
};

export async function streamChat({
  apiKey,
  model,
  mode,
  profile,
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
    body: JSON.stringify({ messages, mode, model, profile }),
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

  while (true) {
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
        try {
          const event = JSON.parse(payload);
          if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
            onDelta(event.delta.text as string);
          } else if (event.type === "error") {
            throw new Error(event.error?.message ?? "스트리밍 중 오류가 발생했습니다.");
          }
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
  }
}
