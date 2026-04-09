-- KCA 제안전략본부 - Supabase 스키마
-- 구글시트 6개 워크시트를 테이블로 마이그레이션

-- 1. members (팀원)
CREATE TABLE members (
  id TEXT PRIMARY KEY,          -- 로그인 ID
  pw TEXT NOT NULL,             -- 비밀번호
  name TEXT NOT NULL,           -- 이름
  role TEXT NOT NULL DEFAULT '사용자'  -- 관리자/사용자/뷰어
);

-- 기본 관리자 계정
INSERT INTO members (id, pw, name, role) VALUES ('snchoi', '1234', '최성남', '관리자');

-- 2. records (업무현황)
CREATE TABLE records (
  id TEXT PRIMARY KEY,
  date TEXT,                    -- 배정일 (YYYY-MM-DD)
  member TEXT,                  -- 담당자
  leader TEXT,                  -- 총괄
  type TEXT,                    -- 유형 (제안서/발표)
  project TEXT,                 -- 프로젝트명
  client TEXT,                  -- 발주기관
  amount REAL DEFAULT 0,        -- 금액(억)
  status TEXT DEFAULT '진행중',  -- 진행중/수주/실주/취소
  month TEXT,                   -- 월
  "submitDate" TEXT,            -- 제출일
  assistants TEXT,              -- 보조제안 (콤마 구분 문자열 또는 JSON)
  notes TEXT,                   -- 비고
  "groupId" TEXT                -- 복사 연결 그룹 ID
);

-- 3. clients (발주기관)
CREATE TABLE clients (
  name TEXT PRIMARY KEY         -- 기관명
);

-- 4. reviews (제안서 리뷰)
CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  date TEXT,                    -- 날짜
  member TEXT,                  -- 담당자
  type TEXT,                    -- 유형 (Pink/Red/발표)
  author TEXT,                  -- 제안작성자
  leader TEXT,                  -- 총괄
  project TEXT,                 -- 프로젝트명
  client TEXT,                  -- 발주기관
  amount REAL DEFAULT 0,        -- 금액(억)
  month TEXT,                   -- 월
  "groupId" TEXT                -- 복사 연결 그룹 ID
);

-- 5. schedules (일정)
CREATE TABLE schedules (
  id TEXT PRIMARY KEY,
  start TEXT,                   -- 시작일 (YYYY-MM-DD)
  "end" TEXT,                   -- 종료일 (YYYY-MM-DD)
  task TEXT,                    -- 업무내용
  category TEXT,                -- 구분 (감리/휴가/기타)
  author TEXT,                  -- 작성자 이름
  "authorId" TEXT               -- 작성자 ID
);

-- 6. kca_data (KCA 수주금액)
CREATE TABLE kca_data (
  year TEXT PRIMARY KEY,        -- 년도
  amount REAL NOT NULL DEFAULT 0 -- 금액(억)
);

-- RLS (Row Level Security) 비활성화 - anon key로 직접 접근 허용
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE kca_data ENABLE ROW LEVEL SECURITY;

-- 모든 테이블에 anon 사용자 full access 정책 추가
CREATE POLICY "Allow all for anon" ON members FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON records FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON clients FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON reviews FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON schedules FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON kca_data FOR ALL TO anon USING (true) WITH CHECK (true);
