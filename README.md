# 선배교사 김선생

교사를 위한 AI 업무 파트너. 가정통신문·공문 초안, 수업 자료, 생활기록부 문구, 업무 상담을
20년차 선배 교사의 관점으로 도와주는 웹앱입니다.

## 특징

- **통합 비서 + 4개 전문 모드** — 업무 상담 / 공문·통신문 / 수업 자료 / 생활기록부
- **생활기록부 기재요령 반영** — 명사형 종결, 기재 금지 항목 회피, 글자수 표기
- **사용자 API 키 방식** — 각 교사가 자신의 Anthropic API 키를 입력해 사용합니다.
  키는 **브라우저 localStorage에만** 저장되며 서버에 기록되지 않습니다.
  API 라우트는 요청 헤더로 받은 키를 그대로 Anthropic에 전달하는 프록시 역할만 합니다.
- **대화 기록 로컬 저장** — 대화도 브라우저에만 저장됩니다. 서버 DB가 없습니다.
- 스트리밍 응답, 마크다운·표 렌더링, 복사 / txt 저장, 다크 모드, 모바일 대응

## 개인정보

이 앱은 서버에 어떤 데이터도 저장하지 않습니다. 다만 입력한 내용은 Anthropic API로 전송되므로,
학생·학부모의 실명이나 연락처 등 개인정보는 입력하지 않도록 안내하고 있습니다.

## 기술 스택

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4

## 개발

```bash
npm install
npm run dev
```

http://localhost:3000 접속 후 설정에서 Anthropic API 키를 입력하면 바로 사용할 수 있습니다.
서버 환경변수는 필요하지 않습니다.

## 배포

Vercel에 그대로 배포됩니다. 환경변수 설정 없이 동작합니다.

```bash
npx vercel --prod
```

## 구조

```
src/
  app/
    page.tsx           메인 화면 (대화 상태 관리)
    api/chat/route.ts  Anthropic 스트리밍 프록시
  components/          Sidebar, Composer, MessageBubble, SettingsModal, Welcome
  lib/
    agent.ts           김선생 페르소나 + 모드별 프롬프트  ← 문구 수정은 주로 여기
    stream.ts          SSE 파싱
    storage.ts         localStorage 저장/불러오기
```
