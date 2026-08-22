"use client";

import { getProvider } from "@/lib/providers";
import type { Settings } from "@/lib/types";
import { activeKey, activeModel } from "@/lib/storage";
import { IconCalendar, IconKey, IconMenu } from "./Icons";

export default function TopNav({
  settings,
  busy,
  taskCount,
  onOpenMenu,
  onOpenSettings,
  onExportCalendar,
}: {
  settings: Settings;
  busy: boolean;
  taskCount: number;
  onOpenMenu: () => void;
  onOpenSettings: () => void;
  onExportCalendar: () => void;
}) {
  const provider = getProvider(settings.provider);
  const hasKey = Boolean(activeKey(settings));
  const modelLabel =
    provider.models.find((m) => m.id === activeModel(settings))?.label ?? activeModel(settings);

  const status = busy
    ? { dot: "bg-accent animate-pulse", text: "작성 중…", tone: "text-accentink" }
    : hasKey
      ? { dot: "bg-accent", text: "대기 중", tone: "text-muted" }
      : { dot: "bg-warn", text: "API 키 필요", tone: "text-warn" };

  return (
    <header className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2.5 sm:px-4">
      <button
        onClick={onOpenMenu}
        aria-label="메뉴 열기"
        className="rounded-lg p-2 text-ink2 hover:bg-surface2 lg:hidden"
      >
        <IconMenu />
      </button>

      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-sm font-bold text-onaccent">
          김
        </span>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-bold text-ink">선배교사 김선생</div>
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`} />
            <span className={`truncate text-[11px] ${status.tone}`}>{status.text}</span>
          </div>
        </div>
      </div>

      <div className="flex-1" />

      <button
        onClick={onExportCalendar}
        disabled={taskCount === 0}
        title={taskCount === 0 ? "날짜가 정해진 업무가 없습니다" : "업무 일정을 캘린더 파일로 내려받기"}
        className="hidden items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink2 transition-colors hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-45 sm:inline-flex"
      >
        <IconCalendar className="h-3.5 w-3.5" />
        일정 내보내기
        {taskCount > 0 && (
          <span className="rounded-full bg-accentsoft px-1.5 text-[10px] font-semibold text-accentink">
            {taskCount}
          </span>
        )}
      </button>

      <button
        onClick={onOpenSettings}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
          hasKey
            ? "border-line text-ink2 hover:bg-surface2"
            : "border-warn/45 bg-warn/10 text-warn hover:bg-warn/15"
        }`}
      >
        <IconKey className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">
          {hasKey ? `${provider.label} · ${modelLabel}` : "API 키 설정"}
        </span>
        <span className="sm:hidden">{hasKey ? provider.short : "키"}</span>
      </button>
    </header>
  );
}
