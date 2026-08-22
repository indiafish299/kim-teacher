/**
 * Claude 서버 도구 정의.
 *
 * 여기 있는 도구는 전부 Anthropic이 자기 서버에서 실행합니다. 우리 서버는 아무것도
 * 실행하지 않고, 사용자 키로 요청을 중계하기만 합니다.
 *
 * - web_fetch      : 사용자가 준 URL의 페이지를 읽습니다. (별도 과금 없음)
 * - code_execution : 파이썬 샌드박스에서 표/문서/이미지를 만들고 파일로 내보냅니다.
 *
 * 웹 "검색"은 넣지 않습니다. 1,000회당 $10이 따로 붙어서, 학교에서 쓰기엔 부담입니다.
 */

export type ToolFlags = {
  /** 사용자가 링크를 주면 그 페이지를 읽습니다. */
  webFetch: boolean;
  /** 표·문서·차트를 실제 파일로 만들어 줍니다. */
  code: boolean;
};

export const DEFAULT_TOOL_FLAGS: ToolFlags = { webFetch: true, code: true };

export const TOOL_INFO: {
  key: keyof ToolFlags;
  label: string;
  blurb: string;
}[] = [
  {
    key: "webFetch",
    label: "웹 페이지 읽기",
    blurb: "교육청 공지 같은 링크를 주면 김선생이 직접 열어 읽고 요약합니다.",
  },
  {
    key: "code",
    label: "파일 만들기 (엑셀·워드·차트)",
    blurb: "명렬표, 집계표, 안내문을 실제 파일로 만들어 내려받게 해 줍니다.",
  },
];

/* ------------------------------------------------------------------ */
/* MCP                                                                 */
/* ------------------------------------------------------------------ */

export type McpServer = {
  id: string;
  name: string;
  url: string;
  token: string;
  enabled: boolean;
};

export const MCP_PRESETS: { name: string; url: string; hint: string }[] = [
  {
    name: "구글 캘린더",
    url: "https://calendarmcp.googleapis.com/mcp/v1",
    hint: "학사일정·수업 일정을 김선생이 직접 확인하고 등록합니다.",
  },
  {
    name: "구글 드라이브",
    url: "https://drivemcp.googleapis.com/mcp/v1",
    hint: "드라이브에 있는 문서를 찾아 읽고 새 파일을 올립니다.",
  },
];

/** Anthropic이 요구하는 서버 이름 형식(영숫자/밑줄/하이픈)으로 정리. */
export function mcpSlug(name: string, fallback: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 60);
  return slug || `mcp_${fallback.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20) || "server"}`;
}

/* ------------------------------------------------------------------ */
/* 요청 조립                                                            */
/* ------------------------------------------------------------------ */

export type ToolBuild = {
  tools: Record<string, unknown>[];
  mcpServers: Record<string, unknown>[];
  betas: string[];
};

/**
 * 도구 버전은 web_fetch와 code_execution의 세대를 맞춰야 합니다.
 * (web_fetch 2026년판을 쓰려면 code_execution도 2026년판이어야 합니다.)
 * 지금은 검증된 2025년 조합을 함께 씁니다.
 *
 * 이 도구들은 정식 기능이라 anthropic-beta 헤더가 필요 없습니다.
 * 없어진 베타 이름을 보내면 400이 나므로 절대 붙이지 않습니다.
 */
export function buildTools(flags: ToolFlags, servers: McpServer[]): ToolBuild {
  const tools: Record<string, unknown>[] = [];
  const betas: string[] = [];

  if (flags.webFetch) {
    tools.push({
      type: "web_fetch_20250910",
      name: "web_fetch",
      max_uses: 8,
      citations: { enabled: true },
    });
  }

  if (flags.code) {
    tools.push({ type: "code_execution_20250825", name: "code_execution" });
  }

  const mcpServers: Record<string, unknown>[] = [];
  for (const s of servers) {
    if (!s.enabled || !s.url.startsWith("https://")) continue;
    const name = mcpSlug(s.name, s.id);
    mcpServers.push({
      type: "url",
      url: s.url.slice(0, 500),
      name,
      ...(s.token ? { authorization_token: s.token.slice(0, 4000) } : {}),
    });
    tools.push({ type: "mcp_toolset", mcp_server_name: name });
  }
  // 남은 베타는 MCP 커넥터 하나뿐입니다.
  if (mcpServers.length) betas.push("mcp-client-2025-11-20");

  return { tools, mcpServers, betas: [...new Set(betas)] };
}

/* ------------------------------------------------------------------ */
/* 화면 표시용 이름                                                      */
/* ------------------------------------------------------------------ */

export function toolLabel(name: string): string {
  if (name === "web_fetch") return "웹 페이지 읽는 중";
  if (name === "code_execution" || name === "bash_code_execution") return "파일 만드는 중";
  if (name === "str_replace_based_edit_tool" || name === "text_editor_code_execution") {
    return "작업 파일 정리 중";
  }
  return `${name} 실행 중`;
}

export function toolDoneLabel(name: string): string {
  if (name === "web_fetch") return "웹 페이지를 읽었습니다";
  if (name === "code_execution" || name === "bash_code_execution") return "코드를 실행했습니다";
  if (name === "str_replace_based_edit_tool" || name === "text_editor_code_execution") {
    return "작업 파일을 정리했습니다";
  }
  return `${name} 완료`;
}
