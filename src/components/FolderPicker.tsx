"use client";

import { useEffect, useMemo, useState } from "react";
import type { FolderEntry } from "@/lib/folder";
import { fileTag, formatBytes } from "@/lib/files";
import { IconClose, IconSpinner } from "./Icons";

export default function FolderPicker({
  folderName,
  entries,
  loading,
  onPick,
  onClose,
}: {
  folderName: string;
  entries: FolderEntry[];
  loading: boolean;
  onPick: (names: string[]) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? entries.filter((e) => e.name.toLowerCase().includes(needle)) : entries;
  }, [entries, q]);

  const toggle = (name: string) =>
    setChosen((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl border border-line bg-surface shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink">폴더에서 파일 고르기</h2>
            <p className="truncate text-[11px] text-muted">{folderName}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="rounded-lg p-1.5 text-muted hover:bg-surface2 hover:text-ink"
          >
            <IconClose />
          </button>
        </div>

        <div className="px-5 pt-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="파일 이름으로 찾기"
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-accent"
          />
        </div>

        <div className="scroll-thin min-h-[120px] flex-1 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
              <IconSpinner className="h-4 w-4" />
              폴더를 읽는 중…
            </div>
          ) : shown.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">
              {entries.length === 0 ? "폴더에 파일이 없습니다." : "찾는 파일이 없습니다."}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {shown.map((e) => {
                const on = chosen.includes(e.name);
                return (
                  <li key={e.name}>
                    <button
                      onClick={() => toggle(e.name)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                        on ? "bg-accentsoft" : "hover:bg-surface2"
                      }`}
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded bg-surface2 text-[8.5px] font-bold text-ink2">
                        {fileTag(e.name)}
                      </span>
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block truncate text-[0.8125rem] text-ink">{e.name}</span>
                        <span className="block text-[10.5px] text-muted">
                          {formatBytes(e.size)} · {new Date(e.modified).toLocaleDateString("ko-KR")}
                        </span>
                      </span>
                      <span
                        className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${
                          on ? "border-accent bg-accent" : "border-line"
                        }`}
                      >
                        {on && <span className="h-1.5 w-1.5 rounded-full bg-onaccent" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-4">
          <span className="text-xs text-muted">{chosen.length ? `${chosen.length}개 선택` : ""}</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink2 hover:bg-surface2"
            >
              취소
            </button>
            <button
              onClick={() => onPick(chosen)}
              disabled={chosen.length === 0}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-onaccent hover:bg-accenthover disabled:cursor-not-allowed disabled:bg-surface2 disabled:text-muted"
            >
              첨부하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
