"use client";

import type { SessionInfo } from "@/lib/account";
import { IconSettings } from "./Icons";

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.1-2.8-.4-4H24v7.3h12.1c-.2 1.9-1.6 4.9-4.5 6.9l-.04.3 6.5 5 .5.1c4.1-3.8 6.5-9.5 6.5-15.6"
      />
      <path
        fill="#34A853"
        d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.4c-1.8 1.3-4.3 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-.3.02-6.8 5.2-.1.3C7.9 41 15.4 46 24 46"
      />
      <path
        fill="#FBBC05"
        d="M11.5 28.4c-.5-1.4-.8-2.9-.8-4.4 0-1.6.3-3.1.7-4.4v-.3l-6.9-5.3-.2.1C2.6 17 1.8 20.4 1.8 24s.8 7 2.5 9.9z"
      />
      <path
        fill="#EA4335"
        d="M24 9.5c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 3.4 29.9 1 24 1 15.4 1 7.9 6 4.3 13.3l7.2 5.6C13.3 13.3 18.2 9.5 24 9.5"
      />
    </svg>
  );
}

export default function AccountBar({
  session,
  syncing,
  syncedAt,
  onSignOut,
  onOpenSettings,
}: {
  session: SessionInfo | null;
  syncing: boolean;
  syncedAt: number | null;
  onSignOut: () => void;
  onOpenSettings: () => void;
}) {
  const settingsBtn =
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-ink transition-colors hover:bg-surface2";

  if (!session?.authConfigured) {
    return (
      <div className="border-t border-line p-2">
        <button onClick={onOpenSettings} className={settingsBtn}>
          <IconSettings className="text-muted" />
          <span className="flex-1 text-left">설정</span>
        </button>
      </div>
    );
  }

  if (!session.user) {
    return (
      <div className="space-y-1 border-t border-line p-2">
        <a
          href="/api/auth/google"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-[0.8125rem] font-semibold text-ink transition-colors hover:bg-surface2"
        >
          <GoogleMark />
          구글로 로그인
        </a>
        <p className="px-2 pb-1 text-[10.5px] leading-relaxed text-muted">
          로그인하면 대화와 업무 목록이 기기 간에 동기화됩니다. API 키는 동기화하지 않고 이 브라우저에만
          남습니다.
        </p>
        <button onClick={onOpenSettings} className={settingsBtn}>
          <IconSettings className="text-muted" />
          <span className="flex-1 text-left">설정</span>
        </button>
      </div>
    );
  }

  const status = !session.syncConfigured
    ? "동기화 저장소 미설정"
    : syncing
      ? "동기화 중…"
      : syncedAt
        ? `동기화됨 · ${new Date(syncedAt).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" })}`
        : "로그인됨";

  return (
    <div className="space-y-1 border-t border-line p-2">
      <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
        {session.user.picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.picture}
            alt=""
            referrerPolicy="no-referrer"
            className="h-7 w-7 shrink-0 rounded-full ring-1 ring-line"
          />
        ) : (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accentsoft text-[11px] font-bold text-accentink">
            {session.user.name.slice(0, 1)}
          </span>
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[0.8125rem] font-medium text-ink">{session.user.name}</div>
          <div className="truncate text-[10.5px] text-muted">{status}</div>
        </div>
        <button
          onClick={onSignOut}
          className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-muted hover:bg-surface2 hover:text-ink"
        >
          로그아웃
        </button>
      </div>
      <button onClick={onOpenSettings} className={settingsBtn}>
        <IconSettings className="text-muted" />
        <span className="flex-1 text-left">설정</span>
      </button>
    </div>
  );
}
