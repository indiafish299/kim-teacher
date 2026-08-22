"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage, GeneratedFile } from "@/lib/types";
import { splitBlocks, toPlainText, type ParsedTask } from "@/lib/blocks";
import { parseMood } from "@/lib/mood";
import { copyText, downloadText } from "@/lib/clipboard";
import { formatTime } from "@/lib/storage";
import { fileTag, formatBytes } from "@/lib/files";
import { toolDoneLabel, toolLabel } from "@/lib/tools";
import Avatar from "./Avatar";
import DocCard from "./DocCard";
import TaskWidget from "./TaskWidget";
import {
  IconCheck,
  IconClose,
  IconCopy,
  IconDownload,
  IconFolder,
  IconRefresh,
  IconSpinner,
} from "./Icons";

export function DateChip({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-1">
      <span className="rounded-full bg-surface2 px-3 py-1 text-[11px] font-medium text-muted">{label}</span>
    </div>
  );
}

export function UserBubble({ message }: { message: ChatMessage }) {
  const files = message.attachments ?? [];
  return (
    <div className="fadeup flex flex-col items-end gap-1.5">
      {files.length > 0 && (
        <div className="flex max-w-[78%] flex-wrap justify-end gap-1.5">
          {files.map((f) => (
            <span
              key={f.id}
              className="flex max-w-[200px] items-center gap-2 rounded-xl border border-line bg-surface py-1.5 pr-2.5 pl-2 text-xs"
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-accentsoft text-[8.5px] font-bold text-accentink">
                {fileTag(f.name)}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-ink">{f.name}</span>
                <span className="block text-[10px] text-muted">{formatBytes(f.size)}</span>
              </span>
            </span>
          ))}
        </div>
      )}
      {message.content && (
        <div className="flex items-end gap-1.5">
          <span className="mb-0.5 shrink-0 text-[10.5px] text-muted">{formatTime(message.createdAt)}</span>
          <div className="max-w-[78%] rounded-2xl rounded-br-[6px] bg-accent px-3.5 py-2.5 text-[0.9375rem] leading-relaxed whitespace-pre-wrap text-onaccent">
            {message.content}
          </div>
        </div>
      )}
    </div>
  );
}

/** 김선생이 도구를 쓰는 동안 말풍선 위에 뜨는 한 줄. */
function ToolStrip({ tools }: { tools: NonNullable<ChatMessage["tools"]> }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tools.map((t) => (
        <span
          key={t.id}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${
            t.done && t.ok === false
              ? "border-danger/35 bg-danger/[0.07] text-danger"
              : "border-line bg-surface2 text-muted"
          }`}
        >
          {t.done ? (
            t.ok === false ? (
              <IconClose className="h-3 w-3" />
            ) : (
              <IconCheck className="h-3 w-3 text-accent" />
            )
          ) : (
            <IconSpinner className="h-3 w-3" />
          )}
          {t.done
            ? t.ok === false
              ? `${toolLabel(t.name).replace(" 중", "")} 실패`
              : toolDoneLabel(t.name)
            : toolLabel(t.name)}
        </span>
      ))}
    </div>
  );
}

/** 코드 실행으로 만들어진 결과 파일 카드. */
function FileCard({
  file,
  folderConnected,
  onDownload,
  onSave,
}: {
  file: GeneratedFile;
  folderConnected: boolean;
  onDownload: (f: GeneratedFile) => Promise<void> | void;
  onSave: (f: GeneratedFile) => Promise<void> | void;
}) {
  const [state, setState] = useState<"idle" | "busy" | "saved">("idle");
  const [note, setNote] = useState("");

  const act = async (fn: () => Promise<void> | void, doneNote: string) => {
    setState("busy");
    setNote("");
    try {
      await fn();
      setState("saved");
      setNote(doneNote);
      setTimeout(() => setState("idle"), 2500);
    } catch (e) {
      setState("idle");
      setNote(e instanceof Error ? e.message : "실패했습니다.");
    }
  };

  const btn =
    "inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink2 hover:bg-surface2 disabled:opacity-50";

  return (
    <div className="max-w-[94%] rounded-xl border border-line bg-surface px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accentsoft text-[9px] font-bold text-accentink">
          {fileTag(file.name)}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[0.8125rem] font-medium text-ink">{file.name}</div>
          <div className="text-[10.5px] text-muted">
            {file.size ? formatBytes(file.size) : "김선생이 만든 파일"}
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button onClick={() => act(() => onDownload(file), "내려받았습니다")} disabled={state === "busy"} className={btn}>
          {state === "busy" ? <IconSpinner className="h-3 w-3" /> : <IconDownload className="h-3 w-3" />}
          내려받기
        </button>
        {folderConnected && (
          <button onClick={() => act(() => onSave(file), "폴더에 저장했습니다")} disabled={state === "busy"} className={btn}>
            <IconFolder className="h-3 w-3" />
            내 폴더에 저장
          </button>
        )}
        {note && <span className="text-[10.5px] text-muted">{note}</span>}
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
  folderConnected,
  onRetry,
  onAddTasks,
  onExportTasks,
  onDownloadFile,
  onSaveFile,
}: {
  message: ChatMessage;
  streaming?: boolean;
  folderConnected: boolean;
  onRetry?: () => void;
  onAddTasks: (group: string, items: ParsedTask[]) => void;
  onExportTasks: (group: string, items: ParsedTask[]) => void;
  onDownloadFile: (f: GeneratedFile) => Promise<void> | void;
  onSaveFile: (f: GeneratedFile) => Promise<void> | void;
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
        {(message.tools?.length ?? 0) > 0 && <ToolStrip tools={message.tools!} />}

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

        {(message.files?.length ?? 0) > 0 && (
          <div className="space-y-1.5 pt-0.5">
            {message.files!.map((f) => (
              <FileCard
                key={f.id}
                file={f}
                folderConnected={folderConnected}
                onDownload={onDownloadFile}
                onSave={onSaveFile}
              />
            ))}
          </div>
        )}

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
