import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "이용약관 — 선배교사 김선생",
  description: "선배교사 김선생 서비스 이용 조건과 책임 범위를 안내합니다.",
};

const UPDATED = "2026년 8월 22일";

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12">
      <Link href="/" className="text-[0.8125rem] text-accent underline underline-offset-2">
        ← 김선생으로 돌아가기
      </Link>

      <h1 className="mt-6 text-2xl font-bold text-ink">이용약관</h1>
      <p className="mt-1 text-xs text-muted">최종 수정일: {UPDATED}</p>

      <div className="answer mt-8 space-y-6">
        <section>
          <h2>1. 서비스 소개</h2>
          <p>
            &lsquo;선배교사 김선생&rsquo;(이하 &ldquo;서비스&rdquo;)은 교사의 문서 작성, 수업 자료 준비,
            생활기록부 문구 작성, 업무 상담을 돕는 AI 대화 도구입니다. 개인이 무료로 운영하며, 광고나
            유료 결제가 없습니다.
          </p>
        </section>

        <section>
          <h2>2. 이용 조건</h2>
          <ul>
            <li>서비스를 쓰려면 사용자 본인의 AI API 키(Anthropic, OpenAI, Google, xAI 중 하나)가 필요합니다.</li>
            <li>
              파일 첨부, 파일 만들기(코드 실행), 웹 페이지 읽기, 외부 도구(MCP) 연결은 Claude 키를 쓸 때만
              동작하며, 사용한 만큼 선생님의 Anthropic 계정에 요금이 부과됩니다.
            </li>
            <li>API 사용료는 해당 사업자가 사용자에게 직접 청구합니다. 서비스 운영자는 이 비용에 관여하지 않습니다.</li>
            <li>구글 로그인은 선택 사항이며, 기기 간 동기화에만 사용됩니다.</li>
          </ul>
        </section>

        <section>
          <h2>3. 사용자의 책임</h2>
          <ul>
            <li>
              <strong>생성된 결과물은 반드시 검토한 뒤 사용해야 합니다.</strong> 공문, 가정통신문,
              생활기록부 문구는 학교 규정과 시도교육청 지침에 맞는지 사용자가 최종 확인할 책임이 있습니다.
            </li>
            <li>
              학생·학부모의 실명, 연락처 등 개인정보를 입력하거나 <strong>파일로 첨부해서는 안 됩니다.</strong>
              명단·성적 파일은 이름 열을 지우거나 번호로 바꾼 뒤 올려 주세요.
            </li>
            <li>
              내 PC 폴더 연결과 파일 저장 기능은 선생님이 고른 폴더 안에서만 동작합니다. 저장 시 같은 이름의
              파일을 덮어쓰지 않고 다른 이름으로 저장하지만, 중요한 원본은 따로 백업해 두시기 바랍니다.
            </li>
            <li>학교폭력, 아동학대 의심 등 법정 절차가 필요한 사안은 이 서비스의 답변으로 갈음할 수 없으며, 반드시 학교의 공식 절차를 따라야 합니다.</li>
            <li>타인의 API 키를 무단으로 사용하거나, 서비스를 불법적인 목적으로 이용해서는 안 됩니다.</li>
          </ul>
        </section>

        <section>
          <h2>4. 면책</h2>
          <p>
            서비스는 &ldquo;있는 그대로&rdquo; 제공됩니다. AI가 생성한 내용의 정확성, 최신성, 법령 적합성을
            보증하지 않으며, 그 내용을 신뢰해 발생한 결과에 대해 운영자는 책임지지 않습니다. 또한 AI
            사업자의 서비스 장애, 요금 정책 변경, 사용자의 API 키 관리 소홀로 인한 손해에 대해서도 책임을
            지지 않습니다.
          </p>
        </section>

        <section>
          <h2>5. 서비스 변경과 중단</h2>
          <p>
            운영자는 사전 고지 없이 기능을 변경하거나 서비스를 중단할 수 있습니다. 중요한 데이터는 앱의
            복사·txt 저장 기능으로 별도 보관하시기를 권합니다.
          </p>
        </section>

        <section>
          <h2>6. 문의</h2>
          <p>
            <a href="mailto:indiafish299@gmail.com">indiafish299@gmail.com</a>
          </p>
        </section>
      </div>
    </main>
  );
}
