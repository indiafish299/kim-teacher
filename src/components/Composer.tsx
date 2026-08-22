"use client";

import { useEffect, useRef } from "react";
import { MODES, getMode, type ModeId } from "@/lib/agent";
import { MODE_ICONS, IconSend, IconStop } from "./Icons";

export default function Composer({
  value,
  mode,
  busy,
  disabled,
  onChange,
  onModeChange,
  onSend,
  onStop,
}: {
  value: string;
  mode: ModeId;
  busy: boolean;
  disabled: boolean;
  onChange: (v: string) => void;
  onModeChange: (m: ModeId) => void;
  onSend: () => void;
  onStop: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  }, [value]);

  const current = getMode(mode);

  return (
    <div className="border-t border-line bg-paper px-3 pt-2.5 pb-3 sm:px-6 sm:pb-4">
      <div className="mx-auto w-full max-w-3xl">
        <div className="scroll-thin mb-2 flex gap-1.5 overflow-x-auto pb-0.5">
          {MODES.map((m) => {
            const Icon = MODE_ICONS[m.icon];
            const active = m.id === mode;
            return (
              <button
                key={m.id}
                onClick={() => onModeChange(m.id)}
                title={m.description}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-accent bg-accent text-onaccent"
                    : "border-line bg-surface text-ink2 hover:bg-surface2"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {m.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-end gap-2 rounded-2xl border border-line bg-surface p-2 shadow-sm focus-within:border-accent">
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
            placeholder={current.placeholder}
            disabled={disabled}
            className="scroll-thin max-h-[220px] flex-1 resize-none bg-transparent px-2.5 py-2 text-[0.9375rem] leading-relaxed text-ink outline-none placeholder:text-muted disabled:cursor-not-allowed"
          />
          {busy ? (
            <button
              onClick={onStop}
              aria-label="생성 중지"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface2 text-ink2 hover:bg-line"
            >
              <IconStop className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={!value.trim() || disabled}
              aria-label="보내기"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-onaccent transition-colors hover:bg-accenthover disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
            >
              <IconSend className="h-4 w-4" />
            </button>
          )}
        </div>

        <p className="mt-2 text-center text-[11px] leading-relaxed text-muted">
          <span className="hidden sm:inline">Enter로 전송 · Shift+Enter로 줄바꿈 &nbsp;|&nbsp; </span>
          학생·학부모 실명이나 연락처는 입력하지 마세요.
        </p>
      </div>
    </div>
  );
}
