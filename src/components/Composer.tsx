"use client";

import { useEffect, useRef } from "react";
import { IconSend, IconStop } from "./Icons";

export default function Composer({
  value,
  busy,
  disabled,
  onChange,
  onSend,
  onStop,
}: {
  value: string;
  busy: boolean;
  disabled: boolean;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 190) + "px";
  }, [value]);

  return (
    <div className="border-t border-line bg-surface px-2 pt-2 pb-2.5 sm:px-4 sm:pb-3">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-end gap-2">
          <div className="flex min-w-0 flex-1 items-end rounded-[22px] border border-line bg-paper py-1 pr-1 pl-3.5 focus-within:border-accent">
            <textarea
              ref={ref}
              rows={1}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  if (!busy && value.trim()) onSend();
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
              disabled={!value.trim() || disabled}
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
