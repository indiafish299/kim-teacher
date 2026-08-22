"use client";

import { useEffect, useState } from "react";
import { PROVIDERS, getProvider, type ProviderId } from "@/lib/providers";
import { INTIMACY_OPTIONS } from "@/lib/agent";
import { MCP_PRESETS, TOOL_INFO, type McpServer } from "@/lib/tools";
import { uid } from "@/lib/storage";
import type { Settings } from "@/lib/types";
import { IconClose, IconKey, IconPlug, IconPlus, IconTrash } from "./Icons";

const LEVELS = ["초등학교", "중학교", "고등학교", "특수학교", "기타"];

function IconCheckMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-2.5 w-2.5 text-onaccent">
      <path d="m5 12.5 4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
  const [showAdvanced, setShowAdvanced] = useState(settings.mcpServers.length > 0);

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

  const patchServer = (id: string, patch: Partial<McpServer>) =>
    setDraft((d) => ({
      ...d,
      mcpServers: d.mcpServers.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));

  const addServer = (name: string, url: string) =>
    setDraft((d) =>
      d.mcpServers.some((s) => s.url === url && url)
        ? d
        : { ...d, mcpServers: [...d.mcpServers, { id: uid(), name, url, token: "", enabled: true }] },
    );

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

          {/* ---- 호칭과 말투 ---- */}
          <section className="space-y-3 border-t border-linesoft pt-5">
            <h3 className="text-sm font-semibold text-ink">호칭과 말투</h3>
            <input
              value={draft.userName}
              onChange={(e) => setDraft({ ...draft, userName: e.target.value })}
              placeholder="이름 (예: 종석) — 비워두면 '선생님'으로 부릅니다"
              maxLength={20}
              className={FIELD}
            />

            <div className="space-y-2">
              {INTIMACY_OPTIONS.map((o) => {
                const selected = draft.intimacy === o.level;
                const name = draft.userName.trim();
                const address = o.level === 1 ? `${name ? name + " " : ""}선생님` : name ? `${name}샘` : "선생님";
                const sample = `${address}, ${o.sample.replace(/^선생님, /, "")}`;
                return (
                  <button
                    key={o.level}
                    onClick={() => setDraft({ ...draft, intimacy: o.level })}
                    className={`w-full rounded-lg border px-3.5 py-3 text-left transition-colors ${
                      selected ? "border-accent bg-accentsoft" : "border-line hover:bg-surface2"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                          selected ? "border-accent bg-accent" : "border-line"
                        }`}
                      >
                        {selected && <span className="h-1.5 w-1.5 rounded-full bg-onaccent" />}
                      </span>
                      <span className="text-sm font-medium text-ink">
                        레벨 {o.level} · {o.label}
                      </span>
                      <span className="text-xs text-muted">{o.blurb}</span>
                    </div>
                    <p className="mt-1.5 pl-6 text-xs leading-relaxed text-ink2">&ldquo;{sample}&rdquo;</p>
                  </button>
                );
              })}
            </div>
            <p className="text-xs leading-relaxed text-muted">
              말투만 달라집니다. 공문·품의·계획서의 서식과 완성도는 세 레벨 모두 동일합니다.
            </p>
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

          {/* ---- 김선생이 할 수 있는 일 ---- */}
          <section className="space-y-3 border-t border-linesoft pt-5">
            <h3 className="text-sm font-semibold text-ink">김선생이 할 수 있는 일</h3>
            <p className="text-xs leading-relaxed text-muted">
              Claude를 쓸 때만 동작합니다. 켜 두면 김선생이 필요할 때 알아서 씁니다.
            </p>
            {TOOL_INFO.map((t) => {
              const on = draft.tools[t.key];
              return (
                <button
                  key={t.key}
                  onClick={() => setDraft({ ...draft, tools: { ...draft.tools, [t.key]: !on } })}
                  className={`flex w-full items-start gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors ${
                    on ? "border-accent bg-accentsoft" : "border-line hover:bg-surface2"
                  }`}
                >
                  <span
                    className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${
                      on ? "border-accent bg-accent" : "border-line"
                    }`}
                  >
                    {on && <IconCheckMark />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">{t.label}</span>
                    <span className="block text-xs leading-relaxed text-muted">{t.blurb}</span>
                  </span>
                </button>
              );
            })}
            <p className="text-[11px] leading-relaxed text-muted">
              파일을 만들거나 페이지를 읽는 작업은 Claude 서버에서 처리되고, 쓴 만큼 선생님 키에 요금이
              붙습니다. 웹 &lsquo;검색&rsquo;은 요금이 따로 붙어 넣지 않았습니다.
            </p>
          </section>

          {/* ---- 고급: MCP ---- */}
          <section className="border-t border-linesoft pt-5">
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-ink2 underline underline-offset-2 hover:text-ink"
            >
              <IconPlug className="h-3.5 w-3.5" />
              고급: 외부 도구(MCP) 연결 {showAdvanced ? "닫기" : "열기"}
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3">
                <p className="text-xs leading-relaxed text-muted">
                  구글 캘린더나 드라이브 같은 외부 도구를 연결하면 김선생이 직접 일정과 파일을 다룹니다.
                  <b className="text-ink2"> Claude를 쓸 때만 동작하고</b>, 액세스 토큰은 선생님이 직접 발급해
                  넣어야 합니다. 토큰은 이 브라우저에만 저장되고 동기화되지 않습니다.
                </p>

                {draft.mcpServers.map((srv) => (
                  <div key={srv.id} className="space-y-2 rounded-lg border border-line p-3">
                    <div className="flex items-center gap-2">
                      <input
                        value={srv.name}
                        onChange={(e) => patchServer(srv.id, { name: e.target.value })}
                        placeholder="이름 (예: 구글 캘린더)"
                        className={`${FIELD} flex-1 py-1.5 text-xs`}
                      />
                      <label className="flex shrink-0 items-center gap-1.5 text-[11px] text-ink2">
                        <input
                          type="checkbox"
                          checked={srv.enabled}
                          onChange={(e) => patchServer(srv.id, { enabled: e.target.checked })}
                          className="accent-[var(--accent)]"
                        />
                        사용
                      </label>
                      <button
                        onClick={() =>
                          setDraft({
                            ...draft,
                            mcpServers: draft.mcpServers.filter((x) => x.id !== srv.id),
                          })
                        }
                        aria-label="삭제"
                        className="shrink-0 rounded p-1 text-muted hover:bg-surface2 hover:text-danger"
                      >
                        <IconTrash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <input
                      value={srv.url}
                      onChange={(e) => patchServer(srv.id, { url: e.target.value })}
                      placeholder="https://..."
                      autoComplete="off"
                      spellCheck={false}
                      className={`${FIELD} py-1.5 font-mono text-xs`}
                    />
                    <input
                      type="password"
                      value={srv.token}
                      onChange={(e) => patchServer(srv.id, { token: e.target.value })}
                      placeholder="액세스 토큰 (선택)"
                      autoComplete="off"
                      spellCheck={false}
                      className={`${FIELD} py-1.5 font-mono text-xs`}
                    />
                  </div>
                ))}

                <div className="flex flex-wrap gap-1.5">
                  {MCP_PRESETS.map((p) => (
                    <button
                      key={p.url}
                      onClick={() => addServer(p.name, p.url)}
                      title={p.hint}
                      className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink2 hover:bg-surface2"
                    >
                      <IconPlus className="h-3 w-3" />
                      {p.name}
                    </button>
                  ))}
                  <button
                    onClick={() => addServer("", "")}
                    className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink2 hover:bg-surface2"
                  >
                    <IconPlus className="h-3 w-3" />
                    직접 입력
                  </button>
                </div>
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
              const mcpServers = draft.mcpServers
                .map((srv) => ({
                  ...srv,
                  name: srv.name.trim() || "MCP 서버",
                  url: srv.url.trim(),
                  token: srv.token.trim(),
                }))
                .filter((srv) => srv.url);
              onSave({ ...draft, keys, mcpServers });
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
