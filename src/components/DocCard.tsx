"use client";

import { useState } from "react";
import { copyText, downloadText, printDocument } from "@/lib/clipboard";
import { parseDoc } from "@/lib/blocks";
import { IconCheck, IconCopy, IconDoc, IconDownload, IconPrint } from "./Icons";

function sanitizeFilename(s: string) {
  return s.replace(/[\\/:*?"<>|]/g, "").trim().slice(0, 60) || "문서";
}

export default function DocCard({ raw, streaming }: { raw: string; streaming?: boolean }) {
  const { title, body } = parseDoc(raw);
  const [copied, setCopied] = useState(false);

  const btn =
    "inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink2 transition-colors hover:bg-surface2 disabled:opacity-50";

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface2 px-3.5 py-2.5">
        <IconDoc className="shrink-0 text-accent" />
        <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold text-ink">{title}</span>
        <div className="flex items-center gap-1.5">
          <button
            className={btn}
            disabled={streaming}
            onClick={async () => {
              if (await copyText(body)) {
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              }
            }}
          >
            {copied ? <IconCheck className="h-3.5 w-3.5 text-accent" /> : <IconCopy className="h-3.5 w-3.5" />}
            {copied ? "복사됨" : "복사"}
          </button>
          <button
            className={btn}
            disabled={streaming}
            onClick={() => downloadText(body, `${sanitizeFilename(title)}.txt`)}
          >
            <IconDownload className="h-3.5 w-3.5" />
            txt
          </button>
          <button className={btn} disabled={streaming} onClick={() => printDocument(title, body)}>
            <IconPrint className="h-3.5 w-3.5" />
            인쇄
          </button>
        </div>
      </div>
      <pre className="scroll-thin max-h-[32rem] overflow-auto px-4 py-3.5 text-[0.875rem] leading-[1.85] whitespace-pre-wrap text-ink">
        {body}
        {streaming && <span className="caret" />}
      </pre>
      <p className="border-t border-linesoft px-4 py-2 text-[11px] text-muted">
        복사해서 한글(HWP) 문서에 붙여넣으면 서식 없이 그대로 들어갑니다.
      </p>
    </div>
  );
}
