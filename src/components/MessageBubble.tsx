"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/lib/types";
import { IconCheck, IconCopy, IconDownload, IconRefresh } from "./Icons";

function useCopy() {
  const [done, setDone] = useState(false);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setDone(true);
    setTimeout(() => setDone(false), 1600);
  };
  return { done, copy };
}

function download(text: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob(["﻿" + text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `김선생_${stamp}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function UserBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="fadeup flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-bubbleuser px-4 py-2.5 text-[0.9375rem] leading-relaxed whitespace-pre-wrap text-ink">
        {message.content}
      </div>
    </div>
  );
}

export function AssistantBubble({
  message,
  streaming,
  onRetry,
}: {
  message: ChatMessage;
  streaming?: boolean;
  onRetry?: () => void;
}) {
  const { done, copy } = useCopy();

  if (message.error) {
    return (
      <div className="fadeup rounded-xl border border-danger/35 bg-danger/[0.06] px-4 py-3 text-sm text-danger">
        <div className="font-medium">문제가 생겼습니다</div>
        <p className="mt-1 leading-relaxed text-ink2">{message.content}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-surface2"
          >
            <IconRefresh className="h-3.5 w-3.5" />
            다시 시도
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="fadeup group">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-[11px] font-bold text-onaccent">
          김
        </span>
        <span className="text-xs font-medium text-muted">김선생</span>
      </div>

      <div className={`answer ${streaming && !message.content ? "text-muted" : ""}`}>
        {message.content ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
        ) : (
          <span className="text-sm text-muted">생각하는 중…</span>
        )}
        {streaming && message.content && <span className="caret" />}
      </div>

      {!streaming && message.content && (
        <div className="mt-3 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            onClick={() => copy(message.content)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink2 hover:bg-surface2"
          >
            {done ? <IconCheck className="h-3.5 w-3.5 text-accent" /> : <IconCopy className="h-3.5 w-3.5" />}
            {done ? "복사됨" : "복사"}
          </button>
          <button
            onClick={() => download(message.content)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink2 hover:bg-surface2"
          >
            <IconDownload className="h-3.5 w-3.5" />
            txt로 저장
          </button>
        </div>
      )}
    </div>
  );
}
