"use client";

import { useMemo, useState } from "react";
import type { Conversation, TaskItem } from "@/lib/types";
import { ddayLabel, daysUntil, formatDay } from "@/lib/storage";
import { FORM_PRESETS, type FormPreset } from "@/lib/forms";
import {
  IconBookmark,
  IconChat,
  IconChevron,
  IconClose,
  IconList,
  IconPlus,
  IconTrash,
} from "./Icons";

function Section({
  title,
  icon,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count?: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-linesoft">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-surface2"
      >
        <span className="text-muted">{icon}</span>
        <span className="flex-1 text-[0.8125rem] font-semibold text-ink">{title}</span>
        {typeof count === "number" && count > 0 && (
          <span className="rounded-full bg-surface2 px-1.5 text-[10px] font-semibold text-ink2">{count}</span>
        )}
        <IconChevron className={`text-muted transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && <div className="pb-3">{children}</div>}
    </section>
  );
}

export default function Sidebar({
  open,
  tasks,
  conversations,
  activeId,
  onNew,
  onSelect,
  onDelete,
  onToggleTask,
  onDeleteTask,
  onAddTask,
  onClearDone,
  onPickForm,
  onClose,
  footer,
}: {
  open: boolean;
  tasks: TaskItem[];
  conversations: Conversation[];
  activeId: string | null;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: (title: string, due: string) => void;
  onClearDone: () => void;
  onPickForm: (preset: FormPreset) => void;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  const [openTasks, setOpenTasks] = useState(true);
  const [openForms, setOpenForms] = useState(true);
  const [openChats, setOpenChats] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDue, setDraftDue] = useState("");

  const sorted = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (!a.due && !b.due) return b.createdAt - a.createdAt;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due.localeCompare(b.due);
    });
  }, [tasks]);

  const pending = sorted.filter((t) => !t.done).length;
  const doneCount = tasks.length - pending;
  const forms = showAll ? FORM_PRESETS : FORM_PRESETS.slice(0, 6);

  const submitTask = () => {
    const t = draftTitle.trim();
    if (!t) return;
    onAddTask(t, draftDue);
    setDraftTitle("");
    setDraftDue("");
  };

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={onClose} aria-hidden />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[18rem] flex-col border-r border-line bg-surface transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 border-b border-line p-3">
          <button
            onClick={onNew}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-onaccent transition-colors hover:bg-accenthover"
          >
            <IconPlus className="h-4 w-4" />새 대화
          </button>
          <button
            onClick={onClose}
            aria-label="사이드바 닫기"
            className="rounded-lg p-2 text-muted hover:bg-surface2 lg:hidden"
          >
            <IconClose />
          </button>
        </div>

        <div className="scroll-thin flex-1 overflow-y-auto">
          {/* ---- 진행 중인 업무 ---- */}
          <Section
            title="진행 중인 업무"
            icon={<IconList />}
            count={pending}
            open={openTasks}
            onToggle={() => setOpenTasks((v) => !v)}
          >
            {sorted.length === 0 ? (
              <p className="px-3.5 pb-1 text-[11px] leading-relaxed text-muted">
                김선생이 만든 준비 일정을 &lsquo;내 업무로 담기&rsquo;로 옮기거나, 아래에서 직접 추가하세요.
              </p>
            ) : (
              <ul className="mb-2 space-y-0.5 px-2">
                {sorted.map((t) => {
                  const d = t.due ? daysUntil(t.due) : null;
                  const urgent = !t.done && d !== null && d <= 7;
                  const overdue = !t.done && d !== null && d < 0;
                  return (
                    <li key={t.id} className="group/task flex items-start gap-2 rounded-lg px-1.5 py-1.5 hover:bg-surface2">
                      <button
                        onClick={() => onToggleTask(t.id)}
                        aria-label={t.done ? "완료 취소" : "완료 표시"}
                        className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors ${
                          t.done ? "border-accent bg-accent text-onaccent" : "border-line hover:border-accent"
                        }`}
                      >
                        {t.done && (
                          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="m2.5 6.2 2.3 2.3L9.5 3.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className={`text-[0.8125rem] leading-snug ${t.done ? "text-muted line-through" : "text-ink"}`}>
                          {t.title}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px]">
                          {t.due && (
                            <span
                              className={`font-semibold tabular-nums ${
                                t.done ? "text-muted" : overdue ? "text-danger" : urgent ? "text-warn" : "text-accent"
                              }`}
                            >
                              {ddayLabel(t.due)}
                            </span>
                          )}
                          <span className="truncate text-muted">{t.group}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => onDeleteTask(t.id)}
                        aria-label="업무 삭제"
                        className="mt-0.5 rounded p-1 text-muted opacity-0 transition-opacity group-hover/task:opacity-100 hover:text-danger focus:opacity-100"
                      >
                        <IconTrash className="h-3 w-3" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="space-y-1.5 px-3.5">
              <input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) submitTask();
                }}
                placeholder="업무 직접 추가"
                className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[0.8125rem] text-ink outline-none placeholder:text-muted focus:border-accent"
              />
              <div className="flex gap-1.5">
                <input
                  type="date"
                  value={draftDue}
                  onChange={(e) => setDraftDue(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[0.75rem] text-ink2 outline-none focus:border-accent"
                />
                <button
                  onClick={submitTask}
                  disabled={!draftTitle.trim()}
                  className="shrink-0 rounded-lg border border-line px-2.5 text-xs font-medium text-ink2 hover:bg-surface2 disabled:opacity-45"
                >
                  추가
                </button>
              </div>
              {doneCount > 0 && (
                <button onClick={onClearDone} className="text-[11px] text-muted underline underline-offset-2 hover:text-ink2">
                  완료된 {doneCount}건 지우기
                </button>
              )}
            </div>
          </Section>

          {/* ---- 즐겨찾는 양식 ---- */}
          <Section
            title="즐겨찾는 양식"
            icon={<IconBookmark />}
            open={openForms}
            onToggle={() => setOpenForms((v) => !v)}
          >
            <div className="flex flex-wrap gap-1.5 px-3.5">
              {forms.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onPickForm(f)}
                  className="rounded-full border border-line px-2.5 py-1 text-[11.5px] font-medium text-ink2 transition-colors hover:border-accent/60 hover:bg-accentsoft hover:text-accentink"
                >
                  {f.label}
                </button>
              ))}
              <button
                onClick={() => setShowAll((v) => !v)}
                className="rounded-full px-2 py-1 text-[11.5px] text-muted underline underline-offset-2 hover:text-ink2"
              >
                {showAll ? "접기" : `더보기 +${FORM_PRESETS.length - 6}`}
              </button>
            </div>
          </Section>

          {/* ---- 대화 ---- */}
          <Section
            title="대화"
            icon={<IconChat />}
            count={conversations.length}
            open={openChats}
            onToggle={() => setOpenChats((v) => !v)}
          >
            {conversations.length === 0 ? (
              <p className="px-3.5 text-[11px] text-muted">아직 대화가 없습니다.</p>
            ) : (
              <ul className="space-y-0.5 px-2">
                {conversations.map((c) => {
                  const isActive = c.id === activeId;
                  return (
                    <li key={c.id} className="group/chat relative">
                      <button
                        onClick={() => onSelect(c.id)}
                        className={`w-full rounded-lg px-2.5 py-2 pr-8 text-left transition-colors ${
                          isActive ? "bg-accentsoft" : "hover:bg-surface2"
                        }`}
                      >
                        <div className={`truncate text-[0.8125rem] font-medium ${isActive ? "text-accentink" : "text-ink"}`}>
                          {c.title}
                        </div>
                        <div className="mt-0.5 truncate text-[10.5px] text-muted">
                          {c.messages.length}개 메시지 · {formatDay(c.updatedAt)}
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(c.id);
                        }}
                        aria-label="대화 삭제"
                        className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md p-1.5 text-muted opacity-0 transition-opacity group-hover/chat:opacity-100 hover:text-danger focus:opacity-100"
                      >
                        <IconTrash className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>

        {footer}
      </aside>
    </>
  );
}
