"use client";

import { useEffect, useRef, useState } from "react";
import type { Attachment } from "@/lib/types";
import { fileTag, formatBytes } from "@/lib/files";
import { IconClip, IconClose, IconFolder, IconSend, IconSpinner, IconStop } from "./Icons";

export function AttachChip({
  name,
  size,
  busy,
  onRemove,
}: {
  name: string;
  size?: number;
  busy?: boolean;
  onRemove?: () => void;
}) {
  return (
    <span className="flex max-w-[220px] items-center gap-2 rounded-lg border border-line bg-surface py-1.5 pr-1.5 pl-2 text-xs">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-accentsoft text-[8.5px] font-bold text-accentink">
        {busy ? <IconSpinner className="h-3 w-3" /> : fileTag(name)}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-ink">{name}</span>
        {size !== undefined && <span className="block text-[10px] text-muted">{formatBytes(size)}</span>}
      </span>
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={`${name} 빼기`}
          className="shrink-0 rounded p-0.5 text-muted hover:bg-surface2 hover:text-ink"
        >
          <IconClose className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

export default function Composer({
  value,
  busy,
  disabled,
  canAttach,
  attachments,
  uploading,
  folderConnected,
  onChange,
  onSend,
  onStop,
  onFiles,
  onRemoveAttachment,
  onOpenFolder,
}: {
  value: string;
  busy: boolean;
  disabled: boolean;
  canAttach: boolean;
  attachments: Attachment[];
  uploading: string[];
  folderConnected: boolean;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  onFiles: (files: File[]) => void;
  onRemoveAttachment: (id: string) => void;
  onOpenFolder: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 190) + "px";
  }, [value]);

  const hasChips = attachments.length > 0 || uploading.length > 0;
  const canSend = Boolean(value.trim() || attachments.length);

  return (
    <div
      className={`border-t px-2 pt-2 pb-2.5 transition-colors sm:px-4 sm:pb-3 ${
        dragging ? "border-accent bg-accentsoft" : "border-line bg-surface"
      }`}
      onDragOver={(e) => {
        if (!canAttach) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        if (!canAttach) return;
        e.preventDefault();
        setDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length) onFiles(files);
      }}
    >
      <div className="mx-auto w-full max-w-3xl">
        {hasChips && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attachments.map((a) => (
              <AttachChip
                key={a.id}
                name={a.name}
                size={a.size}
                onRemove={() => onRemoveAttachment(a.id)}
              />
            ))}
            {uploading.map((name) => (
              <AttachChip key={`up-${name}`} name={name} busy />
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          {canAttach && (
            <div className="mb-0.5 flex shrink-0 gap-1">
              <button
                onClick={() => fileRef.current?.click()}
                aria-label="파일 첨부"
                title="파일 첨부 (엑셀·PDF·이미지 등)"
                className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-ink2 transition-colors hover:bg-surface2"
              >
                <IconClip className="h-4 w-4" />
              </button>
              {folderConnected && (
                <button
                  onClick={onOpenFolder}
                  aria-label="연결된 폴더에서 고르기"
                  title="연결된 폴더에서 고르기"
                  className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-ink2 transition-colors hover:bg-surface2"
                >
                  <IconFolder className="h-4 w-4" />
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length) onFiles(files);
                  e.target.value = "";
                }}
              />
            </div>
          )}

          <div className="flex min-w-0 flex-1 items-end rounded-[22px] border border-line bg-paper py-1 pr-1 pl-3.5 focus-within:border-accent">
            <textarea
              ref={ref}
              rows={1}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onPaste={(e) => {
                if (!canAttach) return;
                const files = Array.from(e.clipboardData.files);
                if (files.length) {
                  e.preventDefault();
                  onFiles(files);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  if (!busy && canSend) onSend();
                }
              }}
              placeholder="김선생에게 메시지 보내기"
              disabled={disabled}
              className="scroll-thin max-h-[190px] flex-1 resize-none bg-transparent py-2 text-[0.9375rem] leading-relaxed text-ink outline-none placeholder:text-muted disabled:cursor-not-allowed"
            />
          </div>

          {busy ? (
            <button
              onClick={onStop}
              aria-label="생성 중지"
              className="mb-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface2 text-ink2 transition-colors hover:bg-line"
            >
              <IconStop className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={!canSend || disabled}
              aria-label="보내기"
              className="mb-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-onaccent transition-colors hover:bg-accenthover disabled:cursor-not-allowed disabled:bg-surface2 disabled:text-muted"
            >
              <IconSend className="h-4 w-4" />
            </button>
          )}
        </div>

        <p className="mt-1.5 text-center text-[10.5px] leading-relaxed text-muted">
          <span className="hidden sm:inline">Enter 전송 · Shift+Enter 줄바꿈 &nbsp;·&nbsp; </span>
          학생·학부모 실명이나 연락처는 입력하지 마세요
        </p>
      </div>
    </div>
  );
}
