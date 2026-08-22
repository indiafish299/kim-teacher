"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/lib/types";
import { splitBlocks, toPlainText, type ParsedTask } from "@/lib/blocks";
import { parseMood } from "@/lib/mood";
import { copyText, downloadText } from "@/lib/clipboard";
import { formatTime } from "@/lib/storage";
import Avatar from "./Avatar";
import DocCard from "./DocCard";
import TaskWidget from "./TaskWidget";
import { IconCheck, IconCopy, IconDownload, IconRefresh } from "./Icons";

export function DateChip({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-1">
      <span className="rounded-full bg-surface2 px-3 py-1 text-[11px] font-medium text-muted">{label}</span>
    </div>
  );
}

export function UserBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="fadeup flex items-end justify-end gap-1.5">
      <span className="mb-0.5 shrink-0 text-[10.5px] text-muted">{formatTime(message.createdAt)}</span>
      <div className="max-w-[78%] rounded-2xl rounded-br-[6px] bg-accent px-3.5 py-2.5 text-[0.9375rem] leading-relaxed whitespace-pre-wrap text-onaccent">
        {message.content}
      </div>
    </div>
  );
}

export function TypingBubble({ mood }: { mood?: ChatMessage["mood"] }) {
  return (
    <div className="fadeup flex items-end gap-2">
      <Avatar mood={mood} size={30} />
      <div className="rounded-2xl rounded-bl-[6px] border border-line bg-surface px-4 py-3">
        <span className="typing" aria-label="입력 중">
          <i />
          <i />
          <i />
        </span>
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
  const body = useMemo(() => parseMood(message.content).text, [message.content]);
  const segments = useMemo(() => splitBlocks(body), [body]);

  if (message.error) {
    return (
      <div className="fadeup flex items-start gap-2">
        <Avatar mood="concerned" size={30} className="mt-0.5" />
        <div className="max-w-[85%] rounded-2xl rounded-bl-[6px] border border-danger/35 bg-danger/[0.07] px-3.5 py-3 text-sm">
          <div className="font-medium text-danger">문제가 생겼습니다</div>
          <p className="mt-1 leading-relaxed text-ink2">{message.content}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface2"
            >
              <IconRefresh className="h-3.5 w-3.5" />
              다시 보내기
            </button>
          )}
        </div>
      </div>
    );
  }

  const lastIndex = segments.length - 1;
  const actionBtn =
    "inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink2 hover:bg-surface2";

  return (
    <div className="fadeup group flex items-start gap-2">
      <Avatar mood={message.mood} size={30} className="mt-0.5" />

      <div className="min-w-0 flex-1 space-y-1.5">
        {segments.length === 0 && streaming && (
          <div className="inline-block rounded-2xl rounded-bl-[6px] border border-line bg-surface px-4 py-3">
            <span className="typing">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}

        {segments.map((seg, i) => {
          if (seg.kind === "doc") {
            return (
              <div key={i} className="max-w-[94%]">
                <DocCard raw={seg.text} streaming={streaming && seg.open} />
              </div>
            );
          }
          if (seg.kind === "tasks") {
            return (
              <div key={i} className="max-w-[94%]">
                <TaskWidget
                  raw={seg.text}
                  streaming={streaming && seg.open}
                  onAdd={onAddTasks}
                  onExport={onExportTasks}
                />
              </div>
            );
          }
          return (
            <div
              key={i}
              className="max-w-[88%] rounded-2xl rounded-bl-[6px] border border-line bg-surface px-3.5 py-2.5"
            >
              <div className="answer">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{seg.text}</ReactMarkdown>
                {streaming && i === lastIndex && <span className="caret" />}
              </div>
            </div>
          );
        })}

        {!streaming && body && (
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="text-[10.5px] text-muted">{formatTime(message.createdAt)}</span>
            <span className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <button
                onClick={async () => {
                  if (await copyText(toPlainText(body))) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1600);
                  }
                }}
                className={actionBtn}
              >
                {copied ? <IconCheck className="h-3 w-3 text-accent" /> : <IconCopy className="h-3 w-3" />}
                {copied ? "복사됨" : "복사"}
              </button>
              <button
                onClick={() =>
                  downloadText(toPlainText(body), `김선생_${new Date().toISOString().slice(0, 10)}.txt`)
                }
                className={actionBtn}
              >
                <IconDownload className="h-3 w-3" />
                txt
              </button>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
