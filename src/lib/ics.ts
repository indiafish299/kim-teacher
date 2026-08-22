import type { TaskItem } from "./types";

function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** Fold long lines to 75 octets as RFC 5545 asks. */
function fold(line: string) {
  if (line.length <= 73) return line;
  const out: string[] = [];
  let rest = line;
  out.push(rest.slice(0, 73));
  rest = rest.slice(73);
  while (rest.length > 72) {
    out.push(" " + rest.slice(0, 72));
    rest = rest.slice(72);
  }
  if (rest) out.push(" " + rest);
  return out.join("\r\n");
}

function compact(iso: string) {
  return iso.replace(/-/g, "");
}

function nextDay(iso: string) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

export function buildIcs(tasks: TaskItem[], stampMs: number): string {
  const dated = tasks.filter((t) => /^\d{4}-\d{2}-\d{2}$/.test(t.due));
  const stamp = new Date(stampMs).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//선배교사 김선생//KR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:김선생 업무 일정",
  ];

  for (const t of dated) {
    const summary = t.group && t.group !== "새 업무" ? `[${t.group}] ${t.title}` : t.title;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${t.id}@kim-teacher`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(t.due)}`,
      `DTEND;VALUE=DATE:${nextDay(t.due)}`,
      fold(`SUMMARY:${esc(summary)}`),
      fold("DESCRIPTION:" + esc("선배교사 김선생에서 내보낸 업무 일정입니다.")),
      "TRANSP:TRANSPARENT",
      "BEGIN:VALARM",
      "TRIGGER:-PT9H",
      "ACTION:DISPLAY",
      fold(`DESCRIPTION:${esc(summary)}`),
      "END:VALARM",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(tasks: TaskItem[]) {
  const ics = buildIcs(tasks, Date.now());
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `김선생_업무일정_${new Date().toISOString().slice(0, 10)}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
