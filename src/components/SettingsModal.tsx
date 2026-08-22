"use client";

import { useEffect, useState } from "react";
import { PROVIDERS, getProvider, type ProviderId } from "@/lib/providers";
import type { Settings } from "@/lib/types";
import { IconClose, IconKey } from "./Icons";

const LEVELS = ["초등학교", "중학교", "고등학교", "특수학교", "기타"];

const FIELD =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-accent";

export default function SettingsModal({
  settings,
  onClose,
  onSave,
}: {
  settings: Settings;
  onClose: () => void;
  onSave: (s: Settings) => void;
}) {
  const [draft, setDraft] = useState<Settings>(settings);
  const [tab, setTab] = useState<ProviderId>(settings.provider);
  const [showKey, setShowKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(Boolean(settings.mcpUrl));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const provider = getProvider(tab);
  const key = draft.keys[tab] ?? "";
  const model = draft.models[tab] ?? provider.defaultModel;
  const keyLooksValid =
    !key || tab !== "anthropic" ? true : key.trim().startsWith("sk-ant-");

  const setKey = (v: string) => setDraft({ ...draft, keys: { ...draft.keys, [tab]: v } });
  const setModel = (v: string) => setDraft({ ...draft, models: { ...draft.models, [tab]: v } });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="scroll-thin max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-line bg-surface shadow-2xl sm:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-5 py-4">
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
          {/* ---- 사업자 탭 ---- */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <IconKey className="text-accent" />
              <h3 className="text-sm font-semibold text-ink">AI 모델과 API 키</h3>
            </div>

            <div className="flex gap-1.5 rounded-lg bg-surface2 p-1">
              {PROVIDERS.map((p) => {
                const filled = Boolean(draft.keys[p.id]);
                const active = p.id === tab;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setTab(p.id);
                      setShowKey(false);
                    }}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
                      active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink2"
                    }`}
                  >
                    {p.label}
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${filled ? "bg-accent" : "bg-line"}`}
                      aria-hidden
                    />
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <input
                type={showKey ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={provider.keyPlaceholder}
                autoComplete="off"
                spellCheck={false}
                className={`${FIELD} font-mono ${keyLooksValid ? "" : "border-danger"}`}
              />
              <button
                onClick={() => setShowKey((v) => !v)}
                className="shrink-0 rounded-lg border border-line px-3 text-xs font-medium text-ink2 hover:bg-surface2"
              >
                {showKey ? "숨기기" : "보기"}
              </button>
            </div>
            {!keyLooksValid && (
              <p className="text-xs text-danger">{provider.keyHint}. 다시 확인해 주세요.</p>
            )}

            <div className="space-y-2">
              {provider.models.map((m) => (
                <label
                  key={m.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-2.5 transition-colors ${
                    model === m.id ? "border-accent bg-accentsoft" : "border-line hover:bg-surface2"
                  }`}
                >
                  <input
                    type="radio"
                    name={`model-${tab}`}
                    checked={model === m.id}
                    onChange={() => setModel(m.id)}
                    className="mt-1 accent-[var(--accent)]"
                  />
                  <span>
                    <span className="block text-sm font-medium text-ink">{m.label}</span>
                    <span className="block text-xs text-muted">{m.note}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="rounded-lg bg-surface2 px-3.5 py-3 text-xs leading-relaxed text-ink2">
              키는 <b>이 브라우저에만</b> 저장되고 서버에 기록되지 않습니다. 요청을 보낼 때만 전달됩니다.
              <br />
              키가 없다면{" "}
              <a
                href={provider.consoleUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-accent underline underline-offset-2"
              >
                {provider.consoleLabel}
              </a>
              에서 발급받을 수 있습니다. 사용한 만큼 과금됩니다.
            </div>

            <button
              onClick={() => setDraft({ ...draft, provider: tab })}
              disabled={draft.provider === tab}
              className={`w-full rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                draft.provider === tab
                  ? "border-accent bg-accentsoft text-accentink"
                  : "border-line text-ink2 hover:bg-surface2"
              }`}
            >
              {draft.provider === tab
                ? `${provider.label}를 사용 중입니다`
                : `${provider.label}로 전환하기`}
            </button>
          </section>

          {/* ---- 내 정보 ---- */}
          <section className="space-y-2.5 border-t border-linesoft pt-5">
            <h3 className="text-sm font-semibold text-ink">내 정보 (선택)</h3>
            <p className="text-xs text-muted">
              한 번 적어두면 매번 설명하지 않아도 학교급과 학년에 맞춰 답합니다.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={draft.schoolLevel}
                onChange={(e) => setDraft({ ...draft, schoolLevel: e.target.value })}
                className={FIELD}
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
                className={FIELD}
              />
            </div>
            <input
              value={draft.subject}
              onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
              placeholder="담당 과목·업무 (예: 과학, 방과후 담당)"
              className={FIELD}
            />
            <textarea
              value={draft.extraContext}
              onChange={(e) => setDraft({ ...draft, extraContext: e.target.value })}
              placeholder="그 밖에 알아두면 좋을 점 (예: 학급 24명, 혁신학교, 학교 문서는 개조식 선호)"
              rows={3}
              className={`${FIELD} resize-none`}
            />
          </section>

          {/* ---- 고급: MCP ---- */}
          <section className="border-t border-linesoft pt-5">
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="text-xs font-semibold text-ink2 underline underline-offset-2 hover:text-ink"
            >
              고급: 원격 MCP 서버 연결 {showAdvanced ? "닫기" : "열기"}
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-2.5">
                <p className="text-xs leading-relaxed text-muted">
                  MCP 서버를 연결하면 김선생이 구글 캘린더 같은 외부 도구를 직접 쓸 수 있습니다.
                  <b className="text-ink2"> Claude를 사용할 때만 동작합니다.</b> 액세스 토큰은 직접
                  발급해서 넣어야 합니다. 비워두면 일정은 .ics 파일 내보내기로만 처리됩니다.
                </p>
                <input
                  value={draft.mcpUrl}
                  onChange={(e) => setDraft({ ...draft, mcpUrl: e.target.value })}
                  placeholder="https://calendarmcp.googleapis.com/mcp/v1"
                  autoComplete="off"
                  spellCheck={false}
                  className={`${FIELD} font-mono text-xs`}
                />
                <input
                  type="password"
                  value={draft.mcpToken}
                  onChange={(e) => setDraft({ ...draft, mcpToken: e.target.value })}
                  placeholder="액세스 토큰 (선택)"
                  autoComplete="off"
                  spellCheck={false}
                  className={`${FIELD} font-mono text-xs`}
                />
              </div>
            )}
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
            onClick={() => {
              const keys = { ...draft.keys };
              (Object.keys(keys) as ProviderId[]).forEach((k) => {
                keys[k] = (keys[k] ?? "").trim();
              });
              onSave({ ...draft, keys, mcpUrl: draft.mcpUrl.trim(), mcpToken: draft.mcpToken.trim() });
            }}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-onaccent hover:bg-accenthover"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
