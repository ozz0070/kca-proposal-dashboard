# KCA 제안전략본부 - 제안팀 업무현황 관리 시스템

## 프로젝트 개요
감리법인 KCA 제안전략본부 제안팀의 업무현황을 관리하는 웹 앱.
정보시스템 감리(IT systems audit) 제안 업무를 추적하고, 팀 실적을 분석하는 대시보드.

## 기술 스택
- **프론트엔드**: React (Vite) — 단일 파일 `src/App.jsx` (약 2,800줄)
- **DB**: Google Sheets (Google Apps Script API 경유)
- **로컬 폴백**: localStorage (API 실패 시 자동 전환)
- **호스팅**: Vercel (GitHub 연동 자동 배포)
- **차트**: Recharts
- **아이콘**: Lucide React
- **폰트**: Pretendard (본문), JetBrains Mono (숫자)

## 배포 정보
- **Vercel 프로젝트명**: kca-proposal-dashboard-v2
- **GitHub**: ozz0070/kca-proposal-dashboard
- **구글시트 ID**: 1ep-WXuFE9Gv_9ThIXPRkzY5C8fEK7KPDXkH5S5WS4qo
- **Apps Script 웹앱 URL**: https://script.google.com/macros/s/AKfycbw0Y8YWL-d5O1msLnKA9UMACTfsgXrMd9vs1yFc68VUJr6Z-ySFIa37TsUrVXhK936b/exec

## 데이터 구조

### 구글시트 워크시트 6개
| 워크시트 | 헤더 |
|---------|------|
| members | id, pw, name, role |
| records | id, date, member, leader, type, project, client, amount, status, month, submitDate, assistants, notes, groupId |
| clients | name (146개 공공기관) |
| reviews | id, date, member, type, author, leader, project, client, amount, month, groupId |
| schedules | id, start, end, task, category, author, authorId |
| kca_data | year, amount |

### API 통신 방식
- **읽기**: GET `?action=getMembers` 등
- **쓰기**: GET `?payload={action,data}` (POST는 Apps Script 리다이렉트로 차단되어 GET 방식 사용)
- **저장 방식**: 전체 교체(replaceSheet) — 데이터 변경 시 해당 워크시트 전체를 교체
- **듀얼 모드**: API 성공 시 구글시트 사용, 실패 시 localStorage 폴백

### 비밀번호 비교 주의사항
구글시트에서 숫자형 비밀번호(예: 1234)를 가져오면 number 타입이 됨.
로그인/패스워드 변경 시 반드시 `String(m.pw) === pw` 로 비교해야 함.

## 인증 시스템

### 사용자 유형
- **관리자**: 모든 설정 메뉴 접근 가능
- **사용자**: 설정 > 발주기관만 접근 가능

### 기본 관리자 계정
- ID: snchoi / PW: 구글시트에 설정된 값 / 이름: 최성남 / 유형: 관리자

### 기능
- 로그인 / 회원가입 (가입 시 기본 유형: 사용자)
- 로그아웃
- 패스워드 변경 (사이드바 하단 사용자 이름 클릭)

## 메뉴 구성

### 사이드바
- 상단: "제안전략본부" / "제안팀 업무현황" + 년도 입력 (number input)
- 년도 변경 시 모든 데이터가 해당 년도로 필터링됨 (설정은 년도 무관)
- 하단: 사용자 이름+유형배지+ID, 로그아웃 버튼, 연동 상태 표시

### 1. 대시보드
- KPI 카드 4개: 팀 제안 건수, 팀 수주 건수, 팀 수주율, 팀 수주금액
- mergeTeamRecords 기반 중복 제거 통계
- KCA 수주금액 0이면 "제안팀 수주비율" 서브텍스트 숨김
- 팀 월별 실적(총계): 현재 날짜 기준 미래 월 숨김

### 2. 업무현황
- 검색: 프로젝트명/담당자/발주기관 통합 + 월별 필터
- 리스트: 배정일 기준 내림차순, 10건 페이징
- 카드 표시: 배정일 + 발주기관(파란색) + 프로젝트명 / 담당자 · 총괄 · 제출일
- 새 건 등록/수정/복사: 2칸 그리드 통일 배치
  - 배정일|담당자 / 유형|총괄 / 상태|(빈칸) / 발주기관|프로젝트명 / 금액(억)|제출일 / 보조제안(2칸) / 비고(2칸)
