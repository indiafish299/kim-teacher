"use client";

import { useMemo, useState } from "react";
import { parseTasks, type ParsedTask } from "@/lib/blocks";
import { ddayLabel, formatDate } from "@/lib/storage";
import { IconCalendar, IconCheck, IconInbox, IconList } from "./Icons";

export default function TaskWidget({
  raw,
  streaming,
  onAdd,
  onExport,
}: {
  raw: string;
  streaming?: boolean;
  onAdd: (group: string, items: ParsedTask[]) => void;
  onExport: (group: string, items: ParsedTask[]) => void;
}) {
  const parsed = useMemo(() => parseTasks(raw), [raw]);
  const [added, setAdded] = useState(false);

  const withDates = parsed.items.filter((i) => i.due);

  const btn =
    "inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink2 transition-colors hover:bg-surface2 disabled:opacity-50";

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface2 px-3.5 py-2.5">
        <IconList className="shrink-0 text-accent" />
        <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold text-ink">
          {parsed.group}
          <span className="ml-1.5 font-normal text-muted">준비 일정 {parsed.items.length}건</span>
        </span>
        <div className="flex items-center gap-1.5">
          <button
            className={btn}
            disabled={streaming || parsed.items.length === 0}
            onClick={() => {
              onAdd(parsed.group, parsed.items);
              setAdded(true);
              setTimeout(() => setAdded(false), 1800);
            }}
          >
            {added ? <IconCheck className="h-3.5 w-3.5 text-accent" /> : <IconInbox className="h-3.5 w-3.5" />}
            {added ? "담았습니다" : "내 업무로 담기"}
          </button>
          <button
            className={btn}
            disabled={streaming || withDates.length === 0}
            title={withDates.length === 0 ? "날짜가 정해진 항목이 없습니다" : "캘린더 파일로 내려받기"}
            onClick={() => onExport(parsed.group, parsed.items)}
          >
            <IconCalendar className="h-3.5 w-3.5" />
            일정 받기
          </button>
        </div>
      </div>

      <ul className="divide-y divide-linesoft">
        {parsed.items.map((item, i) => {
          const dday = item.due ? ddayLabel(item.due) : "";
          const soon = item.due ? (dday === "D-day" || /^D-([0-7])$/.test(dday)) : false;
          return (
            <li key={i} className="flex items-start gap-3 px-4 py-2.5">
              <span
                className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                  !item.due
                    ? "bg-surface2 text-muted"
                    : soon
                      ? "bg-warn/15 text-warn"
                      : "bg-accentsoft text-accentink"
                }`}
              >
                {dday || "날짜 미정"}
              </span>
              <span className="min-w-0 flex-1 text-[0.875rem] leading-relaxed text-ink">{item.title}</span>
              {item.due && (
                <span className="mt-0.5 shrink-0 text-[11px] text-muted">{formatDate(item.due)}</span>
              )}
            </li>
          );
        })}
        {parsed.items.length === 0 && (
          <li className="px-4 py-3 text-xs text-muted">항목을 읽지 못했습니다.</li>
        )}
      </ul>
    </div>
  );
}
