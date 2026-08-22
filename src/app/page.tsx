"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import AccountBar from "@/components/AccountBar";
import FolderBar from "@/components/FolderBar";
import FolderPicker from "@/components/FolderPicker";
import ChatHeader from "@/components/ChatHeader";
import Composer from "@/components/Composer";
import Welcome from "@/components/Welcome";
import SettingsModal from "@/components/SettingsModal";
import { AssistantBubble, DateChip, UserBubble } from "@/components/MessageBubble";
import { streamChat } from "@/lib/stream";
import { downloadIcs } from "@/lib/ics";
import { DEFAULT_MOOD, guessMood, parseMood, type MoodId } from "@/lib/mood";
import { downloadGenerated, fetchGeneratedBlob, uploadFile } from "@/lib/files";
import {
  folderSupported,
  forgetFolder,
  listFiles,
  loadFolder,
  pickFolder,
  readFile,
  saveToFolder,
  type FolderEntry,
} from "@/lib/folder";
import { getProvider } from "@/lib/providers";
import type { ParsedTask } from "@/lib/blocks";
import type { FormPreset } from "@/lib/forms";
import {
  fetchSession,
  lastRev,
  markRev,
  mergeConversations,
  mergeSettings,
  mergeTasks,
  pullRemote,
  pushRemote,
  signOut,
  stripSecrets,
  type SessionInfo,
} from "@/lib/account";
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
import type {
  Attachment,
  ChatMessage,
  Conversation,
  GeneratedFile,
  Settings,
  TaskItem,
} from "@/lib/types";

