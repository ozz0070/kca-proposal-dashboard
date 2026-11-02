# KCA 제안전략본부 - 제안팀 업무현황 관리 시스템

## 프로젝트 개요
감리법인 KCA 제안전략본부 제안팀의 업무현황을 관리하는 웹 앱.
정보시스템 감리(IT systems audit) 제안 업무를 추적하고, 팀 실적을 분석하는 대시보드.

## 기술 스택
- **프론트엔드**: React (Vite) — 사실상 단일 파일 `src/App.jsx` (약 11,000줄)
- **DB**: Supabase (PostgreSQL) — `src/supabaseApi.js`에서 `@supabase/supabase-js`로 직접 접근 (anon key)
- **로컬 폴백**: localStorage (DB 로드 실패 시 자동 전환, 로드 후 모든 데이터를 localStorage에도 자동 저장)
- **호스팅**: Vercel (GitHub 연동 자동 배포)
- **차트**: Recharts
- **아이콘**: Lucide React
- **폰트**: Pretendard (본문), JetBrains Mono (숫자)

## 작업 전 확인 사항
- **로컬이 GitHub보다 뒤처져 있을 수 있음** — GitHub 웹에서 직접 커밋("Update App.jsx")하는 경우가 많음. 작업 전 `git fetch` 후 `origin/main`과 비교하고, 필요하면 fast-forward + `npm install`
- **`dist/`가 저장소에 커밋되어 있음** — 검증용 빌드는 `npx vite build --outDir <임시폴더>`로 해서 `dist/`를 건드리지 않기

## 배포 / 환경 정보
- **Vercel 프로젝트명**: kca-proposal-dashboard-v2
- **GitHub**: ozz0070/kca-proposal-dashboard
- **환경변수** (`.env`, gitignore됨 / `.env.example` 참고): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - 둘 중 하나라도 없으면 Supabase 클라이언트가 null → 모든 DB 함수가 no-op, localStorage만 사용
- **레거시**: 2026-04-09에 Google Sheets(Apps Script)에서 Supabase로 이전. `migrate-to-supabase.html`은 이전용 일회성 도구

## 데이터 구조

### Supabase 테이블 7개
> `supabase-schema.sql`은 최초 마이그레이션 시점 기준이라 **최신이 아님** (`amount_vat`, `id_parent`, `reviews_targets` 테이블 누락). 실제 컬럼은 아래와 코드 기준.

| 테이블 | 컬럼 |
|--------|------|
| members | id, pw, name, role (관리자/사용자/뷰어) |
| records | id, date, member, leader, type, project, client, amount, amount_vat, status, month, submitDate, assistants, notes, groupId, cancelDate |
| clients | name |
| reviews | id, date, member, type, author, leader, project, client, amount, amount_vat, month, groupId, id_parent |
| reviews_targets | id, date, member, is_close, author, leader, project, client, amount, amount_vat, month |
| schedules | id, start, end, task, category, author, authorId |
| kca_data | year, amount |

### 필드 의미 / 변환
- `amount` = **투찰금액(억)**, `amount_vat` = **공고금액(억)** (업무현황 화면 라벨은 "… VAT 포함")
- 실적 통계(`computeStats` 등)의 수주금액은 `amount`(투찰금액) 기준. 리뷰 목록은 `amount_vat`(공고금액) 표시
- `records.assistants`: 앱에서는 배열, DB에는 JSON 문자열 (`recordToRow`/`rowToRecord`에서 변환)
- `reviews_targets.is_close`: 앱에서는 "Y"/"N", DB에는 boolean (`rtRecordToRow`/`rtRowToRecord`에서 변환)
- `reviews_targets.date`: 제출일(YYYY-MM-DD) 또는 문자열 `"사전규격"`
- `records.submitDate`: YYYY-MM-DD 또는 `"사전공고"`
- `reviews.id_parent`: 연결된 리뷰 대상(`reviews_targets.id`). 리뷰 대상 삭제 시 연결된 리뷰도 state에서 제거됨
- 새 레코드 id는 `crypto.randomUUID()`. DB 저장 시 id는 항상 `String(id)`로 변환

### 저장 방식
- records/reviews/reviews_targets/schedules/members: 건별 `upsert*` / `delete*`
- clients/kca_data: 건별 함수와 전체 교체(`saveClients`, `saveKcaData`) 둘 다 존재
- groupId로 연결된 레코드 수정 시 그룹 전체를 `upsertRecords`/`upsertReviews`로 일괄 저장

### 비밀번호 비교 주의사항
과거 구글시트에서 넘어온 숫자형 비밀번호가 number 타입일 수 있음.
로그인/패스워드 변경 시 반드시 `String(m.pw) === pw` 로 비교해야 함.

## 인증 / 권한

### 사용자 유형
- **관리자**: 모든 설정 메뉴 접근, 모든 레코드 수정/삭제, 리뷰 대상 수정
- **사용자**: 설정 > 발주기관만 접근, 본인이 담당자(`record.member`)인 레코드만 수정
- **뷰어**: 보기 전용 — 등록 버튼/설정 메뉴 숨김, 수정 불가, 패스워드 변경 불가, 일정 추가 불가
  - 담당자 드롭다운과 개인별 실적에서 제외 (`activeMemberNames`)

