import type { Conversation, Settings, TaskItem } from "./types";

export type SessionUser = { sub: string; email: string; name: string; picture?: string };

export type SessionInfo = {
  authConfigured: boolean;
  syncConfigured: boolean;
  user: SessionUser | null;
};

/** API 키와 MCP 토큰은 기기 밖으로 나가지 않습니다. 여기서 걷어냅니다. */
export type SyncedSettings = Omit<Settings, "keys" | "mcpToken" | "mcpServers"> & {
  mcpServers: Omit<Settings["mcpServers"][number], "token">[];
};

export type SyncPayload = {
  conversations: Conversation[];
  tasks: TaskItem[];
  settings: SyncedSettings;
};

const REV_KEY = "kimteacher.syncrev.v1";

export function stripSecrets(s: Settings): SyncedSettings {
  const { keys: _keys, mcpToken: _mcpToken, mcpServers, ...rest } = s;
  void _keys;
  void _mcpToken;
  return {
    ...rest,
    mcpServers: (mcpServers ?? []).map(({ token: _token, ...server }) => {
      void _token;
      return server;
    }),
  };
}

export function mergeSettings(local: Settings, remote: SyncedSettings | undefined): Settings {
  if (!remote) return local;
  // 원격에는 토큰이 없으므로, 같은 서버가 이 기기에 있으면 토큰을 살려 둡니다.
  const mcpServers = (remote.mcpServers ?? []).map((server) => ({
    ...server,
    token: local.mcpServers?.find((l) => l.id === server.id)?.token ?? "",
  }));
  return { ...local, ...remote, keys: local.keys, mcpServers };
}

export function mergeConversations(local: Conversation[], remote: Conversation[]): Conversation[] {
  const byId = new Map<string, Conversation>();
  for (const c of remote) byId.set(c.id, c);
  for (const c of local) {
    const existing = byId.get(c.id);
    if (!existing || (c.updatedAt ?? 0) >= (existing.updatedAt ?? 0)) byId.set(c.id, c);
  }
  return [...byId.values()].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

export function mergeTasks(local: TaskItem[], remote: TaskItem[]): TaskItem[] {
  const byId = new Map<string, TaskItem>();
  for (const t of remote) byId.set(t.id, t);
  for (const t of local) byId.set(t.id, t); // local wins on conflict
  return [...byId.values()];
}

export async function fetchSession(): Promise<SessionInfo> {
  try {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    if (!res.ok) throw new Error();
    return (await res.json()) as SessionInfo;
  } catch {
    return { authConfigured: false, syncConfigured: false, user: null };
  }
}

export async function signOut() {
  try {
    await fetch("/api/auth/signout", { method: "POST" });
  } catch {
    /* ignore */
  }
}

export async function pullRemote(): Promise<{ rev: number; data: SyncPayload | null } | null> {
  try {
    const res = await fetch("/api/sync", { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as { rev: number; data: SyncPayload | null };
  } catch {
    return null;
  }
}

export async function pushRemote(data: SyncPayload): Promise<boolean> {
  try {
    const res = await fetch("/api/sync", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data }),
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { rev?: number };
    if (body.rev) markRev(body.rev);
    return true;
  } catch {
    return false;
  }
}

export function lastRev(): number {
  try {
    return Number(localStorage.getItem(REV_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

export function markRev(rev: number) {
  try {
    localStorage.setItem(REV_KEY, String(rev));
  } catch {
    /* ignore */
  }
}
