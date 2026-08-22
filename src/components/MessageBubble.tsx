"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/lib/types";
import { splitBlocks, toPlainText, type ParsedTask } from "@/lib/blocks";
import { copyText, downloadText } from "@/lib/clipboard";
import DocCard from "./DocCard";
import TaskWidget from "./TaskWidget";
import { IconCheck, IconCopy, IconDownload, IconRefresh } from "./Icons";

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
  onAddTasks,
  onExportTasks,
}: {
  message: ChatMessage;
  streaming?: boolean;
  onRetry?: () => void;
  onAddTasks: (group: string, items: ParsedTask[]) => void;
  onExportTasks: (group: string, items: ParsedTask[]) => void;
}) {
  const [copied, setCopied] = useState(false);
  const segments = useMemo(() => splitBlocks(message.content), [message.content]);

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

  const lastIndex = segments.length - 1;

  return (
    <div className="fadeup group">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-[11px] font-bold text-onaccent">
          김
        </span>
        <span className="text-xs font-medium text-muted">김선생</span>
      </div>

      {!message.content && (
        <p className="text-sm text-muted">{streaming ? "생각하는 중…" : "(내용 없음)"}</p>
      )}

      {segments.map((seg, i) => {
        const isLast = i === lastIndex;
        if (seg.kind === "doc") {
          return <DocCard key={i} raw={seg.text} streaming={streaming && seg.open} />;
        }
        if (seg.kind === "tasks") {
          return (
            <TaskWidget
              key={i}
              raw={seg.text}
              streaming={streaming && seg.open}
              onAdd={onAddTasks}
              onExport={onExportTasks}
            />
          );
        }
        return (
          <div key={i} className="answer">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{seg.text}</ReactMarkdown>
            {streaming && isLast && <span className="caret" />}
          </div>
        );
      })}

      {!streaming && message.content && (
        <div className="mt-3 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            onClick={async () => {
              if (await copyText(toPlainText(message.content))) {
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink2 hover:bg-surface2"
          >
            {copied ? <IconCheck className="h-3.5 w-3.5 text-accent" /> : <IconCopy className="h-3.5 w-3.5" />}
            {copied ? "복사됨" : "전체 복사"}
          </button>
          <button
            onClick={() =>
              downloadText(
                toPlainText(message.content),
                `김선생_${new Date().toISOString().slice(0, 10)}.txt`,
              )
            }
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
