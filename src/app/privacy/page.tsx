import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보처리방침 — 선배교사 김선생",
  description: "선배교사 김선생이 어떤 정보를 다루고 무엇을 저장하지 않는지 안내합니다.",
};

const UPDATED = "2026년 8월 22일";

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12">
      <Link href="/" className="text-[0.8125rem] text-accent underline underline-offset-2">
        ← 김선생으로 돌아가기
      </Link>

      <h1 className="mt-6 text-2xl font-bold text-ink">개인정보처리방침</h1>
      <p className="mt-1 text-xs text-muted">최종 수정일: {UPDATED}</p>

      <div className="answer mt-8 space-y-6">
        <section>
          <h2>1. 한눈에 보기</h2>
          <ul>
            <li>이 서비스는 <strong>사용자의 API 키를 서버에 저장하지 않습니다.</strong> 키는 사용자의 브라우저에만 보관됩니다.</li>
            <li>구글 로그인을 하지 않으면 <strong>어떤 정보도 서버에 저장되지 않습니다.</strong> 대화와 업무 목록은 브라우저에만 남습니다.</li>
            <li>구글 로그인을 하면 기기 간 동기화를 위해 대화·업무·설정이 서버에 저장됩니다.</li>
          </ul>
        </section>

        <section>
          <h2>2. 수집하는 정보</h2>
          <h3>가. 구글 로그인 시</h3>
          <ul>
            <li>구글 계정 식별자, 이메일 주소, 이름, 프로필 사진 주소</li>
            <li>수집 목적: 로그인한 사용자를 구분하고, 그 사용자의 데이터를 되찾아 주기 위해서입니다.</li>
            <li>요청하는 권한은 <code>openid</code>, <code>email</code>, <code>profile</code> 뿐입니다. 지메일, 드라이브, 캘린더 등 다른 구글 서비스에는 접근하지 않습니다.</li>
          </ul>

          <h3>나. 동기화 데이터 (로그인한 경우에만)</h3>
          <ul>
            <li>김선생과 주고받은 대화 내용</li>
            <li>업무 체크리스트 항목과 마감일</li>
            <li>이름·친밀도·학교급·담당 학년 등 사용자가 입력한 설정</li>
          </ul>

          <h3>다. 저장하지 않는 정보</h3>
          <ul>
            <li><strong>API 키</strong> (Anthropic, OpenAI, Google, xAI) — 브라우저 로컬 저장소에만 있으며 서버에 기록되지 않습니다. 요청을 중계할 때 메모리에서 한 번 쓰이고 버려집니다.</li>
            <li><strong>MCP 액세스 토큰</strong> — 위와 같습니다.</li>
            <li>결제 정보, 주민등록번호 등 민감정보는 일절 수집하지 않습니다.</li>
          </ul>
        </section>

        <section>
          <h2>3. 제3자 제공</h2>
          <p>
            사용자가 입력한 대화 내용은 사용자가 선택한 AI 사업자(Anthropic, OpenAI, Google, xAI 중
            하나)의 API로 전송되어 답변을 생성합니다. 전송은 사용자 본인의 API 키로 이루어지며, 해당
            사업자의 개인정보처리방침이 함께 적용됩니다. 그 외 어떤 목적으로도 제3자에게 정보를 제공하거나
            판매하지 않습니다.
          </p>
          <blockquote>
            학생·학부모의 실명, 연락처 등 개인정보는 입력하지 마시기 바랍니다. 입력창에도 같은 안내가
            상시 표시됩니다.
          </blockquote>
        </section>

        <section>
          <h2>4. 보관과 파기</h2>
          <ul>
            <li>동기화 데이터는 Upstash(Redis) 클라우드 저장소에 보관됩니다.</li>
            <li>보관 기간은 사용자가 삭제를 요청하거나 계정 사용을 중단할 때까지입니다.</li>
            <li>앱 안에서 대화나 업무를 삭제하면 다음 동기화 시 서버에서도 지워집니다.</li>
            <li>전체 삭제를 원하시면 아래 문의처로 연락 주시면 지체 없이 파기합니다.</li>
          </ul>
        </section>

        <section>
          <h2>5. 이용자의 권리</h2>
          <p>
            사용자는 언제든지 로그아웃하여 동기화를 중단할 수 있고, 자신의 데이터에 대한 열람·정정·삭제를
            요청할 수 있습니다. 브라우저의 사이트 데이터를 지우면 그 기기에 저장된 API 키와 대화가 모두
            삭제됩니다.
          </p>
        </section>

        <section>
          <h2>6. 문의</h2>
          <p>
            개인정보 관련 문의: <a href="mailto:indiafish299@gmail.com">indiafish299@gmail.com</a>
          </p>
        </section>
      </div>
    </main>
  );
}