- 유형 "발표" → 총괄에 담당자 이름 자동 입력
- 발주기관: 검색형 텍스트박스(ClientSearchInput), 검색 팝업, 미등록시 설정 이동
- 상태 변경: 상세 헤더에 "수주"/"실주" 버튼
- 복사: 담당자/유형/비고만 편집, 나머지 읽기전용(회색), groupId 연결
- 동기화(SHARED_FIELDS): 총괄, 상태, 발주기관, 프로젝트명, 금액, 제출일
- 필수 입력: required prop으로 빨간 * 표시

### 3. 개인별 실적
- 월 선택 콤보(기본 전체), 총계/제안서/발표 세부 통계

### 4. 팀실적
- mergeTeamRecords 중복 제거, 검색+월필터, 10건 페이징

### 5. 팀 월별 실적
- 총계/제안서/발표 세부, 01~12월+계, KCA 비율 카드(0이면 숨김)

### 6. 리포트
- 인쇄/PDF 대응, 동적 년도, KCA 0이면 해당 라인 숨김

### 7. 제안서 리뷰
- 유형: Pink(#F472B6)/Red/발표
- 필수: 날짜, 담당자, 제안작성자, 금액, 발주기관, 프로젝트명
- 복사 동기화(REVIEW_SHARED): 제안작성자, 총괄, 금액, 발주기관, 프로젝트명

### 8. 일정
- 달력 **월요일 시작**, 연결 바(기간 가시화)
- 구분: 감리(파랑 #3B82F6) / 휴가(초록 #10B981) / 기타(노랑 #F59E0B)
- 휴가 시 업무내용 비필수, 감리/기타는 필수
- 바 클릭 → 상세 팝업 (본인: 수정/삭제 가능, 타인: 보기만)
- 수정: 시작일/종료일/구분/업무내용 변경 가능
- 툴팁: 구분배지 + 업무내용 + 기간 + 작성자

### 설정
- **제안팀 인력** (관리자만): ID/PW/이름/유형(관리자·사용자), 검색, CRUD
- **발주기관** (전체): 검색+CRUD, 146개 기관
- **KCA 수주금액** (관리자만): 년도별 입력/수정/삭제

## 디자인 규칙

### 컬러 시스템
```javascript
const NAVY = { 50:"#F0F4F8", 100:"#D9E2EC", 200:"#BCCCDC", 300:"#9FB3C8", 400:"#7B8794", 500:"#1A3A5C", 600:"#163352", 700:"#102A43", 800:"#0D2137", 900:"#0A1929" };
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
- `useMemo`, `useState` 등 모든 Hooks는 조건부 return 문(로그인 체크) **앞에** 선언해야 함
- 위반 시 "Minified React error #310" 발생

## 핵심 함수/컴포넌트

### 데이터
- `computeStats(records, filterMonth, members)` — 월별/개인별/전체 통계 계산
- `mergeTeamRecords(records)` — 같은 프로젝트명 레코드 병합 (팀실적용)
- `memberNames = members.map(m => m.name)` — 객체 배열에서 이름 배열 추출

### 공용 컴포넌트
- `Select` — 드롭다운 (required prop 지원)
- `Input` — 텍스트 입력 (required prop 지원)
- `ClientSearchInput` — 발주기관 검색 팝업 (미등록 시 설정으로 이동)
- `StatusBadge` — 상태(수주/실주/진행중/취소) 배지
- `KPICard` — 대시보드 KPI 카드
- `MasterListView` — 설정용 범용 목록 관리 (발주기관에 사용)
- `TeamMemberListView` — 제안팀 인력 관리 (ID/PW/이름/유형)

### 뷰 컴포넌트
- `LoginScreen`, `SignupScreen` — 인증
- `DashboardView` — 대시보드
- `DataEntryView`, `RecordDetail` — 업무현황
- `IndividualStatsView` — 개인별 실적
- `TeamStatsView` — 팀실적
- `MonthlyStatsView` — 팀 월별 실적
- `ReportView` — 리포트
- `ReviewView`, `ReviewDetail` — 제안서 리뷰
- `ScheduleView` — 일정
- `KcaSettingsView` — KCA 수주금액 설정

## 코드 수정 시 주의사항

1. **모든 스타일은 inline style** — className/Tailwind 사용 금지
2. **Hooks 순서** — useMemo/useState를 조건부 return 뒤에 놓지 말 것
3. **비밀번호 비교** — `String(m.pw) === pw` 사용 (구글시트 숫자 변환 문제)
4. **members vs memberNames** — members는 객체 배열, memberNames는 이름 문자열 배열. Select에는 memberNames를 전달
5. **POST 불가** — Apps Script 리다이렉트 문제로 모든 쓰기를 GET+payload로 처리
6. **달력 월요일 시작** — firstDow 계산: `(getDay() + 6) % 7`
7. **괄호 균형 확인** — 수정 후 braces/parens/brackets 균형 체크 필수