### 기본 관리자 계정
- ID: snchoi / 이름: 최성남 / 유형: 관리자 (PW는 DB에 설정된 값)

### 기능
- 로그인 / 회원가입 (가입 시 기본 유형: 사용자)
- 로그아웃
- 패스워드 변경 (사이드바 하단 사용자 이름 클릭, 뷰어 제외)

## 메뉴 구성 (`NAV_ITEMS`)

### 사이드바
- 상단: "제안전략본부" / "제안팀 업무현황" + 년도 입력 (number input)
- 년도 변경 시 모든 데이터가 해당 년도로 필터링됨 (설정은 년도 무관, 리뷰 대상의 "사전규격"은 항상 표시)
- 하단: 사용자 이름+유형배지+ID, 로그아웃 버튼, 연동 상태 표시

### 1. 대시보드
- KPI 카드 5개: 팀 제안 건수, 평가 완료 건수, 팀 수주 건수, 팀 수주율, 팀 수주금액
- mergeTeamRecords 기반 중복 제거 통계
- KCA 수주금액 0이면 "제안팀 수주비율" 서브텍스트 숨김
- 팀 월별 실적(총계): 현재 날짜 기준 미래 월 숨김

### 2. 업무현황 (`DataEntryView`, `RecordDetail`)
- 검색: 프로젝트명/담당자/발주기관 통합 + 월별 필터 + 상태 필터
- 리스트: 배정일 기준 내림차순, 10건 페이징
- 카드 표시: 배정일 + 발주기관(파란색) + 프로젝트명 / 담당자 · 총괄 · 제출일
- 새 건 등록/수정/상세보기: 2칸 그리드 통일 배치
  - 배정일|담당자 / 유형|총괄 / 상태|취소일 / 발주기관|프로젝트명 / 투찰금액(억) VAT 포함|공고금액(억) VAT 포함 / 제출일 / 보조제안(2칸) / 비고(2칸)
- 유형 "발표" → 총괄에 담당자 이름 자동 입력
- 상태 "취소" 선택 시 취소일 오늘 날짜 자동 입력, 다른 상태로 바꾸면 비움
- 상태가 수주/실주면 총괄·제출일 필수 (제출일 "사전공고" 불가)
- 발주기관: 검색형 텍스트박스(ClientSearchInput), 검색 팝업, 미등록시 설정 이동
- 상태 변경: 상세 헤더에 "수주"/"실주" 버튼
- 복사: 담당자/유형/비고만 편집, 나머지 읽기전용(회색), groupId 연결
- 동기화(SHARED_FIELDS): 총괄, 상태, 발주기관, 프로젝트명, 투찰금액, 공고금액, 제출일
- 필수 입력: required prop으로 빨간 * 표시

### 3. 개인별 실적
- 월 선택 콤보(기본 전체), 총계/제안서/발표 세부 통계, 뷰어 제외

### 4. 팀실적
- mergeTeamRecords 중복 제거, 검색+월필터, 10건 페이징

### 5. 팀 월별 실적
- 총계/제안서/발표 세부, 01~12월+계, KCA 비율 카드(0이면 숨김)

### 6. 리포트
- 인쇄/PDF 대응, 동적 년도, KCA 0이면 해당 라인 숨김

### 7. 제안서 리뷰 대상 (`ReviewTargetView`, `ReviewTargetDetail`)
- 필드: 제출일(날짜 또는 "사전규격" 체크), 담당자, 리뷰 마감(is_close: 진행중/마감), 제안 리더, 총괄, 투찰금액, 공고금액, 발주기관, 프로젝트명
- 필터: 검색 + 월(사전규격 포함) + 마감 여부
- 등록 시 프로젝트명 정규화(공백/-/_ 제거, 소문자) 비교로 중복 확인 팝업
- 수정은 관리자만
- 상세에서 리뷰 등록 → 제안서 리뷰 현황 폼으로 prefill(`id_parent` 연결), 연결된 리뷰 목록 표시

