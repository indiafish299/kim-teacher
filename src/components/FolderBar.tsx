"use client";

import { IconClose, IconFolder } from "./Icons";

export default function FolderBar({
  supported,
  name,
  onConnect,
  onDisconnect,
}: {
  supported: boolean;
  name: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  if (!supported) {
    return (
      <div className="border-t border-line px-3 py-2.5">
        <p className="text-[10.5px] leading-relaxed text-muted">
          내 PC 폴더 연결은 <b className="text-ink2">크롬·엣지 데스크톱</b>에서만 됩니다. 다른
          브라우저에서는 파일을 첨부하고 결과물을 내려받는 방식으로 쓰시면 됩니다.
        </p>
      </div>
    );
  }

  if (!name) {
    return (
      <div className="border-t border-line p-2">
        <button
          onClick={onConnect}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-ink transition-colors hover:bg-surface2"
        >
          <IconFolder className="text-muted" />
          <span className="flex-1 text-left">내 PC 폴더 연결</span>
        </button>
        <p className="px-3 pb-1 text-[10.5px] leading-relaxed text-muted">
          업무 폴더를 연결하면 파일을 골라 바로 보여주고, 김선생이 만든 파일을 그 폴더에 저장합니다.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-line p-2">
      <div className="flex items-center gap-2.5 rounded-lg px-3 py-2.5">
        <IconFolder className="shrink-0 text-accent" />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[0.8125rem] font-medium text-ink">{name}</div>
          <div className="text-[10.5px] text-muted">연결됨</div>
        </div>
        <button
          onClick={onDisconnect}
          aria-label="폴더 연결 해제"
          className="shrink-0 rounded-md p-1 text-muted hover:bg-surface2 hover:text-ink"
        >
          <IconClose className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
