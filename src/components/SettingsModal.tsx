"use client";

import { useEffect, useState } from "react";
import { MODELS } from "@/lib/agent";
import type { Settings } from "@/lib/types";
import { IconClose, IconKey } from "./Icons";

const LEVELS = ["초등학교", "중학교", "고등학교", "특수학교", "기타"];

export default function SettingsModal({
  open,
  settings,
  onClose,
  onSave,
}: {
  open: boolean;
  settings: Settings;
  onClose: () => void;
  onSave: (s: Settings) => void;
}) {
  const [draft, setDraft] = useState<Settings>(settings);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(settings);
      setShowKey(false);
    }
  }, [open, settings]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const keyLooksValid = !draft.apiKey || draft.apiKey.trim().startsWith("sk-ant-");

  const field =
    "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-accent";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4">
      <div className="scroll-thin max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-line bg-surface shadow-2xl sm:rounded-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-line bg-surface px-5 py-4">
          <h2 className="text-base font-semibold text-ink">설정</h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="rounded-lg p-1.5 text-muted hover:bg-surface2 hover:text-ink"
          >
            <IconClose />
          </button>
        </div>

        <div className="space-y-6 px-5 py-5">
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <IconKey className="text-accent" />
              <h3 className="text-sm font-semibold text-ink">Anthropic API 키</h3>
            </div>
            <div className="flex gap-2">
              <input
                type={showKey ? "text" : "password"}
                value={draft.apiKey}
                onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
                placeholder="sk-ant-api03-..."
                autoComplete="off"
                spellCheck={false}
                className={`${field} font-mono ${keyLooksValid ? "" : "border-danger"}`}
              />
              <button
                onClick={() => setShowKey((v) => !v)}
                className="shrink-0 rounded-lg border border-line px-3 text-xs font-medium text-ink2 hover:bg-surface2"
              >
                {showKey ? "숨기기" : "보기"}
              </button>
            </div>
            {!keyLooksValid && (
              <p className="text-xs text-danger">키는 보통 sk-ant- 으로 시작합니다. 다시 확인해 주세요.</p>
            )}
            <div className="rounded-lg bg-surface2 px-3.5 py-3 text-xs leading-relaxed text-ink2">
              키는 <b>이 브라우저에만</b> 저장되고 서버에 기록되지 않습니다. 요청을 보낼 때만 전달됩니다.
              <br />
              키가 없다면{" "}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-accent underline underline-offset-2"
              >
                Anthropic 콘솔
              </a>
              에서 발급받을 수 있습니다. 사용한 만큼 과금되며, 문서 한 건은 보통 몇 원 수준입니다.
            </div>
          </section>

          <section className="space-y-2.5">
            <h3 className="text-sm font-semibold text-ink">모델</h3>
            <div className="space-y-2">
              {MODELS.map((m) => (
                <label
                  key={m.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-3 transition-colors ${
                    draft.model === m.id ? "border-accent bg-accentsoft" : "border-line hover:bg-surface2"
                  }`}
                >
                  <input
                    type="radio"
                    name="model"
                    checked={draft.model === m.id}
                    onChange={() => setDraft({ ...draft, model: m.id })}
                    className="mt-1 accent-[var(--accent)]"
                  />
                  <span>
                    <span className="block text-sm font-medium text-ink">{m.label}</span>
                    <span className="block text-xs text-muted">{m.note}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-2.5">
            <h3 className="text-sm font-semibold text-ink">내 정보 (선택)</h3>
            <p className="text-xs text-muted">
              한 번 적어두면 매번 설명하지 않아도 학교급과 학년에 맞춰 답합니다.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={draft.schoolLevel}
                onChange={(e) => setDraft({ ...draft, schoolLevel: e.target.value })}
                className={field}
              >
                <option value="">학교급 선택</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <input
                value={draft.grade}
                onChange={(e) => setDraft({ ...draft, grade: e.target.value })}
                placeholder="담당 학년 (예: 4학년)"
                className={field}
              />
            </div>
            <input
              value={draft.subject}
              onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
              placeholder="담당 과목·업무 (예: 과학, 방과후 담당)"
              className={field}
            />
            <textarea
              value={draft.extraContext}
              onChange={(e) => setDraft({ ...draft, extraContext: e.target.value })}
              placeholder="그 밖에 알아두면 좋을 점 (예: 학급 24명, 혁신학교, 학교 문서는 개조식 선호)"
              rows={3}
              className={`${field} resize-none`}
            />
          </section>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-line bg-surface px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink2 hover:bg-surface2"
          >
            취소
          </button>
          <button
            onClick={() => onSave({ ...draft, apiKey: draft.apiKey.trim() })}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-onaccent hover:bg-accenthover"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
