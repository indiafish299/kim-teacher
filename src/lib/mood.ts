export type MoodId = "calm" | "confident" | "thinking" | "concerned" | "cheerful";

export type Mood = {
  id: MoodId;
  label: string;
  /** When the agent should pick this face. */
  when: string;
  src: string;
};

export const MOODS: Record<MoodId, Mood> = {
  calm: {
    id: "calm",
    label: "차분",
    when: "평범하게 설명하거나 안내할 때 (기본값)",
    src: "/avatars/calm.webp",
  },
  confident: {
    id: "confident",
    label: "자신감",
    when: "문서나 자료를 완성해서 내놓을 때, 이건 이렇게 하면 된다고 확실히 말할 때",
    src: "/avatars/confident.webp",
  },
  thinking: {
    id: "thinking",
    label: "고민",
    when: "상황을 따져보거나, 되묻거나, 판단이 갈리는 사안을 신중하게 다룰 때",
    src: "/avatars/thinking.webp",
  },
  concerned: {
    id: "concerned",
    label: "걱정",
    when: "학교폭력·아동학대·민원 격화처럼 조심해야 할 사안이거나, 위험·주의를 알릴 때",
    src: "/avatars/concerned.webp",
  },
  cheerful: {
    id: "cheerful",
    label: "활짝",
    when: "가벼운 잡담, 격려, 일이 잘 풀렸을 때, 퇴근하라고 챙길 때",
    src: "/avatars/cheerful.webp",
  },
};

export const MOOD_IDS = Object.keys(MOODS) as MoodId[];
export const DEFAULT_MOOD: MoodId = "calm";

export function moodSrc(id: MoodId | undefined): string {
  return MOODS[id ?? DEFAULT_MOOD]?.src ?? MOODS.calm.src;
}

const TAG = /^\s*\[(?:감정|mood)\s*[:：]\s*(calm|confident|thinking|concerned|cheerful)\s*\]\s*\r?\n?/i;
/** Matches a partially streamed tag at the very start, e.g. "[감정:conf" */
const PARTIAL = /^\s*\[(?:감정|mood|감|m|mo|moo|감정)?\s*[:：]?\s*[a-z]*$/i;

export type MoodParse = { mood?: MoodId; text: string };

/**
 * Strips the leading mood tag the agent emits. Tolerates a half-written tag
 * mid-stream so the marker never flashes on screen.
 */
export function parseMood(raw: string): MoodParse {
  const m = raw.match(TAG);
  if (m) {
    return { mood: m[1].toLowerCase() as MoodId, text: raw.slice(m[0].length) };
  }
  if (raw.length < 24 && PARTIAL.test(raw)) return { text: "" };
  return { text: raw };
}

/** Fallback when the model forgets the tag. */
export function guessMood(text: string): MoodId {
  const t = text.slice(0, 900);
  if (/학교폭력|아동학대|신고 의무|교권|성 관련|위험|즉시 보고|주의하셔야|조심/.test(t)) return "concerned";
  if (/```kt-doc/.test(text)) return "confident";
  if (/\?$|여쭤|확인이 필요|어느 쪽|판단이|애매/.test(t)) return "thinking";
  if (/퇴근|고생|수고|축하|잘 됐|다행/.test(t)) return "cheerful";
  return "calm";
}

export function moodPromptBlock(): string {
  const lines = MOOD_IDS.map((id) => `- ${id}: ${MOODS[id].when}`).join("\n");
  return `## 답변 첫 줄의 감정 표기 (필수)
모든 답변은 반드시 아래 형식의 한 줄로 시작합니다. 이 줄은 화면에 글자로 보이지 않고, 김선생의 프로필 사진 표정을 바꾸는 데 쓰입니다.

[감정:calm]

쓸 수 있는 값은 다섯 개뿐입니다.
${lines}

규칙:
- 답변의 가장 첫 줄에만 씁니다. 본문 중간이나 끝에 다시 쓰지 않습니다.
- 다섯 값 외의 단어를 쓰지 않습니다.
- 이 줄 다음에 곧바로 본문을 시작합니다.`;
}