export default function Page() {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncedAt, setSyncedAt] = useState<number | null>(null);

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState<string[]>([]);
  const [notice, setNotice] = useState("");

  const [folder, setFolder] = useState<FileSystemDirectoryHandle | null>(null);
  /** 서버 렌더에서는 알 수 없으므로 마운트 후에 확인합니다. */
  const [fsSupported, setFsSupported] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [folderEntries, setFolderEntries] = useState<FolderEntry[]>([]);
  const [folderLoading, setFolderLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const syncReady = useRef(false);
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
    void fetchSession().then(setSession);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFsSupported(folderSupported());
    void loadFolder().then(setFolder);
  }, []);

  /* Pull once after login, merge into whatever is already on this device, then push back. */
  useEffect(() => {
    if (!ready || !session?.user || !session.syncConfigured) return;
    let cancelled = false;
    void (async () => {
      setSyncing(true);
      const remote = await pullRemote();
      if (!cancelled && remote?.data) {
        const data = remote.data;
        setConversations((prev) => mergeConversations(prev, data.conversations ?? []));
        setTasks((prev) => mergeTasks(prev, data.tasks ?? []));
        if (lastRev() === 0 && data.settings) {
          setSettings((prev) => {
            const merged = mergeSettings(prev, data.settings);
            saveSettings(merged);
            return merged;
          });
        }
        markRev(remote.rev);
      }
      if (!cancelled) {
        setSyncing(false);
        setSyncedAt(Date.now());
        syncReady.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, session]);

  /* Debounced push of anything that changed locally. */
  useEffect(() => {
    if (!syncReady.current || !session?.user || !session.syncConfigured) return;
    const timer = setTimeout(() => {
      setSyncing(true);
      void pushRemote({ conversations, tasks, settings: stripSecrets(settings) }).then((ok) => {
        setSyncing(false);
        if (ok) setSyncedAt(Date.now());
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [conversations, tasks, settings, session]);

  useEffect(() => {
    if (ready) saveConversations(conversations);
  }, [conversations, ready]);

  useEffect(() => {
    if (ready) saveTasks(tasks);
  }, [tasks, ready]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );
  const messages = useMemo(() => active?.messages ?? [], [active]);
  const hasKey = Boolean(activeKey(settings));
  const canAttach = getProvider(settings.provider).supportsTools;

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

  /* ---------------- 파일 ---------------- */

  const addFiles = useCallback(
    async (files: File[]) => {
      const key = activeKey(settings);
      if (!key) {
        setSettingsOpen(true);
        return;
      }
      if (!canAttach) {
        setNotice("파일 첨부는 Claude를 쓸 때만 됩니다. 설정에서 Claude로 바꿔 주세요.");
        return;
      }
      for (const file of files.slice(0, 5)) {
        setUploading((u) => [...u, file.name]);
        try {
          const att = await uploadFile(file, key);
          setAttachments((prev) => (prev.some((a) => a.id === att.id) ? prev : [...prev, att]));
        } catch (e) {
          setNotice(e instanceof Error ? e.message : `${file.name}을(를) 올리지 못했습니다.`);
        } finally {
          setUploading((u) => u.filter((n) => n !== file.name));
        }
      }
    },
    [canAttach, settings],
  );

  const downloadFile = useCallback(
    async (f: GeneratedFile) => {
      const key = activeKey(settings);
      if (!key) throw new Error("API 키가 없습니다.");
      await downloadGenerated(f, key);
    },
    [settings],
  );

  const saveFileToFolder = useCallback(
    async (f: GeneratedFile) => {
      const key = activeKey(settings);
      if (!key) throw new Error("API 키가 없습니다.");
      if (!folder) throw new Error("연결된 폴더가 없습니다.");
      const blob = await fetchGeneratedBlob(f, key);
      const saved = await saveToFolder(folder, f.name, blob);
      setNotice(`${folder.name} 폴더에 "${saved}"로 저장했습니다.`);
    },
    [folder, settings],
  );

  /* ---------------- 폴더 ---------------- */

  const connectFolder = useCallback(async () => {
    const handle = await pickFolder();
    if (handle) {
      setFolder(handle);
      setNotice(`"${handle.name}" 폴더를 연결했습니다.`);
    }
  }, []);

  const openFolderPicker = useCallback(async () => {
    if (!folder) return;
    setFolderOpen(true);
    setFolderLoading(true);
    setFolderEntries(await listFiles(folder));
    setFolderLoading(false);
  }, [folder]);

  const pickFromFolder = useCallback(
    async (names: string[]) => {
      setFolderOpen(false);
      if (!folder) return;
      const files: File[] = [];
      for (const name of names) {
        const f = await readFile(folder, name);
        if (f) files.push(f);
      }
      if (files.length) await addFiles(files);
    },
    [addFiles, folder],
  );

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
    async (convId: string, history: ChatMessage[], containerId?: string) => {
      const assistantId = uid();
      patchConversation(convId, (c) => ({
        ...c,
        messages: [...c.messages, { id: assistantId, role: "assistant", content: "", createdAt: Date.now() }],
        updatedAt: Date.now(),
      }));

      const patchMsg = (fn: (m: ChatMessage) => ChatMessage) =>
        patchConversation(convId, (c) => ({
          ...c,
          messages: c.messages.map((m) => (m.id === assistantId ? fn(m) : m)),
        }));

      const controller = new AbortController();
      abortRef.current = controller;
      setBusy(true);

      let buffer = "";
      let frame = 0;
      const flush = () => {
        frame = 0;
        const parsed = parseMood(buffer);
        patchMsg((m) => ({ ...m, content: buffer, mood: parsed.mood ?? m.mood }));
      };

      try {
        await streamChat({
          apiKey: activeKey(settings),
          provider: settings.provider,
          model: activeModel(settings),
          mode: "assist",
          profile,
          userName: settings.userName,
          intimacy: settings.intimacy,
          tools: settings.tools,
          mcpServers: settings.mcpServers,
          containerId,
          messages: history.map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments,
          })),
          signal: controller.signal,
          onDelta: (t) => {
            buffer += t;
            if (!frame) frame = requestAnimationFrame(flush);
          },
          onTool: (e) => {
            patchMsg((m) => {
              const list = m.tools ?? [];
              if (e.phase === "start") {
                if (list.some((t) => t.id === e.id)) return m;
                return { ...m, tools: [...list, { id: e.id, name: e.name ?? "tool", done: false }] };
              }
              return {
                ...m,
                tools: list.map((t) => (t.id === e.id ? { ...t, done: true, ok: e.ok } : t)),
              };
            });
          },
          onFile: (f) => {
            patchMsg((m) =>
              (m.files ?? []).some((x) => x.id === f.id)
                ? m
                : { ...m, files: [...(m.files ?? []), f] },
            );
          },
          onContainer: (id) => patchConversation(convId, (c) => ({ ...c, containerId: id })),
        });
        if (frame) cancelAnimationFrame(frame);
        flush();
        const finalMood = parseMood(buffer).mood ?? guessMood(buffer);
        patchMsg((m) => ({
          ...m,
          mood: finalMood,
          // 끝났는데 아직 도는 것처럼 보이는 도구 표시는 정리합니다.
          tools: (m.tools ?? []).map((t) => (t.done ? t : { ...t, done: true, ok: true })),
        }));
      } catch (err) {
        if (frame) cancelAnimationFrame(frame);
        const aborted = err instanceof DOMException && err.name === "AbortError";
        const message = aborted
          ? buffer
          : err instanceof Error
            ? err.message
            : "알 수 없는 오류가 발생했습니다.";
        patchMsg((m) =>
          aborted
            ? { ...m, content: buffer || "(중지됨)", tools: (m.tools ?? []).map((t) => ({ ...t, done: true })) }
            : { ...m, content: message, error: true },
        );
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
      if ((!text && attachments.length === 0) || busy) return;
      if (!activeKey(settings)) {
        setSettingsOpen(true);
        return;
      }

      const userMsg: ChatMessage = {
        id: uid(),
        role: "user",
        content: text,
        createdAt: Date.now(),
        ...(attachments.length ? { attachments } : {}),
      };
      let convId = activeId;
      let history: ChatMessage[];
      let containerId: string | undefined;

      if (!convId || !conversations.some((c) => c.id === convId)) {
        convId = uid();
        const conv: Conversation = {
          id: convId,
          title: makeTitle(text || attachments[0]?.name || "새 대화"),
          mode: "assist",
          messages: [userMsg],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        history = [userMsg];
        setConversations((prev) => [conv, ...prev]);
        setActiveId(convId);
      } else {
        const existing = conversations.find((c) => c.id === convId)!;
        containerId = existing.containerId;
        history = [...existing.messages.filter((m) => !m.error), userMsg];
        patchConversation(convId, (c) => ({
          ...c,
          messages: [...c.messages, userMsg],
          updatedAt: Date.now(),
        }));
      }

      setInput("");
      setAttachments([]);
      setTimeout(() => scrollToBottom(), 40);
      void run(convId, history, containerId);
    },
    [activeId, attachments, busy, conversations, input, patchConversation, run, scrollToBottom, settings],
  );

  const retry = useCallback(() => {
    if (!active) return;
    const kept = active.messages.filter((m) => !m.error);
    if (!kept.some((m) => m.role === "user")) return;
    patchConversation(active.id, (c) => ({ ...c, messages: kept }));
    void run(active.id, kept, active.containerId);
  }, [active, patchConversation, run]);

  const pickForm = useCallback((preset: FormPreset) => {
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
          setAttachments([]);
          setSidebarOpen(false);
        }}
        onSelect={(id) => {
          abortRef.current?.abort();
          setActiveId(id);
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
        footer={
          <>
            <FolderBar
              supported={fsSupported}
              name={folder?.name ?? null}
              onConnect={connectFolder}
              onDisconnect={async () => {
                await forgetFolder();
                setFolder(null);
              }}
            />
            <AccountBar
              session={session}
              syncing={syncing}
              syncedAt={syncedAt}
              onSignOut={async () => {
                await signOut();
                markRev(0);
                setSession((s) => (s ? { ...s, user: null } : s));
                syncReady.current = false;
              }}
              onOpenSettings={() => {
                setSettingsOpen(true);
                setSidebarOpen(false);
              }}
            />
          </>
        }
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
              hasKey={hasKey}
              userName={settings.userName}
              intimacy={settings.intimacy}
              onPick={(t) => send(t)}
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
                        folderConnected={Boolean(folder)}
                        onRetry={m.error ? retry : undefined}
                        onAddTasks={addTasks}
                        onExportTasks={exportParsed}
                        onDownloadFile={downloadFile}
                        onSaveFile={saveFileToFolder}
                      />
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} className="h-2" />
            </div>
          )}
        </div>

        {notice && (
          <div className="border-t border-line bg-surface2 px-4 py-2">
            <p className="mx-auto flex max-w-3xl items-center gap-2 text-xs text-ink2">
              <span className="flex-1">{notice}</span>
              <button onClick={() => setNotice("")} className="shrink-0 text-muted hover:text-ink">
                닫기
              </button>
            </p>
          </div>
        )}

        <Composer
          value={input}
          busy={busy}
          disabled={false}
          canAttach={canAttach}
          attachments={attachments}
          uploading={uploading}
          folderConnected={Boolean(folder)}
          onChange={setInput}
          onSend={() => send()}
          onStop={() => abortRef.current?.abort()}
          onFiles={(files) => void addFiles(files)}
          onRemoveAttachment={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
          onOpenFolder={() => void openFolderPicker()}
        />
      </main>

      {folderOpen && folder && (
        <FolderPicker
          folderName={folder.name}
          entries={folderEntries}
          loading={folderLoading}
          onPick={(names) => void pickFromFolder(names)}
          onClose={() => setFolderOpen(false)}
        />
      )}

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
