/**
 * The agent emits two special fenced blocks that render as interactive widgets:
 *
 *   ```kt-doc
 *   제목: 2026학년도 가을 현장체험학습 안내
 *   ---
 *   <문서 본문>
 *   ```
 *
 *   ```kt-tasks
 *   업무: 가을 현장체험학습
 *   기준일: 2026-10-15
 *   D-30 | 학교운영위원회 심의 자료 제출
 *   2026-10-01 | 전세버스 계약 확인
 *   ```
 */

export type Segment =
  | { kind: "md"; text: string; open?: false }
  | { kind: "doc"; text: string; open: boolean }
  | { kind: "tasks"; text: string; open: boolean };

/** Splits an assistant message into markdown runs and special widget blocks. */
export function splitBlocks(src: string): Segment[] {
  const out: Segment[] = [];
  const re = /```(kt-doc|kt-tasks)[ \t]*\r?\n/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(src)) !== null) {
    if (m.index > last) out.push({ kind: "md", text: src.slice(last, m.index) });

    const kind = m[1] === "kt-doc" ? ("doc" as const) : ("tasks" as const);
    const bodyStart = m.index + m[0].length;
    const closeIdx = src.indexOf("\n```", bodyStart);

    if (closeIdx === -1) {
      out.push({ kind, text: src.slice(bodyStart), open: true });
      last = src.length;
      break;
    }
    out.push({ kind, text: src.slice(bodyStart, closeIdx), open: false });
    last = closeIdx + 4;
    re.lastIndex = last;
  }

  if (last < src.length) out.push({ kind: "md", text: src.slice(last) });
  return out.filter((s) => s.kind !== "md" || s.text.trim().length > 0);
}

/** Flattens a message to text a teacher can paste anywhere. */
export function toPlainText(src: string): string {
  return splitBlocks(src)
    .map((seg) => {
      if (seg.kind === "doc") {
        const d = parseDoc(seg.text);
        return `${d.title}\n\n${d.body}`;
      }
      if (seg.kind === "tasks") {
        const t = parseTasks(seg.text);
        const rows = t.items.map((i) => `- ${i.due || "날짜 미정"} · ${i.title}`).join("\n");
        return `[${t.group}]\n${rows}`;
      }
      return seg.text.trim();
    })
    .filter(Boolean)
    .join("\n\n");
}

export type ParsedDoc = { title: string; body: string };
export type ParsedTask = { title: string; due: string };
export type ParsedTasks = { group: string; anchor: string; items: ParsedTask[] };

function addDays(iso: string, delta: number): string {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + delta);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseDoc(raw: string): ParsedDoc {
  const lines = raw.replace(/\r/g, "").split("\n");
  let title = "";
  let start = 0;

  const first = lines[0]?.trim() ?? "";
  const m = first.match(/^(?:제목|title)\s*[:：]\s*(.+)$/i);
  if (m) {
    title = m[1].trim();
    start = 1;
    if ((lines[1] ?? "").trim() === "---") start = 2;
  }

  const body = lines.slice(start).join("\n").replace(/^\n+/, "").replace(/\n+$/, "");
  return { title: title || "문서 초안", body };
}

export function parseTasks(raw: string): ParsedTasks {
  const lines = raw.replace(/\r/g, "").split("\n");
  let group = "";
  let anchor = "";
  const items: ParsedTask[] = [];

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    const g = t.match(/^(?:업무|행사|제목)\s*[:：]\s*(.+)$/);
    if (g) {
      group = g[1].trim();
      continue;
    }
    const a = t.match(/^(?:기준일|행사일|기준\s*날짜)\s*[:：]\s*(\d{4}-\d{2}-\d{2})/);
    if (a) {
      anchor = a[1];
      continue;
    }

    const body = t.replace(/^[-*]\s*/, "").replace(/^\[[ xX]\]\s*/, "");
    const parts = body.split("|");
    if (parts.length < 2) {
      if (body) items.push({ title: body, due: "" });
      continue;
    }

    const left = parts[0].trim();
    const title = parts.slice(1).join("|").trim();
    if (!title) continue;

    let due = "";
    const iso = left.match(/^(\d{4}-\d{2}-\d{2})$/);
    const dday = left.match(/^D\s*([+-])\s*(\d+)$/i);
    if (iso) {
      due = iso[1];
    } else if (/^D-?day$/i.test(left) && anchor) {
      due = anchor;
    } else if (dday && anchor) {
      const delta = Number(dday[2]) * (dday[1] === "-" ? -1 : 1);
      due = addDays(anchor, delta);
    }
    items.push({ title, due });
  }

  return { group: group || "새 업무", anchor, items };
}
