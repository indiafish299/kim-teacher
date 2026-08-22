"use client";

import Avatar from "./Avatar";
import { getProvider } from "@/lib/providers";
import { activeKey, activeModel } from "@/lib/storage";
import type { Settings } from "@/lib/types";
import type { MoodId } from "@/lib/mood";
import { IconCalendar, IconMenu, IconSettings } from "./Icons";

export default function ChatHeader({
  settings,
  mood,
  busy,
  taskCount,
  onOpenMenu,
  onOpenSettings,
  onExportCalendar,
}: {
  settings: Settings;
  mood: MoodId;
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

  const status = busy ? "입력 중…" : hasKey ? `${provider.label} · ${modelLabel}` : "API 키를 등록해 주세요";

  const iconBtn =
    "relative rounded-full p-2 text-ink2 transition-colors hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <header className="flex items-center gap-2 border-b border-line bg-surface/95 px-2 py-2 backdrop-blur sm:px-3">
      <button
        onClick={onOpenMenu}
        aria-label="메뉴 열기"
        className="rounded-full p-2 text-ink2 hover:bg-surface2 lg:hidden"
      >
        <IconMenu />
      </button>

      <div className="relative ml-1">
        <Avatar mood={mood} size={40} />
        <span
          className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-surface ${
            busy ? "bg-accent" : hasKey ? "bg-accent" : "bg-warn"
          } ${busy ? "animate-pulse" : ""}`}
          aria-hidden
        />
      </div>

      <div className="ml-2.5 min-w-0 flex-1 leading-tight">
        <div className="truncate text-[0.9375rem] font-semibold text-ink">김선생</div>
        <div className={`truncate text-[11.5px] ${busy ? "text-accent" : hasKey ? "text-muted" : "text-warn"}`}>
          {status}
        </div>
      </div>

      <button
        onClick={onExportCalendar}
        disabled={taskCount === 0}
        aria-label="업무 일정 내보내기"
        title={taskCount === 0 ? "날짜가 정해진 업무가 없습니다" : "업무 일정을 캘린더 파일로 내려받기"}
        className={iconBtn}
      >
        <IconCalendar />
        {taskCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-onaccent">
            {taskCount}
          </span>
        )}
      </button>

      <button onClick={onOpenSettings} aria-label="설정" className={iconBtn}>
        <IconSettings />
        {!hasKey && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-warn" aria-hidden />
        )}
      </button>
    </header>
  );
}
