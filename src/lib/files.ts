import type { Attachment, GeneratedFile } from "./types";

const IMAGE = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
/** 문서 블록으로 바로 읽히는 형식. 나머지는 코드 실행 컨테이너로 올립니다. */
const DOCUMENT = new Set(["application/pdf", "text/plain", "text/markdown"]);

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export function kindFor(mime: string, name: string): Attachment["kind"] {
  if (IMAGE.has(mime)) return "image";
  if (DOCUMENT.has(mime)) return "document";
  if (/\.(txt|md|pdf)$/i.test(name)) return "document";
  return "container";
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

/** 확장자만 뽑아 칩에 표시. */
export function fileTag(name: string): string {
  const m = /\.([A-Za-z0-9]{1,6})$/.exec(name);
  return m ? m[1].toUpperCase() : "파일";
}

export async function uploadFile(file: File, apiKey: string): Promise<Attachment> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/files", {
    method: "POST",
    headers: { "x-user-api-key": apiKey },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "파일을 올리지 못했습니다.");
  return data as Attachment;
}

export async function downloadGenerated(file: GeneratedFile, apiKey: string): Promise<void> {
  const res = await fetch("/api/files/download", {
    method: "POST",
    headers: { "content-type": "application/json", "x-user-api-key": apiKey },
    body: JSON.stringify({ id: file.id, name: file.name }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? "파일을 가져오지 못했습니다.");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** 폴더 연결 기능에서 쓰려고 blob 그대로 받는 버전. */
export async function fetchGeneratedBlob(file: GeneratedFile, apiKey: string): Promise<Blob> {
  const res = await fetch("/api/files/download", {
    method: "POST",
    headers: { "content-type": "application/json", "x-user-api-key": apiKey },
    body: JSON.stringify({ id: file.id, name: file.name }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? "파일을 가져오지 못했습니다.");
  }
  return res.blob();
}
