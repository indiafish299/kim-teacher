import type { ModeId } from "./agent";

export type FormPreset = {
  id: string;
  label: string;
  mode: ModeId;
  /** Prefilled prompt with [ ] slots the teacher fills in before sending. */
  prompt: string;
};

export const FORM_PRESETS: FormPreset[] = [
  {
    id: "notice-event",
    label: "행사 안내 가정통신문",
    mode: "document",
    prompt:
      "가정통신문을 만들어 주세요.\n- 행사명: [ ]\n- 일시: [ ]\n- 장소: [ ]\n- 대상: [ ]\n- 준비물/비용: [ ]\n- 꼭 넣을 내용: [ ]",
  },
  {
    id: "fieldtrip-plan",
    label: "현장체험학습 계획 기안",
    mode: "document",
    prompt:
      "현장체험학습 계획 기안문을 만들어 주세요. 목적, 방침, 세부 추진 계획, 소요 예산, 안전 대책, 행정 사항, 붙임까지 포함해 주세요.\n- 장소: [ ]\n- 일자: [ ]\n- 대상 학년/인원: [ ]\n- 1인당 경비: [ ]",
  },
  {
    id: "purchase",
    label: "물품 구입 품의",
    mode: "document",
    prompt:
      "물품 구입 품의서를 만들어 주세요. 목적, 필요성, 구입 내역 표(품명·규격·수량·단가·금액), 예산 과목, 행정 사항 순으로요.\n- 구입 물품: [ ]\n- 용도: [ ]\n- 예상 금액: [ ]",
  },
  {
    id: "lecturer",
    label: "강사 섭외 품의",
    mode: "document",
    prompt:
      "외부 강사 섭외 품의서를 만들어 주세요. 강사료 지급 근거와 성범죄 경력 조회 등 필수 확인 사항도 행정 사항에 넣어 주세요.\n- 프로그램명: [ ]\n- 강사: [ ]\n- 일시/차시: [ ]\n- 강사료: [ ]",
  },
  {
    id: "contest",
    label: "교내 대회 개최 계획",
    mode: "document",
    prompt:
      "교내 대회 개최 계획 기안문을 만들어 주세요. 목적, 방침, 운영 계획, 심사 기준, 시상 계획, 소요 예산, 행정 사항 순으로요.\n- 대회명: [ ]\n- 대상: [ ]\n- 일시: [ ]",
  },
  {
    id: "open-class",
    label: "학부모 공개수업 안내",
    mode: "document",
    prompt:
      "학부모 공개수업 안내 가정통신문을 만들어 주세요. 회신 절편도 함께요.\n- 일시: [ ]\n- 교과/단원: [ ]\n- 참관 시 유의사항: [ ]",
  },
  {
    id: "afterschool",
    label: "방과후학교 수강 안내",
    mode: "document",
    prompt:
      "방과후학교 프로그램 수강 신청 안내 가정통신문을 만들어 주세요. 프로그램 표와 신청 방법, 수강료 납부 안내, 회신 절편 포함해 주세요.\n- 운영 기간: [ ]\n- 프로그램 목록: [ ]",
  },
  {
    id: "minutes",
    label: "회의록",
    mode: "document",
    prompt:
      "회의록을 정리해 주세요. 일시·장소·참석자·안건·논의 내용·결정 사항·후속 조치(담당자와 기한 포함) 순으로요.\n- 회의명: [ ]\n- 논의된 내용: [ ]",
  },
  {
    id: "record-behavior",
    label: "행동특성 및 종합의견",
    mode: "record",
    prompt:
      "행동특성 및 종합의견 문구를 3안 만들어 주세요.\n- 학생 특성(관찰된 사례 중심): [ ]\n- 성장한 점: [ ]\n- 분량: [500]자",
  },
  {
    id: "record-subject",
    label: "교과 세특",
    mode: "record",
    prompt:
      "교과 세부능력 및 특기사항 문구를 3안 만들어 주세요.\n- 교과/단원: [ ]\n- 수업에서 관찰된 활동: [ ]\n- 분량: [500]자",
  },
  {
    id: "lesson-plan",
    label: "40분 지도안",
    mode: "lesson",
    prompt:
      "40분 수업 지도안을 만들어 주세요. 도입-전개-정리 시간 배분, 교사 발문, 예상 학생 반응, 준비물, 평가 방법, 보충·심화 활동 포함해 주세요.\n- 학년/교과: [ ]\n- 단원/주제: [ ]\n- 성취기준: [ ]",
  },
  {
    id: "worksheet",
    label: "활동지",
    mode: "lesson",
    prompt:
      "학생이 바로 받아 쓸 수 있는 활동지를 만들어 주세요. 지시문, 문항 번호, 답을 쓸 자리를 갖춰서요.\n- 학년/교과: [ ]\n- 주제: [ ]\n- 문항 수: [ ]",
  },
];