### 8. 제안서 리뷰 현황 (`ReviewView`, `ReviewDetail`)
- 유형: Pink(#F472B6)/Red/발표
- 필수: 날짜, 담당자, 제안 리더(author), 투찰금액, 공고금액, 발주기관, 프로젝트명
- 복사 동기화(REVIEW_SHARED): 제안 리더, 총괄, 발주기관, 프로젝트명, 투찰금액, 공고금액

### 9. 일정
- 달력 **월요일 시작**, 연결 바(기간 가시화)
- 구분: 감리(파랑 #3B82F6) / 휴가(초록 #10B981) / 기타(노랑 #F59E0B)
- 휴가 시 업무내용 비필수, 감리/기타는 필수
- 바 클릭 → 상세 팝업 (본인: 수정/삭제 가능, 타인·뷰어: 보기만)
- 수정: 시작일/종료일/구분/업무내용 변경 가능
- 툴팁: 구분배지 + 업무내용 + 기간 + 작성자

### 설정 (뷰어에게는 숨김)
- **사용자** (관리자만, `TeamMemberListView`): ID/PW/이름/유형(관리자·사용자·뷰어), 검색, CRUD
- **발주기관** (관리자·사용자): 검색+CRUD
- **KCA 감리 수주금액** (관리자만): 년도별 입력/수정/삭제

## 통계 월 기준 (`computeStats` 등)
- 수주/실주 → 제출일(submitDate)의 월
- 진행중 → 현재 월
- 취소 → 취소일(cancelDate)의 월 (없으면 배정일), 개인별/월별 실적 기준
- 그 외 → 배정일(date)의 월

## 디자인 규칙

### 컬러 시스템
```javascript
const NAVY = { 50:"#E8EEF4", 100:"#C5D5E4", 200:"#9DB8CF", 300:"#7499B8", 400:"#5580A5", 500:"#1A3A5C", 600:"#163250", 700:"#112942", 800:"#0D2035", 900:"#081728" };
const ACCENT = { blue:"#3B82F6", green:"#10B981", amber:"#F59E0B", red:"#EF4444", purple:"#8B5CF6", cyan:"#06B6D4" };
```

### 스타일 원칙
- Tailwind 미사용 — 모든 스타일은 inline style로 작성
- KPI 카드: className 사용 불가, inline style만
- borderRadius: 카드=16~20, 버튼=12, 입력필드=12, 배지=20
- 모달: borderRadius=20, padding=32, backdropFilter blur(4px)

### 폰트
- Pretendard: 본문 텍스트
- JetBrains Mono: 숫자, 금액 표시

## React Hooks 규칙
- `useMemo`, `useState` 등 모든 Hooks는 조건부 return 문(로딩/로그인 체크) **앞에** 선언해야 함
- 위반 시 "Minified React error #310" 발생

## 핵심 함수/컴포넌트

### 데이터
- `load*()` (App.jsx 상단) — Supabase 우선, 실패 시 localStorage(`kca-*-v1` 키) 폴백
- `computeStats(records, filterMonth, members)` — 월별/개인별/전체 통계 계산
- `mergeTeamRecords(records)` — 같은 프로젝트명 레코드 병합 (팀실적용)
- `memberNames` — 전체 이름 배열 / `activeMemberNames` — 뷰어 제외 이름 배열

### 공용 컴포넌트
- `Select` — 드롭다운 (required prop 지원)
- `Input` — 텍스트 입력 (required prop 지원)
- `SubmitDateInput` — 제출일 입력 ("사전공고" / 날짜 라디오)
- `ClientSearchInput` — 발주기관 검색 팝업 (미등록 시 설정으로 이동)
- `TagInput` — 보조제안 태그 입력
- `StatusBadge` — 상태(수주/실주/진행중/취소) 배지
- `KPICard` — 대시보드 KPI 카드
- `MasterListView` — 설정용 범용 목록 관리 (발주기관에 사용)
- `TeamMemberListView` — 사용자 관리 (ID/PW/이름/유형)

### 뷰 컴포넌트
- `LoginScreen`, `SignupScreen` — 인증
- `DashboardView` — 대시보드
- `DataEntryView`, `RecordDetail` — 업무현황
- `IndividualStatsView` — 개인별 실적
- `TeamStatsView` — 팀실적
- `MonthlyStatsView` — 팀 월별 실적
- `ReportView` — 리포트
- `ReviewTargetView`, `ReviewTargetDetail` — 제안서 리뷰 대상
- `ReviewView`, `ReviewDetail` — 제안서 리뷰 현황
- `ScheduleView` — 일정
- `KcaSettingsView` — KCA 수주금액 설정

## 코드 수정 시 주의사항

1. **모든 스타일은 inline style** — className/Tailwind 사용 금지
2. **Hooks 순서** — useMemo/useState를 조건부 return 뒤에 놓지 말 것
3. **비밀번호 비교** — `String(m.pw) === pw` 사용
4. **members vs memberNames** — members는 객체 배열, memberNames/activeMemberNames는 이름 문자열 배열. Select에는 이름 배열을 전달
5. **새 컬럼 추가 시** — Supabase 테이블에 컬럼을 먼저 추가해야 함 (없는 컬럼이 포함되면 upsert 전체가 실패). 복사 동기화 대상이면 SHARED_FIELDS/REVIEW_SHARED에도 추가
6. **id는 문자열** — DB 비교/삭제 시 `String(id)` 사용
7. **달력 월요일 시작** — firstDow 계산: `(getDay() + 6) % 7`
8. **같은 라벨이 여러 화면에 중복** — 업무현황/리뷰/리뷰 대상의 등록·수정·상세 폼이 각각 따로 구현되어 있으니, 라벨/필드 변경 시 대상 화면을 grep으로 모두 확인
9. **괄호 균형 확인** — 수정 후 braces/parens/brackets 균형 체크 필수 (빌드로 확인)
