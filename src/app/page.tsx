"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import ChatHeader from "@/components/ChatHeader";
import Composer from "@/components/Composer";
import Welcome from "@/components/Welcome";
import SettingsModal from "@/components/SettingsModal";
import { AssistantBubble, DateChip, UserBubble } from "@/components/MessageBubble";
import { DEFAULT_MODE, type ModeId } from "@/lib/agent";
import { streamChat } from "@/lib/stream";
import { downloadIcs } from "@/lib/ics";
import { DEFAULT_MOOD, guessMood, parseMood, type MoodId } from "@/lib/mood";
import type { ParsedTask } from "@/lib/blocks";
import type { FormPreset } from "@/lib/forms";
import {
  DEFAULT_SETTINGS,
  activeKey,
  activeModel,
  loadConversations,
  loadSettings,
  loadTasks,
  formatDateChip,
  makeTitle,
  sameDay,
  saveConversations,
  saveSettings,
  saveTasks,
  uid,
} from "@/lib/storage";
import type { ChatMessage, Conversation, Settings, TaskItem } from "@/lib/types";

export default function Page() {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<ModeId>(DEFAULT_MODE);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Hydrate from localStorage after mount. The server renders the empty state, so
  // this has to run in an effect rather than a lazy initializer.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setSettings(loadSettings());
    setConversations(loadConversations());
    setTasks(loadTasks());
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (ready) saveConversations(conversations);
  }, [conversations, ready]);

  useEffect(() => {
    if (ready) saveTasks(tasks);
  }, [tasks, ready]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );
  const messages = useMemo(() => active?.messages ?? [], [active]);
  const hasKey = Boolean(activeKey(settings));

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

  /* ---------------- tasks ---------------- */

  const addTasks = useCallback((group: string, items: ParsedTask[]) => {
    setTasks((prev) => {
      const fresh = items
        .filter((i) => i.title.trim())
        .filter((i) => !prev.some((t) => t.title === i.title && t.group === group))
        .map<TaskItem>((i) => ({
          id: uid(),
          title: i.title.trim(),
          due: i.due,
          group,
          done: false,
          createdAt: Date.now(),
        }));
      return [...fresh, ...prev];
    });
  }, []);

  const exportParsed = useCallback((group: string, items: ParsedTask[]) => {
    const asTasks: TaskItem[] = items
      .filter((i) => i.due)
      .map((i) => ({
        id: uid(),
        title: i.title,
        due: i.due,
        group,
        done: false,
        createdAt: Date.now(),
      }));
    if (asTasks.length) downloadIcs(asTasks);
  }, []);

  const exportAllTasks = useCallback(() => {
    const pending = tasks.filter((t) => !t.done && t.due);
    if (pending.length) downloadIcs(pending);
  }, [tasks]);

  const datedPending = useMemo(() => tasks.filter((t) => !t.done && t.due).length, [tasks]);

  /** The header face follows the newest reply; it thinks while one is being written. */
  const headerMood: MoodId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== "assistant") continue;
      if (m.error) return "concerned";
      if (m.mood) return m.mood;
      break;
    }
    return busy ? "thinking" : DEFAULT_MOOD;
  }, [messages, busy]);

  /* ---------------- chat ---------------- */

  const run = useCallback(
    async (convId: string, history: ChatMessage[], targetMode: ModeId) => {
      const assistantId = uid();
      patchConversation(convId, (c) => ({
        ...c,
        messages: [...c.messages, { id: assistantId, role: "assistant", content: "", createdAt: Date.now() }],
        updatedAt: Date.now(),
      }));

      const controller = new AbortController();
      abortRef.current = controller;
      setBusy(true);

      let buffer = "";
      let frame = 0;
      const flush = () => {
        frame = 0;
        const parsed = parseMood(buffer);
        patchConversation(convId, (c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.id === assistantId ? { ...m, content: buffer, mood: parsed.mood ?? m.mood } : m,
          ),
        }));
      };

      try {
        await streamChat({
          apiKey: activeKey(settings),
          provider: settings.provider,
          model: activeModel(settings),
          mode: targetMode,
          profile,
          userName: settings.userName,
          intimacy: settings.intimacy,
          mcpUrl: settings.mcpUrl,
          mcpToken: settings.mcpToken,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          signal: controller.signal,
          onDelta: (t) => {
            buffer += t;
            if (!frame) frame = requestAnimationFrame(flush);
          },
        });
        if (frame) cancelAnimationFrame(frame);
        flush();
        const finalMood = parseMood(buffer).mood ?? guessMood(buffer);
        patchConversation(convId, (c) => ({
          ...c,
          messages: c.messages.map((m) => (m.id === assistantId ? { ...m, mood: finalMood } : m)),
        }));
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
    [patchConversation, profile, scrollToBottom, settings],
  );

  const send = useCallback(
    (raw?: string) => {
      const text = (raw ?? input).trim();
      if (!text || busy) return;
      if (!activeKey(settings)) {
        setSettingsOpen(true);
        return;
      }

      const userMsg: ChatMessage = { id: uid(), role: "user", content: text, createdAt: Date.now() };
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
    [activeId, busy, conversations, input, mode, patchConversation, run, scrollToBottom, settings],
  );

  const retry = useCallback(() => {
    if (!active) return;
    const kept = active.messages.filter((m) => !m.error);
    if (!kept.some((m) => m.role === "user")) return;
    patchConversation(active.id, (c) => ({ ...c, messages: kept }));
    void run(active.id, kept, active.mode);
  }, [active, patchConversation, run]);

  const pickForm = useCallback((preset: FormPreset) => {
    setMode(preset.mode);
    setInput(preset.prompt);
    setSidebarOpen(false);
    setTimeout(() => scrollToBottom(), 40);
  }, [scrollToBottom]);

  return (
    <div className="flex h-dvh overflow-hidden bg-paper">
      <Sidebar
        open={sidebarOpen}
        tasks={tasks}
        conversations={conversations}
        activeId={activeId}
        onNew={() => {
          abortRef.current?.abort();
          setBusy(false);
          setActiveId(null);
          setInput("");
          setSidebarOpen(false);
        }}
        onSelect={(id) => {
          abortRef.current?.abort();
          setActiveId(id);
          const c = conversations.find((x) => x.id === id);
          if (c) setMode(c.mode);
          setSidebarOpen(false);
        }}
        onDelete={(id) => {
          setConversations((prev) => prev.filter((c) => c.id !== id));
          setActiveId((cur) => (cur === id ? null : cur));
        }}
        onToggleTask={(id) =>
          setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
        }
        onDeleteTask={(id) => setTasks((prev) => prev.filter((t) => t.id !== id))}
        onAddTask={(title, due) =>
          setTasks((prev) => [
            { id: uid(), title, due, group: "직접 추가", done: false, createdAt: Date.now() },
            ...prev,
          ])
        }
        onClearDone={() => setTasks((prev) => prev.filter((t) => !t.done))}
        onPickForm={pickForm}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <ChatHeader
          settings={settings}
          mood={headerMood}
          busy={busy}
          taskCount={datedPending}
          onOpenMenu={() => setSidebarOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onExportCalendar={exportAllTasks}
        />

        <div className="scroll-thin flex-1 overflow-y-auto">
          {!ready ? null : messages.length === 0 ? (
            <Welcome
              mode={mode}
              hasKey={hasKey}
              userName={settings.userName}
              intimacy={settings.intimacy}
              onPick={(t) => send(t)}
              onModeChange={setMode}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          ) : (
            <div className="mx-auto w-full max-w-3xl space-y-3 px-3 py-4 sm:px-5 sm:py-6">
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const showDate = !prev || !sameDay(prev.createdAt, m.createdAt);
                return (
                  <div key={m.id} className="space-y-3">
                    {showDate && <DateChip label={formatDateChip(m.createdAt)} />}
                    {m.role === "user" ? (
                      <UserBubble message={m} />
                    ) : (
                      <AssistantBubble
                        message={m}
                        streaming={busy && i === messages.length - 1}
                        onRetry={m.error ? retry : undefined}
                        onAddTasks={addTasks}
                        onExportTasks={exportParsed}
                      />
                    )}
                  </div>
                );
              })}
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
          onStop={() => abortRef.current?.abort()}
        />
      </main>

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onSave={(s) => {
            setSettings(s);
            saveSettings(s);
            setSettingsOpen(false);
          }}
        />
      )}
    </div>
  );
}
