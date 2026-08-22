"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Composer from "@/components/Composer";
import Welcome from "@/components/Welcome";
import SettingsModal from "@/components/SettingsModal";
import { AssistantBubble, UserBubble } from "@/components/MessageBubble";
import { IconMenu, IconSettings } from "@/components/Icons";
import { DEFAULT_MODE, getMode, type ModeId } from "@/lib/agent";
import { streamChat } from "@/lib/stream";
import {
  DEFAULT_SETTINGS,
  loadConversations,
  loadSettings,
  makeTitle,
  saveConversations,
  saveSettings,
  uid,
} from "@/lib/storage";
import type { ChatMessage, Conversation, Settings } from "@/lib/types";

export default function Page() {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<ModeId>(DEFAULT_MODE);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSettings(loadSettings());
    setConversations(loadConversations());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveConversations(conversations);
  }, [conversations, ready]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const messages = active?.messages ?? [];
  const hasKey = Boolean(settings.apiKey);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
  }, []);

  useEffect(() => {
    if (messages.length) scrollToBottom(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const profile = useMemo(() => {
    const parts: string[] = [];
    if (settings.schoolLevel) parts.push(`- 학교급: ${settings.schoolLevel}`);
    if (settings.grade) parts.push(`- 담당 학년: ${settings.grade}`);
    if (settings.subject) parts.push(`- 담당 과목·업무: ${settings.subject}`);
    if (settings.extraContext) parts.push(`- 참고 사항: ${settings.extraContext}`);
    return parts.join("\n");
  }, [settings]);

  const patchConversation = useCallback((id: string, fn: (c: Conversation) => Conversation) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? fn(c) : c)));
  }, []);

  const newConversation = useCallback(() => {
    abortRef.current?.abort();
    setBusy(false);
    setActiveId(null);
    setInput("");
    setSidebarOpen(false);
  }, []);

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      setActiveId((cur) => (cur === id ? null : cur));
    },
    [],
  );

  const run = useCallback(
    async (convId: string, history: ChatMessage[], targetMode: ModeId) => {
      const assistantId = uid();
      patchConversation(convId, (c) => ({
        ...c,
        messages: [
          ...c.messages,
          { id: assistantId, role: "assistant", content: "", createdAt: Date.now() },
        ],
        updatedAt: Date.now(),
      }));

      const controller = new AbortController();
      abortRef.current = controller;
      setBusy(true);

      let buffer = "";
      let frame = 0;
      const flush = () => {
        frame = 0;
        patchConversation(convId, (c) => ({
          ...c,
          messages: c.messages.map((m) => (m.id === assistantId ? { ...m, content: buffer } : m)),
        }));
      };

      try {
        await streamChat({
          apiKey: settings.apiKey,
          model: settings.model,
          mode: targetMode,
          profile,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          signal: controller.signal,
          onDelta: (t) => {
            buffer += t;
            if (!frame) frame = requestAnimationFrame(flush);
          },
        });
        if (frame) cancelAnimationFrame(frame);
        flush();
      } catch (err) {
        if (frame) cancelAnimationFrame(frame);
        const aborted = err instanceof DOMException && err.name === "AbortError";
        const message = aborted
          ? buffer
          : err instanceof Error
            ? err.message
            : "알 수 없는 오류가 발생했습니다.";
        patchConversation(convId, (c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.id === assistantId
              ? aborted
                ? { ...m, content: buffer || "(중지됨)" }
                : { ...m, content: message, error: true }
              : m,
          ),
        }));
      } finally {
        abortRef.current = null;
        setBusy(false);
        setTimeout(() => scrollToBottom(), 60);
      }
    },
    [patchConversation, profile, scrollToBottom, settings.apiKey, settings.model],
  );

  const send = useCallback(
    (raw?: string) => {
      const text = (raw ?? input).trim();
      if (!text || busy) return;
      if (!settings.apiKey) {
        setSettingsOpen(true);
        return;
      }

      const userMsg: ChatMessage = {
        id: uid(),
        role: "user",
        content: text,
        createdAt: Date.now(),
      };

      let convId = activeId;
      let history: ChatMessage[];

      if (!convId || !conversations.some((c) => c.id === convId)) {
        convId = uid();
        const conv: Conversation = {
          id: convId,
          title: makeTitle(text),
          mode,
          messages: [userMsg],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        history = [userMsg];
        setConversations((prev) => [conv, ...prev]);
        setActiveId(convId);
      } else {
        const existing = conversations.find((c) => c.id === convId)!;
        history = [...existing.messages.filter((m) => !m.error), userMsg];
        patchConversation(convId, (c) => ({
          ...c,
          mode,
          messages: [...c.messages, userMsg],
          updatedAt: Date.now(),
        }));
      }

      setInput("");
      setTimeout(() => scrollToBottom(), 40);
      void run(convId, history, mode);
    },
    [activeId, busy, conversations, input, mode, patchConversation, run, scrollToBottom, settings.apiKey],
  );

  const retry = useCallback(() => {
    if (!active) return;
    const kept = active.messages.filter((m) => !m.error);
    const lastUser = [...kept].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    patchConversation(active.id, (c) => ({ ...c, messages: kept }));
    void run(active.id, kept, active.mode);
  }, [active, patchConversation, run]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const handleSaveSettings = useCallback((s: Settings) => {
    setSettings(s);
    saveSettings(s);
    setSettingsOpen(false);
  }, []);

  const currentMode = getMode(active?.mode ?? mode);

  return (
    <div className="flex h-dvh overflow-hidden bg-paper">
      <Sidebar
        open={sidebarOpen}
        conversations={conversations}
        activeId={activeId}
        hasKey={hasKey}
        onNew={newConversation}
        onSelect={(id) => {
          abortRef.current?.abort();
          setActiveId(id);
          const c = conversations.find((x) => x.id === id);
          if (c) setMode(c.mode);
          setSidebarOpen(false);
        }}
        onDelete={deleteConversation}
        onOpenSettings={() => {
          setSettingsOpen(true);
          setSidebarOpen(false);
        }}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-line bg-paper/90 px-3 py-2.5 backdrop-blur sm:px-5">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="메뉴 열기"
            className="rounded-lg p-2 text-ink2 hover:bg-surface2 md:hidden"
          >
            <IconMenu />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-ink">
              {active ? active.title : "새 대화"}
            </div>
            <div className="truncate text-[11px] text-muted">
              {currentMode.label} · {settings.model.replace("claude-", "")}
            </div>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="설정"
            className="rounded-lg p-2 text-ink2 hover:bg-surface2"
          >
            <IconSettings />
          </button>
        </header>

        <div ref={scrollRef} className="scroll-thin flex-1 overflow-y-auto">
          {!ready ? null : messages.length === 0 ? (
            <Welcome
              mode={mode}
              hasKey={hasKey}
              onPick={(t) => send(t)}
              onModeChange={setMode}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          ) : (
            <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <UserBubble key={m.id} message={m} />
                ) : (
                  <AssistantBubble
                    key={m.id}
                    message={m}
                    streaming={busy && i === messages.length - 1}
                    onRetry={m.error ? retry : undefined}
                  />
                ),
              )}
              <div ref={bottomRef} className="h-2" />
            </div>
          )}
        </div>

        <Composer
          value={input}
          mode={mode}
          busy={busy}
          disabled={false}
          onChange={setInput}
          onModeChange={setMode}
          onSend={() => send()}
          onStop={stop}
        />
      </main>

      <SettingsModal
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
