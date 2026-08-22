"use client";

import { MODES, getMode, type Intimacy, type ModeId } from "@/lib/agent";
import Avatar from "./Avatar";
import { MODE_ICONS, IconKey } from "./Icons";

function address(userName: string, intimacy: Intimacy) {
  const name = userName.trim();
  if (intimacy === 1) return name ? `${name} 선생님` : "선생님";
  return name ? `${name}샘` : "선생님";
}

function greeting(who: string, intimacy: Intimacy) {
  const h = new Date().getHours();
  if (intimacy === 3) {
    if (h < 6) return `${who}, 이 시간까지 뭐 하고 있어요`;
    if (h < 12) return `${who}, 좋은 아침이에요`;
    if (h < 18) return `${who}, 오늘도 달리는 중이죠`;
    return `${who}, 퇴근은 했어요?`;
  }
  if (h < 6) return `${who}, 늦은 시간까지 고생이 많으십니다`;
  if (h < 12) return `${who}, 좋은 아침입니다`;
  if (h < 18) return `${who}, 오늘도 수고 많으십니다`;
  return `${who}, 퇴근은 하셨을까요`;
}

export default function Welcome({
  mode,
  hasKey,
  userName,
  intimacy,
  onPick,
  onModeChange,
  onOpenSettings,
}: {
  mode: ModeId;
  hasKey: boolean;
  userName: string;
  intimacy: Intimacy;
  onPick: (text: string) => void;
  onModeChange: (m: ModeId) => void;
  onOpenSettings: () => void;
}) {
  const current = getMode(mode);
  const who = address(userName, intimacy);
  const hello = greeting(who, intimacy);
  const helloLine = `${hello}${/[?!]$/.test(hello) ? " " : ". "}오늘은 뭐부터 할까요?`;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <div className="fadeup flex flex-col items-center text-center">
        <Avatar mood={hasKey ? "calm" : "thinking"} size={84} />
        <h1 className="mt-3 text-lg font-bold text-ink">김선생</h1>
        <p className="mt-0.5 text-xs text-muted">교직 8년차 · 옆자리 선배</p>
        <p className="mt-3 max-w-sm text-[0.8125rem] leading-relaxed text-ink2">
          가정통신문과 기안·품의, 수업 자료, 생기부 문구, 그리고 혼자 결정하기 어려운 일까지 같이 봅니다.
          편하게 말 걸어 주세요.
        </p>
      </div>

      {!hasKey ? (
        <button
          onClick={onOpenSettings}
          className="fadeup mt-6 flex w-full items-start gap-3 rounded-2xl border border-warn/35 bg-warn/[0.07] px-4 py-3.5 text-left transition-colors hover:bg-warn/[0.12]"
        >
          <IconKey className="mt-0.5 text-warn" />
          <span>
            <span className="block text-sm font-semibold text-ink">먼저 API 키를 등록해 주세요</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-ink2">
              Claude·ChatGPT·Gemini·Grok 중 가지고 계신 키를 하나만 넣으면 됩니다. 키는 이 브라우저에만
              저장됩니다. 눌러서 설정 열기.
            </span>
          </span>
        </button>
      ) : (
        <div className="fadeup mt-7 flex items-end gap-2">
          <Avatar mood="cheerful" size={28} />
          <div className="max-w-[80%] rounded-2xl rounded-bl-[6px] border border-line bg-surface px-3.5 py-2.5 text-[0.9375rem] text-ink">
            {helloLine}
          </div>
        </div>
      )}

      <div className="fadeup mt-7">
        <p className="mb-2 px-0.5 text-[11px] font-semibold text-muted">무엇을 도와드릴까요</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {MODES.filter((m) => m.id !== "assist").map((m) => {
            const Icon = MODE_ICONS[m.icon];
            const active = m.id === mode;
            return (
              <button
                key={m.id}
                onClick={() => onModeChange(m.id)}
                className={`rounded-2xl border p-3.5 text-left transition-colors ${
                  active ? "border-accent bg-accentsoft" : "border-line bg-surface hover:border-accent/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={active ? "text-accent" : "text-ink2"} />
                  <span className="text-[0.8125rem] font-semibold text-ink">{m.label}</span>
                </div>
                <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{m.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="fadeup mt-6">
        <p className="mb-2 px-0.5 text-[11px] font-semibold text-muted">
          {current.label} — 눌러서 바로 물어보기
        </p>
        <div className="flex flex-col items-end gap-1.5">
          {current.starters.map((s) => (
            <button
              key={s}
              onClick={() => onPick(s)}
              className="max-w-[92%] rounded-2xl rounded-br-[6px] border border-accent/35 bg-accentsoft px-3.5 py-2 text-left text-[0.8125rem] leading-relaxed text-accentink transition-colors hover:bg-accent hover:text-onaccent"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
