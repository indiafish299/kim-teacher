/**
 * 내 PC 폴더 연결 (File System Access API).
 *
 * 크롬·엣지 데스크톱에서만 동작합니다. 폴더 권한은 브라우저가 쥐고 있고, 우리 서버는
 * 폴더 안을 볼 수 없습니다. 김선생이 파일을 읽으려면 사용자가 그 파일을 고른 뒤
 * 첨부로 올라가는 순간에만 내용이 오갑니다.
 */

type Handle = FileSystemDirectoryHandle;

const DB = "kimteacher";
const STORE = "handles";
const KEY = "workFolder";

export function folderSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

async function ensurePermission(handle: Handle, write: boolean): Promise<boolean> {
  const opts = { mode: write ? "readwrite" : "read" } as const;
  try {
    if ((await handle.queryPermission(opts)) === "granted") return true;
    return (await handle.requestPermission(opts)) === "granted";
  } catch {
    return false;
  }
}

/** 폴더를 고르게 하고 기억해 둡니다. 취소하면 null. */
export async function pickFolder(): Promise<Handle | null> {
  if (!folderSupported()) return null;
  try {
    const handle = await window.showDirectoryPicker({ mode: "readwrite", id: "kimteacher-work" });
    await idb("readwrite", (s) => s.put(handle, KEY));
    return handle;
  } catch {
    return null; // 사용자가 취소
  }
}

/** 지난번에 고른 폴더를 되찾습니다. 권한이 풀렸으면 null을 돌려주고 다시 고르게 합니다. */
export async function loadFolder(): Promise<Handle | null> {
  if (!folderSupported()) return null;
  try {
    const handle = await idb<Handle | undefined>("readonly", (s) => s.get(KEY));
    if (!handle) return null;
    const ok = (await handle.queryPermission({ mode: "readwrite" })) === "granted";
    return ok ? handle : null;
  } catch {
    return null;
  }
}

/** 저장돼 있던 폴더에 다시 권한을 요청합니다. (사용자 클릭 안에서만 동작) */
export async function reconnectFolder(): Promise<Handle | null> {
  try {
    const handle = await idb<Handle | undefined>("readonly", (s) => s.get(KEY));
    if (!handle) return null;
    return (await ensurePermission(handle, true)) ? handle : null;
  } catch {
    return null;
  }
}

export async function forgetFolder(): Promise<void> {
  try {
    await idb("readwrite", (s) => s.delete(KEY));
  } catch {
    /* ignore */
  }
}

export type FolderEntry = { name: string; size: number; modified: number };

const SKIP = /^(~\$|\.)/;

/** 폴더 첫 단계의 파일 목록. 하위 폴더는 훑지 않습니다. */
export async function listFiles(handle: Handle, limit = 200): Promise<FolderEntry[]> {
  const out: FolderEntry[] = [];
  try {
    for await (const [name, entry] of handle.entries()) {
      if (out.length >= limit) break;
      if (entry.kind !== "file" || SKIP.test(name)) continue;
      try {
        const file = await (entry as FileSystemFileHandle).getFile();
        out.push({ name, size: file.size, modified: file.lastModified });
      } catch {
        /* 열 수 없는 파일은 건너뜁니다 */
      }
    }
  } catch {
    /* 권한이 풀린 경우 */
  }
  return out.sort((a, b) => b.modified - a.modified);
}

export async function readFile(handle: Handle, name: string): Promise<File | null> {
  try {
    const fh = await handle.getFileHandle(name);
    return await fh.getFile();
  } catch {
    return null;
  }
}

/** 같은 이름이 있으면 "이름 (2).xlsx"로 비켜 씁니다. 기존 파일을 덮지 않습니다. */
async function freeName(handle: Handle, name: string): Promise<string> {
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  for (let i = 1; i < 100; i++) {
    const candidate = i === 1 ? name : `${stem} (${i})${ext}`;
    try {
      await handle.getFileHandle(candidate);
    } catch {
      return candidate; // 없으니 이 이름을 씁니다
    }
  }
  return `${stem} (${Date.now()})${ext}`;
}

/** 결과 파일을 연결된 폴더에 저장하고, 실제로 쓰인 파일 이름을 돌려줍니다. */
export async function saveToFolder(handle: Handle, name: string, blob: Blob): Promise<string> {
  if (!(await ensurePermission(handle, true))) {
    throw new Error("폴더에 쓸 권한이 없습니다. 폴더를 다시 연결해 주세요.");
  }
  const finalName = await freeName(handle, name);
  const fh = await handle.getFileHandle(finalName, { create: true });
  const stream = await fh.createWritable();
  await stream.write(blob);
  await stream.close();
  return finalName;
}
