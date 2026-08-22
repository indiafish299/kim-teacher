"use client";

import type { Intimacy } from "@/lib/agent";
import Avatar from "./Avatar";
import { IconKey } from "./Icons";

const STARTERS = [
  "체험학습 가정통신문 초안 좀 부탁해요",
  "학부모가 퇴근 후에도 계속 연락하시는데 어떡하죠?",
  "4학년 과학 '물의 상태 변화' 40분 지도안 필요해요",
  "행동특성 500자요. 조용한데 맡은 일은 끝까지 하는 학생",
  "학기말 업무가 몰렸는데 우선순위 좀 잡아주세요",
];

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
  hasKey,
  userName,
  intimacy,
  onPick,
  onOpenSettings,
}: {
  hasKey: boolean;
  userName: string;
  intimacy: Intimacy;
  onPick: (text: string) => void;
  onOpenSettings: () => void;
}) {
  const who = address(userName, intimacy);
  const hello = greeting(who, intimacy);
  const helloLine = `${hello}${/[?!]$/.test(hello) ? " " : ". "}뭐부터 도와드릴까요?`;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <div className="fadeup flex flex-col items-center text-center">
        <Avatar mood={hasKey ? "calm" : "thinking"} size={84} />
        <h1 className="mt-3 text-lg font-bold text-ink">김선생</h1>
        <p className="mt-0.5 text-xs text-muted">교직 8년차 · 옆자리 선배</p>
        <p className="mt-3 max-w-sm text-[0.8125rem] leading-relaxed text-ink2">
          가정통신문이든 기안이든, 학생 문제든 생기부 문구든 그냥 말씀만 하세요.
          무슨 일인지는 제가 알아서 판단합니다.
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

      <div className="fadeup mt-6">
        <p className="mb-2 px-0.5 text-right text-[11px] text-muted">눌러서 바로 보내기</p>
        <div className="flex flex-col items-end gap-1.5">
          {STARTERS.map((s) => (
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
