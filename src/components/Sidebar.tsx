"use client";

import type { Conversation } from "@/lib/types";
import { formatDay } from "@/lib/storage";
import { getMode } from "@/lib/agent";
import { IconClose, IconPlus, IconSettings, IconTrash } from "./Icons";

export default function Sidebar({
  open,
  conversations,
  activeId,
  hasKey,
  onNew,
  onSelect,
  onDelete,
  onOpenSettings,
  onClose,
}: {
  open: boolean;
  conversations: Conversation[];
  activeId: string | null;
  hasKey: boolean;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
  onClose: () => void;
}) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={onClose} aria-hidden />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[17rem] flex-col border-r border-line bg-surface transition-transform duration-200 md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-sm font-bold text-onaccent">
              김
            </span>
            <div className="leading-tight">
              <div className="text-sm font-bold text-ink">선배교사 김선생</div>
              <div className="text-[11px] text-muted">교사 업무 AI 파트너</div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="사이드바 닫기"
            className="rounded-lg p-1.5 text-muted hover:bg-surface2 md:hidden"
          >
            <IconClose />
          </button>
        </div>

        <div className="px-3 pb-3">
          <button
            onClick={onNew}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-onaccent transition-colors hover:bg-accenthover"
          >
            <IconPlus className="h-4 w-4" />새 대화
          </button>
        </div>

        <div className="scroll-thin flex-1 overflow-y-auto px-2 pb-2">
          {conversations.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs leading-relaxed text-muted">
              아직 대화가 없습니다.
              <br />
              무엇이든 물어보세요.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {conversations.map((c) => {
                const active = c.id === activeId;
                return (
                  <li key={c.id} className="group relative">
                    <button
                      onClick={() => onSelect(c.id)}
                      className={`w-full rounded-lg px-3 py-2.5 pr-9 text-left transition-colors ${
                        active ? "bg-accentsoft" : "hover:bg-surface2"
                      }`}
                    >
                      <div
                        className={`truncate text-[0.8125rem] font-medium ${
                          active ? "text-accentink" : "text-ink"
                        }`}
                      >
                        {c.title}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-muted">
                        {getMode(c.mode).label} · {formatDay(c.updatedAt)}
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(c.id);
                      }}
                      aria-label="대화 삭제"
                      className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md p-1.5 text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus:opacity-100"
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-line p-3">
          <button
            onClick={onOpenSettings}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-ink transition-colors hover:bg-surface2"
          >
            <IconSettings className="text-muted" />
            <span className="flex-1 text-left">설정</span>
            {!hasKey && (
              <span className="rounded-full bg-warn/15 px-2 py-0.5 text-[10px] font-semibold text-warn">
                키 필요
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
