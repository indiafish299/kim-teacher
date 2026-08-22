/**
 * File System Access API 타입 보강.
 * TypeScript 기본 DOM 타입에 아직 빠져 있는 부분만 최소한으로 채웁니다.
 */

type FsaPermissionMode = "read" | "readwrite";
type FsaPermissionState = "granted" | "denied" | "prompt";

interface FileSystemHandle {
  queryPermission(descriptor?: { mode?: FsaPermissionMode }): Promise<FsaPermissionState>;
  requestPermission(descriptor?: { mode?: FsaPermissionMode }): Promise<FsaPermissionState>;
}

interface FileSystemDirectoryHandle {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  keys(): AsyncIterableIterator<string>;
  values(): AsyncIterableIterator<FileSystemHandle>;
}

interface Window {
  showDirectoryPicker(options?: {
    id?: string;
    mode?: FsaPermissionMode;
    startIn?: string | FileSystemHandle;
  }): Promise<FileSystemDirectoryHandle>;
}
