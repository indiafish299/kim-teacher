"use client";

import { MODES, getMode, type Intimacy, type ModeId } from "@/lib/agent";
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

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="fadeup">
        <p className="text-sm text-muted">{greeting(who, intimacy)}</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem]">
          무엇을 도와드릴까요?
        </h1>
        <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-ink2">
          일 잘하는 8년차 선배가 옆자리에서 거드는 느낌으로 씁니다. 가정통신문과 기안·품의 초안, 수업 자료,
          생활기록부 문구, 그리고 혼자 결정하기 어려운 일까지 함께 봅니다.
        </p>
      </div>

      {!hasKey && (
        <button
          onClick={onOpenSettings}
          className="fadeup mt-6 flex w-full items-start gap-3 rounded-xl border border-warn/35 bg-warn/[0.07] px-4 py-3.5 text-left transition-colors hover:bg-warn/[0.12]"
        >
          <IconKey className="mt-0.5 text-warn" />
          <span>
            <span className="block text-sm font-semibold text-ink">시작하려면 API 키가 필요합니다</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-ink2">
              Anthropic 콘솔에서 발급받은 키를 한 번만 등록하면 됩니다. 키는 이 브라우저에만 저장됩니다.
              눌러서 설정 열기.
            </span>
          </span>
        </button>
      )}

      <div className="fadeup mt-8 grid gap-2.5 sm:grid-cols-2">
        {MODES.filter((m) => m.id !== "assist").map((m) => {
          const Icon = MODE_ICONS[m.icon];
          const active = m.id === mode;
          return (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                active ? "border-accent bg-accentsoft" : "border-line bg-surface hover:border-accent/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className={active ? "text-accent" : "text-ink2"} />
                <span className="text-sm font-semibold text-ink">{m.label}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">{m.description}</p>
            </button>
          );
        })}
      </div>

      <div className="fadeup mt-8">
        <p className="mb-2.5 text-xs font-semibold tracking-wide text-muted">
          {current.label} — 이렇게 물어보세요
        </p>
        <div className="space-y-1.5">
          {current.starters.map((s) => (
            <button
              key={s}
              onClick={() => onPick(s)}
              className="block w-full rounded-lg border border-linesoft bg-surface px-3.5 py-2.5 text-left text-[0.8125rem] text-ink2 transition-colors hover:border-accent/50 hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
