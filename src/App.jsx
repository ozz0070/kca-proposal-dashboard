import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import * as db from "./supabaseApi.js";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  ChevronDown,
  TrendingUp,
  Award,
  Target,
  Users,
  X,
  Check,
  Printer,
  ArrowUpRight,
  Calendar,
  Building2,
  ChevronRight,
  ArrowLeft,
  Pencil,
  Trash2,
  Settings,
  Copy,
  ClipboardList,
  Search,
  ChevronLeft,
  CheckCircle2,
} from "lucide-react";

// ─── Constants ───
const MONTHS = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
];
const DEFAULT_MEMBERS = [
  { id: "snchoi", pw: "1234", name: "최성남", role: "관리자" },
];
const DEFAULT_CLIENTS = [];
const TYPES = ["제안서", "발표"];
const STATUS_OPTIONS = ["진행중", "수주", "실주", "취소"];
const DEFAULT_KCA_DATA = {};

const NAVY = {
  50: "#E8EEF4",
  100: "#C5D5E4",
  200: "#9DB8CF",
  300: "#7499B8",
  400: "#5580A5",
  500: "#1A3A5C",
  600: "#163250",
  700: "#112942",
  800: "#0D2035",
  900: "#081728",
};
const ACCENT = {
  blue: "#3B82F6",
  green: "#10B981",
  amber: "#F59E0B",
  red: "#EF4444",
  purple: "#8B5CF6",
  cyan: "#06B6D4",
};

// ─── 초기 데이터 ───
const INITIAL_RECORDS = [];

// ─── Utility ───
const fmt = (n) => n?.toFixed?.(2) ?? "0.00";
const pct = (n, d) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : "N/A");
const fmtDate = (d) => (d ? String(d).slice(0, 10) : "");
const fmtDateRange = (s, e) => { const ds = fmtDate(s); const de = fmtDate(e); return ds === de ? ds : `${ds} ~ ${de}`; };

// ─── Supabase DB API ───
let useAPI = false; // DB 연결 성공 여부

// ─── localStorage 헬퍼 (폴백용) ───
function storageGet(key) {
  try {
    const r = localStorage.getItem(key);
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}
function storageSet(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

// ─── Load 함수 (Supabase 우선, 실패 시 localStorage) ───
async function loadRecords() {
  const r = await db.loadRecords();
  if (r && Array.isArray(r)) {
    useAPI = true;
    console.log("[Load] records from Supabase:", r.length, "건");
    return r;
  }
  const s = storageGet("kca-records-v1");
  const result = (s && s.length > 0 ? s : null) || INITIAL_RECORDS;
  console.log("[Load] records from localStorage:", result.length, "건");
  return result;
}
async function loadMembers() {
  const r = await db.loadMembers();
  if (r && Array.isArray(r) && r.length > 0) { useAPI = true; return r; }
  const s = storageGet("kca-members-v1");
  return s && s.length > 0 ? s : DEFAULT_MEMBERS;
}
async function loadClients() {
  const r = await db.loadClients();
  if (r && Array.isArray(r) && r.length > 0) { useAPI = true; return r; }
  const s = storageGet("kca-clients-v1");
  return s && s.length > 0 ? s : DEFAULT_CLIENTS;
}
async function loadKcaTotal() {
  const r = await db.loadKcaData();
  if (r && typeof r === "object" && Object.keys(r).length > 0) { useAPI = true; return r; }
  const s = storageGet("kca-kcadata-v1");
  return s || DEFAULT_KCA_DATA;
}
async function loadReviews() {
  const r = await db.loadReviews();
  if (r && Array.isArray(r)) { useAPI = true; return r; }
  const s = storageGet("kca-reviews-v1");
  return s || [];
}
async function loadSchedules() {
  const r = await db.loadSchedules();
  if (r && Array.isArray(r)) { useAPI = true; return r; }
  const s = storageGet("kca-schedules-v1");
  return s || [];
}

// ─── Stats Computation ───
function computeStats(records, filterMonth, members) {
  const todayMonth = new Date().toISOString().slice(5, 7);
  const getMonth = (r) =>
    r.status === "수주" || r.status === "실주" ? r.submitDate?.slice(5, 7)
    : r.status === "진행중" ? todayMonth
    : r.date?.slice(5, 7);
  const filtered =
    filterMonth === "전체"
      ? records
      : records.filter((r) => getMonth(r) === filterMonth);

  // Monthly stats
  const monthly = MONTHS.map((m) => {
    const mr = records.filter((r) => getMonth(r) === m);
    const ps = mr.filter((r) => r.type === "제안서");
    const pt = mr.filter((r) => r.type === "발표");
    const won = (arr) => arr.filter((r) => r.status === "수주");
    const done = (arr) =>
      arr.filter((r) => r.status === "수주" || r.status === "실주");
    const prog = (arr) => arr.filter((r) => r.status === "진행중");
    const amt = (arr) => arr.reduce((s, r) => s + (r.amount || 0), 0);
    return {
      month: m,
      total: mr.length,
      evalDone: done(mr).length,
      wins: won(mr).length,
      winRate:
        done(mr).length > 0 ? (won(mr).length / done(mr).length) * 100 : null,
      winAmt: amt(won(mr)),
      inProgress: prog(mr).length,
      ps_done: done(ps).length,
      ps_wins: won(ps).length,
      ps_amt: amt(won(ps)),
      ps_prog: prog(ps).length,
      ps_total: ps.length,
      pt_done: done(pt).length,
      pt_wins: won(pt).length,
      pt_amt: amt(won(pt)),
      pt_prog: prog(pt).length,
      pt_total: pt.length,
    };
  });

  // Individual stats
  const individual = members.map((name) => {
    const mr = filtered.filter((r) => r.member === name);
    const ps = mr.filter((r) => r.type === "제안서");
    const pt = mr.filter((r) => r.type === "발표");
    const won = (arr) => arr.filter((r) => r.status === "수주");
    const done = (arr) =>
      arr.filter((r) => r.status === "수주" || r.status === "실주");
    const prog = (arr) => arr.filter((r) => r.status === "진행중");
    const cancel = (arr) => arr.filter((r) => r.status === "취소");
    const amt = (arr) => arr.reduce((s, r) => s + (r.amount || 0), 0);
    return {
      name,
      total: mr.length,
      evalDone: done(mr).length,
      wins: won(mr).length,
      winRate:
        done(mr).length > 0 ? (won(mr).length / done(mr).length) * 100 : null,
      winAmt: amt(won(mr)),
      inProgress: prog(mr).length,
      canceled: cancel(mr).length,
      ps_total: ps.length,
      ps_done: done(ps).length,
      ps_wins: won(ps).length,
      ps_amt: amt(won(ps)),
      ps_prog: prog(ps).length,
      pt_total: pt.length,
      pt_done: done(pt).length,
      pt_wins: won(pt).length,
      pt_amt: amt(won(pt)),
      pt_prog: prog(pt).length,
    };
  });

  // Totals
  const total = filtered.length;
  const totalWon = filtered.filter((r) => r.status === "수주").length;
  const totalDone = filtered.filter(
    (r) => r.status === "수주" || r.status === "실주",
  ).length;
  const totalAmt = filtered
    .filter((r) => r.status === "수주")
    .reduce((s, r) => s + (r.amount || 0), 0);
  const totalInProgress = filtered.filter((r) => r.status === "진행중").length;

  return {
    monthly,
    individual,
    total,
    totalWon,
    totalDone,
    totalAmt,
    totalInProgress,
  };
}

// ─── Components ───
function KPICard({ icon: Icon, label, value, sub, color, delay }) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 16,
        padding: 20,
        transition: "all 0.3s",
        background: `linear-gradient(135deg, ${color}15, ${color}08)`,
        border: `1px solid ${color}20`,
        animationDelay: `${delay}ms`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div>
          <p
            style={{
              color: color + "99",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            {label}
          </p>
          <p
            style={{
              color,
              fontSize: 32,
              fontWeight: 800,
              marginTop: 4,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {value}
          </p>
          {sub && (
            <p style={{ color: color + "88", fontSize: 13, marginTop: 2 }}>
              {sub}
            </p>
          )}
        </div>
        <div
          style={{ background: color + "18", borderRadius: 12, padding: 10 }}
        >
          <Icon size={22} color={color} />
        </div>
      </div>
    </div>
  );
}

function Select({ value, onChange, options, label, style, required }) {
  return (
    <div style={{ position: "relative", ...style }}>
      {label && (
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: NAVY[400],
            display: "block",
            marginBottom: 4,
          }}
        >
          {label}
          {required && <span style={{ color: ACCENT.red }}> *</span>}
        </label>
      )}
      <div style={{ position: "relative" }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 36px 10px 14px",
            borderRadius: 12,
            border: `1.5px solid ${NAVY[100]}`,
            background: "white",
            fontSize: 14,
            color: NAVY[700],
            appearance: "none",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          {options.map((o) => (
            <option
              key={typeof o === "string" ? o : o.value}
              value={typeof o === "string" ? o : o.value}
            >
              {typeof o === "string" ? o : o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          color={NAVY[300]}
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}

function Input({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  style,
}) {
  return (
    <div style={style}>
      <label
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: NAVY[400],
          display: "block",
          marginBottom: 4,
        }}
      >
        {label}
        {required && <span style={{ color: ACCENT.red }}> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: 12,
          border: `1.5px solid ${NAVY[100]}`,
          background: "white",
          fontSize: 14,
          color: NAVY[700],
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function SubmitDateInput({ value, onChange, style, required }) {
  const isPreAnnounce = value === "사전공고";
  const mode = isPreAnnounce || !value ? "사전공고" : "날짜";
  const radioStyle = (active) => ({
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 14px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    background: active ? NAVY[500] + "12" : "transparent",
    color: active ? NAVY[600] : NAVY[300],
    border: `1.5px solid ${active ? NAVY[500] + "30" : NAVY[100]}`,
    transition: "all 0.15s",
  });
  return (
    <div style={style}>
      <label
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: NAVY[400],
          display: "block",
          marginBottom: 4,
        }}
      >
        제출일
        {required && <span style={{ color: ACCENT.red }}> *</span>}
      </label>
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: mode === "날짜" ? 8 : 0,
        }}
      >
        <div
          style={radioStyle(mode === "사전공고")}
          onClick={() => onChange("사전공고")}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              border: `2px solid ${mode === "사전공고" ? NAVY[500] : NAVY[200]}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {mode === "사전공고" && (
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: NAVY[500],
                }}
              />
            )}
          </div>
          사전공고
        </div>
        <div
          style={radioStyle(mode === "날짜")}
          onClick={() => onChange(new Date().toISOString().slice(0, 10))}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              border: `2px solid ${mode === "날짜" ? NAVY[500] : NAVY[200]}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {mode === "날짜" && (
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: NAVY[500],
                }}
              />
            )}
          </div>
          날짜 입력
        </div>
      </div>
      {mode === "날짜" && (
        <input
          type="date"
          value={value === "사전공고" ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 12,
            border: `1.5px solid ${NAVY[100]}`,
            background: "white",
            fontSize: 14,
            color: NAVY[700],
            boxSizing: "border-box",
          }}
        />
      )}
    </div>
  );
}

function ClientSearchInput({
  value,
  onChange,
  clients,
  onNavigateToClients,
  label,
  required,
}) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState("");

  const filtered = searchText.trim()
    ? clients.filter((c) =>
        c.toLowerCase().includes(searchText.trim().toLowerCase()),
      )
    : clients;

  const handleSelect = (c) => {
    onChange(c);
    setShowSearch(false);
    setSearchText("");
  };

  return (
    <div>
      {label && (
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: NAVY[400],
            display: "block",
            marginBottom: 4,
          }}
        >
          {label}
          {required && <span style={{ color: ACCENT.red }}> *</span>}
        </label>
      )}
      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={value || ""}
          readOnly
          placeholder="발주기관 검색"
          style={{
            width: "100%",
            padding: "10px 40px 10px 14px",
            borderRadius: 12,
            border: `1.5px solid ${NAVY[100]}`,
            background: "white",
            fontSize: 14,
            color: NAVY[700],
            boxSizing: "border-box",
            cursor: "pointer",
          }}
          onClick={() => setShowSearch(true)}
        />
        <button
          onClick={() => setShowSearch(true)}
          style={{
            position: "absolute",
            right: 4,
            top: "50%",
            transform: "translateY(-50%)",
            background: NAVY[50],
            border: "none",
            cursor: "pointer",
            padding: "6px 8px",
            borderRadius: 8,
          }}
        >
          <Search size={15} color={NAVY[400]} />
        </button>
      </div>

      {showSearch && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => {
            setShowSearch(false);
            setSearchText("");
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(13,32,53,0.5)",
              backdropFilter: "blur(4px)",
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              background: "white",
              borderRadius: 20,
              padding: 28,
              width: 460,
              maxWidth: "90vw",
              maxHeight: "80vh",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <h4
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: NAVY[700],
                marginBottom: 16,
              }}
            >
              발주기관 검색
            </h4>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="기관명 입력"
                autoFocus
                style={{
                  width: "100%",
                  padding: "10px 14px 10px 38px",
                  borderRadius: 12,
                  border: `1.5px solid ${NAVY[100]}`,
                  fontSize: 14,
                  color: NAVY[700],
                  boxSizing: "border-box",
                }}
              />
              <Search
                size={15}
                color={NAVY[300]}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
              {searchText && (
                <button
                  onClick={() => setSearchText("")}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: NAVY[300],
                    padding: 4,
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div style={{ flex: 1, overflowY: "auto", maxHeight: 300 }}>
              {filtered.length > 0 ? (
                filtered.map((c) => (
                  <button
                    key={c}
                    onClick={() => handleSelect(c)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 14px",
                      border: "none",
                      borderBottom: `1px solid ${NAVY[50]}`,
                      background: value === c ? ACCENT.blue + "10" : "white",
                      cursor: "pointer",
                      fontSize: 14,
                      color: value === c ? ACCENT.blue : NAVY[600],
                      fontWeight: value === c ? 600 : 400,
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      if (value !== c)
                        e.currentTarget.style.background = NAVY[50];
                    }}
                    onMouseLeave={(e) => {
                      if (value !== c)
                        e.currentTarget.style.background = "white";
                    }}
                  >
                    {c}
                  </button>
                ))
              ) : (
                <div style={{ padding: "24px 14px", textAlign: "center" }}>
                  <p
                    style={{ fontSize: 14, color: NAVY[400], marginBottom: 8 }}
                  >
                    검색 결과가 없습니다
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      color: NAVY[500],
                      fontWeight: 600,
                      marginBottom: 16,
                    }}
                  >
                    발주기관을 등록하시겠습니까?
                  </p>
                  <button
                    onClick={() => {
                      setShowSearch(false);
                      setSearchText("");
                      onNavigateToClients();
                    }}
                    style={{
                      padding: "10px 20px",
                      borderRadius: 12,
                      border: "none",
                      background: ACCENT.blue,
                      color: "white",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    발주기관 등록하기
                  </button>
                </div>
              )}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 16,
              }}
            >
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchText("");
                }}
                style={{
                  padding: "8px 20px",
                  borderRadius: 10,
                  border: `1.5px solid ${NAVY[100]}`,
                  background: "white",
                  fontSize: 13,
                  fontWeight: 600,
                  color: NAVY[400],
                  cursor: "pointer",
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TagInput({ label, tags, onChange, placeholder, style }) {
  const [input, setInput] = useState("");
  const handleAdd = () => {
    const name = input.trim();
    if (!name || tags.includes(name)) return;
    onChange([...tags, name]);
    setInput("");
  };
  return (
    <div style={style}>
      <label
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: NAVY[400],
          display: "block",
          marginBottom: 4,
        }}
      >
        {label}
      </label>
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: tags.length > 0 ? 8 : 0,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder || "이름 입력 후 Enter"}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: 10,
            border: `1.5px solid ${NAVY[100]}`,
            background: "white",
            fontSize: 13,
            color: NAVY[700],
            boxSizing: "border-box",
          }}
        />
        <button
          type="button"
          onClick={handleAdd}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: "none",
            background: NAVY[500],
            color: "white",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          추가
        </button>
      </div>
      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {tags.map((t, i) => (
            <span
              key={i}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                borderRadius: 8,
                background: ACCENT.purple + "14",
                color: ACCENT.purple,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {t}
              <span
                onClick={() => onChange(tags.filter((_, j) => j !== i))}
                style={{
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: ACCENT.purple + "25",
                  marginLeft: 2,
                }}
              >
                <X size={10} />
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Dashboard View ───
function DashboardView({ records, kcaData }) {
  const merged = useMemo(() => mergeTeamRecords(records), [records]);
  const primaryYear = useMemo(() => {
    const years = {};
    records.forEach((r) => {
      const y = r.date?.slice(0, 4);
      if (y) years[y] = (years[y] || 0) + 1;
    });
    return (
      Object.entries(years).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      new Date().getFullYear().toString()
    );
  }, [records]);
  const kcaTotal = kcaData[primaryYear] || 0;
  const total = merged.length;
  const totalWon = merged.filter((r) => r.status === "수주").length;
  const totalDone = merged.filter(
    (r) => r.status === "수주" || r.status === "실주",
  ).length;
  const totalAmt = merged
    .filter((r) => r.status === "수주")
    .reduce((s, r) => s + (r.amount || 0), 0);
  const totalInProgress = merged.filter((r) => r.status === "진행중").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
        }}
      >
        <KPICard
          icon={Target}
          label="팀 제안 건수"
          value={total}
          sub={`진행중 ${totalInProgress}건`}
          color={ACCENT.blue}
          delay={0}
        />
        <KPICard
          icon={CheckCircle2}
          label="평가 완료 건수"
          value={totalDone}
          sub={`수주 ${totalWon}건 · 실주 ${totalDone - totalWon}건`}
          color={ACCENT.purple}
          delay={50}
        />
        <KPICard
          icon={Award}
          label="팀 수주 건수"
          value={totalWon}
          sub={`평가완료 ${totalDone}건`}
          color={ACCENT.green}
          delay={100}
        />
        <KPICard
          icon={TrendingUp}
          label="팀 수주율"
          value={pct(totalWon, totalDone)}
          sub="평가완료 기준"
          color={ACCENT.amber}
          delay={200}
        />
        <KPICard
          icon={Building2}
          label="팀 수주금액"
          value={`${fmt(totalAmt)}억`}
          sub={kcaTotal > 0 ? `제안팀 수주비율 ${pct(totalAmt, kcaTotal)}` : ""}
          color={ACCENT.purple}
          delay={300}
        />
      </div>

      {/* 팀 월별 실적 (총계) */}
      {(() => {
        const won = (a) => a.filter((r) => r.status === "수주");
        const done = (a) =>
          a.filter((r) => r.status === "수주" || r.status === "실주");
        const prog = (a) => a.filter((r) => r.status === "진행중");
        const amt = (a) => a.reduce((s, r) => s + (r.amount || 0), 0);
        const todayMonth = new Date().toISOString().slice(5, 7);
        const getMonth = (r) =>
          r.status === "수주" || r.status === "실주" ? r.submitDate?.slice(5, 7)
          : r.status === "진행중" ? todayMonth
          : r.date?.slice(5, 7);
        const rows = MONTHS.map((m) => {
          const mr = merged.filter((r) => getMonth(r) === m);
          return {
            month: m,
            total: mr.length,
            evalDone: done(mr).length,
            wins: won(mr).length,
            winRate:
              done(mr).length > 0
                ? (won(mr).length / done(mr).length) * 100
                : null,
            winAmt: amt(won(mr)),
            inProg: prog(mr).length,
          };
        });
        const totalsRow = {
          month: "계",
          total: merged.length,
          evalDone: totalDone,
          wins: totalWon,
          winRate: totalDone > 0 ? (totalWon / totalDone) * 100 : null,
          winAmt: totalAmt,
          inProg: totalInProgress,
        };
        const hStyle = {
          padding: "8px 10px",
          textAlign: "center",
          fontWeight: 700,
          color: NAVY[600],
          fontSize: 11,
          borderBottom: `2px solid ${NAVY[100]}`,
          background: "white",
          whiteSpace: "nowrap",
        };
        const cStyle = {
          padding: "5px 8px",
          fontSize: 12,
          color: NAVY[500],
          textAlign: "center",
          fontFamily: "'JetBrains Mono', monospace",
          whiteSpace: "nowrap",
        };
        const renderRow = (d, i, isTotal) => (
          <tr
            key={d.month}
            style={{
              background: isTotal
                ? NAVY[50]
                : i % 2 === 0
                  ? "white"
                  : NAVY[50] + "40",
              fontWeight: isTotal ? 700 : 400,
            }}
          >
            <td style={{ ...cStyle, fontWeight: 700, color: NAVY[700] }}>
              {d.month}
            </td>
            <td style={cStyle}>{d.total}</td>
            <td style={cStyle}>{d.evalDone}</td>
            <td
              style={{
                ...cStyle,
                color: d.wins > 0 ? ACCENT.green : undefined,
                fontWeight: d.wins > 0 ? 700 : 400,
              }}
            >
              {d.wins}
            </td>
            <td style={cStyle}>
              {d.winRate !== null ? `${d.winRate.toFixed(1)}%` : "N/A"}
            </td>
            <td style={cStyle}>{fmt(d.winAmt)}</td>
            <td style={cStyle}>{d.inProg}</td>
          </tr>
        );
        const now = new Date();
        const currentYear = now.getFullYear().toString();
        const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
        const visibleRows =
          primaryYear > currentYear
            ? []
            : primaryYear < currentYear
              ? rows
              : rows.filter((d) => d.month <= currentMonth);
        const visibleMerged =
          primaryYear > currentYear
            ? []
            : primaryYear < currentYear
              ? merged
              : merged.filter((r) => { const em = r.status === "수주" || r.status === "실주" ? r.submitDate?.slice(5, 7) : r.date?.slice(5, 7); return em && em <= currentMonth; });
        const vDone = visibleMerged.filter(
          (r) => r.status === "수주" || r.status === "실주",
        ).length;
        const vWon = visibleMerged.filter((r) => r.status === "수주").length;
        const vAmt = visibleMerged
          .filter((r) => r.status === "수주")
          .reduce((s, r) => s + (r.amount || 0), 0);
        const vProg = visibleMerged.filter((r) => r.status === "진행중").length;
        const visibleTotals = {
          month: "계",
          total: visibleMerged.length,
          evalDone: vDone,
          wins: vWon,
          winRate: vDone > 0 ? (vWon / vDone) * 100 : null,
          winAmt: vAmt,
          inProg: vProg,
        };
        return (
          <div
            style={{
              background: "white",
              borderRadius: 16,
              border: `1px solid ${NAVY[50]}`,
              overflow: "auto",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                padding: "14px 16px 0",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <h4 style={{ fontSize: 14, fontWeight: 700, color: NAVY[700] }}>
                팀 월별 실적
              </h4>
              <span style={{ fontSize: 11, color: NAVY[300] }}>총계</span>
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
              }}
            >
              <thead>
                <tr>
                  {[
                    "월",
                    "소계",
                    "평가완료",
                    "수주건수",
                    "수주율",
                    "수주금액(억)",
                    "진행중",
                  ].map((h) => (
                    <th key={h} style={hStyle}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((d, i) => renderRow(d, i, false))}
                {renderRow(visibleTotals, 0, true)}
              </tbody>
            </table>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Work Status View (업무현황) ───
function StatusBadge({ status }) {
  const isWon = status === "수주";
  const isLost = status === "실주";
  const isCanceled = status === "취소";
  const bg =
    status === "진행중"
      ? ACCENT.amber
      : isWon
        ? ACCENT.green
        : isCanceled
          ? NAVY[300]
          : ACCENT.red;
  return (
    <span
      style={{
        padding: "4px 12px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        background: bg + "18",
        color: bg,
      }}
    >
      {status}
    </span>
  );
}

function RecordDetail({
  record,
  onClose,
  onDelete,
  onUpdate,
  members,
  clients,
  onCopy,
  onNavigateToClients,
  currentUser,
}) {
  const canEdit = currentUser?.role !== "뷰어" && (currentUser?.role === "관리자" || currentUser?.name === record.member);
  const [editing, setEditing] = useState(false);
  const toDateStr = (d) => (d ? String(d).slice(0, 10) : "");
  const normalizeRecord = (r) => ({
    ...r,
    date: toDateStr(r.date),
    submitDate: r.submitDate ? String(r.submitDate).slice(0, 10) : "",
    cancelDate: r.cancelDate ? String(r.cancelDate).slice(0, 10) : "",
  });
  const [form, setForm] = useState(normalizeRecord(record));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(null);
  const [statusWarning, setStatusWarning] = useState("");
  const [warning, setWarning] = useState("");

  const tryStatusChange = (newStatus) => {
    if (newStatus === "수주" || newStatus === "실주") {
      const hasLeader = record.leader && record.leader.trim() !== "";
      const hasDate =
        record.submitDate &&
        record.submitDate !== "사전공고" &&
        record.submitDate.trim() !== "";
      const missing = [];
      if (!hasLeader) missing.push("총괄");
      if (!hasDate) missing.push("제출일");
      if (missing.length > 0) {
        setStatusWarning(
          `${newStatus} 변경 시 ${missing.join(", ")}이(가) 필요합니다. 수정 화면에서 입력해주세요.`,
        );
        return;
      }
    }
    setStatusWarning("");
    setShowStatusConfirm(newStatus);
  };

  const handleStatusChange = () => {
    const month = record.date.slice(5, 7);
    const updated = { ...record, status: showStatusConfirm, month };
    if (showStatusConfirm === "취소") {
      updated.cancelDate = new Date().toISOString().slice(0, 10);
    } else if (record.status === "취소") {
      updated.cancelDate = "";
    }
    onUpdate(updated);
    setShowStatusConfirm(null);
  };

  const trySave = () => {
    const missing = [];
    const isWonLost = form.status === "수주" || form.status === "실주";
    if (!form.member) missing.push("담당자");
    if (isWonLost && !form.leader) missing.push("총괄");
    if (!form.client) missing.push("발주기관");
    if (!form.project) missing.push("프로젝트명");
    if (!form.amount && form.amount !== 0) missing.push("금액(억)");
    if (isWonLost && (!form.submitDate || form.submitDate === "사전공고")) missing.push("제출일");
    if (missing.length > 0) {
      setWarning(`${missing.join(", ")}을(를) 입력해주세요.`);
      return;
    }
    setWarning("");
    setShowSaveConfirm(true);
  };

  const handleSave = () => {
    const month = form.date.slice(5, 7);
    onUpdate({ ...form, amount: parseFloat(form.amount) || 0, month });
    setShowSaveConfirm(false);
    setEditing(false);
  };

  const Field = ({ label, children }) => (
    <div style={{ marginBottom: 20 }}>
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: NAVY[300],
          letterSpacing: 1,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </p>
      {children}
    </div>
  );

  const FieldValue = ({ value }) => (
    <p
      style={{
        fontSize: 15,
        fontWeight: 500,
        color: NAVY[700],
        lineHeight: 1.5,
      }}
    >
      {value}
    </p>
  );

  return (
    <div
      style={{
        background: "white",
        borderRadius: 20,
        border: `1px solid ${NAVY[50]}`,
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(13,32,53,0.5)",
              backdropFilter: "blur(4px)",
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              background: "white",
              borderRadius: 20,
              padding: 32,
              width: 400,
              maxWidth: "90vw",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: ACCENT.red + "14",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Trash2 size={22} color={ACCENT.red} />
            </div>
            <h4
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: NAVY[700],
                marginBottom: 8,
              }}
            >
              삭제 확인
            </h4>
            <p
              style={{
                fontSize: 14,
                color: NAVY[400],
                lineHeight: 1.6,
                marginBottom: 6,
              }}
            >
              다음 항목을 삭제하시겠습니까?
            </p>
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: NAVY[600],
                lineHeight: 1.5,
                padding: "10px 14px",
                background: NAVY[50],
                borderRadius: 10,
                marginBottom: 24,
              }}
            >
              {record.project}
            </p>
            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: "10px 24px",
                  borderRadius: 12,
                  border: `1.5px solid ${NAVY[100]}`,
                  background: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  color: NAVY[400],
                  cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                onClick={() => {
                  onDelete(record.id);
                  onClose();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: ACCENT.red,
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Trash2 size={15} /> 삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Confirmation Modal */}
      {showSaveConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowSaveConfirm(false)}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(13,32,53,0.5)",
              backdropFilter: "blur(4px)",
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              background: "white",
              borderRadius: 20,
              padding: 32,
              width: 400,
              maxWidth: "90vw",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: ACCENT.blue + "14",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Check size={22} color={ACCENT.blue} />
            </div>
            <h4
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: NAVY[700],
                marginBottom: 8,
              }}
            >
              저장 확인
            </h4>
            <p
              style={{
                fontSize: 14,
                color: NAVY[400],
                lineHeight: 1.6,
                marginBottom: 6,
              }}
            >
              변경 내용을 저장하시겠습니까?
            </p>
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: NAVY[600],
                lineHeight: 1.5,
                padding: "10px 14px",
                background: NAVY[50],
                borderRadius: 10,
                marginBottom: 24,
              }}
            >
              {form.project}
            </p>
            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setShowSaveConfirm(false)}
                style={{
                  padding: "10px 24px",
                  borderRadius: 12,
                  border: `1.5px solid ${NAVY[100]}`,
                  background: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  color: NAVY[400],
                  cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                onClick={handleSave}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: ACCENT.blue,
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Check size={15} /> 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Confirmation Modal */}
      {showStatusConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowStatusConfirm(null)}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(13,32,53,0.5)",
              backdropFilter: "blur(4px)",
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              background: "white",
              borderRadius: 20,
              padding: 32,
              width: 400,
              maxWidth: "90vw",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background:
                  (showStatusConfirm === "수주"
                    ? ACCENT.green
                    : showStatusConfirm === "실주"
                      ? ACCENT.red
                      : NAVY[300]) + "14",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <StatusBadge status={showStatusConfirm} />
            </div>
            <h4
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: NAVY[700],
                marginBottom: 8,
              }}
            >
              상태 변경
            </h4>
            <p
              style={{
                fontSize: 14,
                color: NAVY[400],
                lineHeight: 1.6,
                marginBottom: 6,
              }}
            >
              상태를{" "}
              <strong style={{ color: NAVY[700] }}>
                "{showStatusConfirm}"
              </strong>
              (으)로 변경하시겠습니까?
            </p>
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: NAVY[600],
                lineHeight: 1.5,
                padding: "10px 14px",
                background: NAVY[50],
                borderRadius: 10,
                marginBottom: 24,
              }}
            >
              {record.project}
            </p>
            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setShowStatusConfirm(null)}
                style={{
                  padding: "10px 24px",
                  borderRadius: 12,
                  border: `1.5px solid ${NAVY[100]}`,
                  background: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  color: NAVY[400],
                  cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                onClick={handleStatusChange}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 24px",
                  borderRadius: 12,
                  border: "none",
                  background:
                    showStatusConfirm === "수주"
                      ? ACCENT.green
                      : showStatusConfirm === "실주"
                        ? ACCENT.red
                        : NAVY[400],
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Check size={15} /> 변경
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${NAVY[700]}, ${NAVY[500]})`,
          padding: "24px 28px",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255,255,255,0.15)",
            border: "none",
            color: "white",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            padding: "6px 14px",
            borderRadius: 8,
            marginBottom: 16,
            backdropFilter: "blur(4px)",
          }}
        >
          <ArrowLeft size={15} /> 목록으로
        </button>
        <h3
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "white",
            lineHeight: 1.4,
            paddingRight: 80,
          }}
        >
          {record.project}
        </h3>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <span
            style={{
              background: "rgba(255,255,255,0.2)",
              padding: "4px 12px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              color: "white",
            }}
          >
            {record.type}
          </span>
          <StatusBadge status={record.status} />
        </div>
        <div
          style={{
            position: "absolute",
            top: 24,
            right: 24,
            display: "flex",
            gap: 8,
          }}
        >
          {canEdit && (
          <button
            onClick={() => setEditing(!editing)}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "white",
              cursor: "pointer",
              padding: 8,
              borderRadius: 8,
              backdropFilter: "blur(4px)",
            }}
          >
            <Pencil size={16} />
          </button>
          )}
          {currentUser?.role !== "뷰어" && <button
            onClick={() => onCopy(record)}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "white",
              cursor: "pointer",
              padding: 8,
              borderRadius: 8,
              backdropFilter: "blur(4px)",
            }}
          >
            <Copy size={16} />
          </button>}
          {canEdit && <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              background: "rgba(239,68,68,0.3)",
              border: "none",
              color: "white",
              cursor: "pointer",
              padding: 8,
              borderRadius: 8,
              backdropFilter: "blur(4px)",
            }}
          >
            <Trash2 size={16} />
          </button>}
        </div>
        {/* Quick Status Change */}
        {canEdit && record.status === "진행중" && <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            marginTop: 16,
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "rgba(255,255,255,0.5)",
              letterSpacing: 1,
              marginBottom: 6,
            }}
          >
            상태 변경
          </p>
          <div style={{ display: "flex", gap: 6 }}>
            {["수주", "실주"]
              .filter((s) => s !== record.status)
              .map((s) => {
                const bg =
                  s === "수주"
                    ? ACCENT.green
                    : s === "실주"
                      ? ACCENT.red
                      : NAVY[300];
                return (
                  <button
                    key={s}
                    onClick={() => tryStatusChange(s)}
                    style={{
                      padding: "5px 14px",
                      borderRadius: 8,
                      border: "none",
                      background: bg,
                      color: "white",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      opacity: 0.9,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "0.9";
                    }}
                  >
                    {s}
                  </button>
                );
              })}
          </div>
        </div>}
        {statusWarning && (
          <div
            style={{
              marginTop: 8,
              padding: "8px 14px",
              borderRadius: 8,
              background: "rgba(239,68,68,0.2)",
              textAlign: "right",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: "white" }}>
              {statusWarning}
            </span>
          </div>
        )}
      </div>

      {/* Detail Body */}
      <div style={{ padding: 28 }}>
        {editing ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <Input
                label="배정일"
                type="date"
                value={form.date}
                onChange={(v) => setForm((p) => ({ ...p, date: v }))}
                required
              />
              <Select
                label="담당자"
                value={form.member}
                onChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    member: v,
                    ...(p.type === "발표" ? { leader: v } : {}),
                  }))
                }
                options={members}
                required
              />
              <Select
                label="유형"
                value={form.type}
                onChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    type: v,
                    ...(v === "발표" ? { leader: p.member } : {}),
                  }))
                }
                options={TYPES}
              />
              <Input
                label="총괄"
                value={form.leader || ""}
                onChange={(v) => setForm((p) => ({ ...p, leader: v }))}
                placeholder="감리 총괄"
                required={form.status === "수주" || form.status === "실주"}
              />
              <Select
                label="상태"
                value={form.status}
                onChange={(v) => setForm((p) => ({
                  ...p,
                  status: v,
                  cancelDate: v === "취소" && !p.cancelDate ? new Date().toISOString().slice(0, 10) : v !== "취소" ? "" : p.cancelDate,
                }))}
                options={STATUS_OPTIONS}
              />
              <Input
                label="취소일"
                type="date"
                value={form.cancelDate || ""}
                onChange={(v) => setForm((p) => ({ ...p, cancelDate: v }))}
              />
              <ClientSearchInput
                label="발주기관"
                value={form.client}
                onChange={(v) => setForm((p) => ({ ...p, client: v }))}
                clients={clients}
                onNavigateToClients={onNavigateToClients}
                required
              />
              <Input
                label="프로젝트명"
                value={form.project}
                onChange={(v) => setForm((p) => ({ ...p, project: v }))}
                required
              />
              <Input
                label="금액(억)"
                type="number"
                value={form.amount}
                onChange={(v) => setForm((p) => ({ ...p, amount: v }))}
                required
              />
              <SubmitDateInput
                value={form.submitDate || "사전공고"}
                onChange={(v) => setForm((p) => ({ ...p, submitDate: v }))}
                required={form.status === "수주" || form.status === "실주"}
              />
              <div style={{ gridColumn: "span 2" }}>
                <TagInput
                  label="보조 제안"
                  tags={form.assistants || []}
                  onChange={(v) => setForm((p) => ({ ...p, assistants: v }))}
                  placeholder="이름 입력 후 Enter"
                />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: NAVY[400],
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  비고
                </label>
                <textarea
                  value={form.notes || ""}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  placeholder="비고 입력"
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: `1.5px solid ${NAVY[100]}`,
                    background: "white",
                    fontSize: 14,
                    color: NAVY[700],
                    boxSizing: "border-box",
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            </div>
            {warning && (
              <div
                style={{
                  gridColumn: "span 2",
                  padding: "10px 16px",
                  borderRadius: 10,
                  background: ACCENT.red + "12",
                  border: `1px solid ${ACCENT.red}30`,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{ fontSize: 13, fontWeight: 600, color: ACCENT.red }}
                >
                  {warning}
                </span>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 24,
              }}
            >
              <button
                onClick={() => {
                  setForm(normalizeRecord(record));
                  setEditing(false);
                  setWarning("");
                }}
                style={{
                  padding: "10px 24px",
                  borderRadius: 12,
                  border: `1.5px solid ${NAVY[100]}`,
                  background: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  color: NAVY[400],
                  cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                onClick={trySave}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: ACCENT.blue,
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Check size={16} /> 저장
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 0,
              }}
            >
              <Field label="배정일">
                <FieldValue value={fmtDate(record.date)} />
              </Field>
              <Field label="담당자">
                <FieldValue value={record.member} />
              </Field>
              <Field label="유형">
                <FieldValue value={record.type} />
              </Field>
              <Field label="총괄">
                <FieldValue value={record.leader || "—"} />
              </Field>
              <Field label="상태">
                <StatusBadge status={record.status} />
              </Field>
              <Field label="취소일">
                <FieldValue value={record.cancelDate ? fmtDate(record.cancelDate) : "—"} />
              </Field>
              <Field label="발주기관">
                <FieldValue value={record.client} />
              </Field>
              <Field label="프로젝트명">
                <FieldValue value={record.project} />
              </Field>
              <Field label="금액(억)">
                <p
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: NAVY[700],
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {fmt(record.amount)}
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: NAVY[400],
                      marginLeft: 4,
                    }}
                  >
                    억
                  </span>
                </p>
              </Field>
              <Field label="제출일">
                <FieldValue value={fmtDate(record.submitDate) || "—"} />
              </Field>
              <div style={{ gridColumn: "span 2", marginBottom: 20 }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: NAVY[300],
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  보조 제안
                </p>
                {record.assistants && record.assistants.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {record.assistants.map((t, i) => (
                      <span
                        key={i}
                        style={{
                          padding: "4px 12px",
                          borderRadius: 8,
                          background: ACCENT.purple + "14",
                          color: ACCENT.purple,
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p
                    style={{ fontSize: 15, fontWeight: 500, color: NAVY[700] }}
                  >
                    —
                  </p>
                )}
              </div>
              <div style={{ gridColumn: "span 2", marginBottom: 20 }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: NAVY[300],
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  비고
                </p>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: NAVY[700],
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {record.notes || "—"}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DataEntryView({
  records,
  onAdd,
  onDelete,
  onUpdate,
  members,
  clients,
  onNavigateToClients,
  currentUser,
}) {
  const empty = {
    date: new Date().toISOString().slice(0, 10),
    member: currentUser?.name || "",
    leader: "",
    type: TYPES[0],
    project: "",
    client: "",
    amount: "",
    status: STATUS_OPTIONS[0],
    submitDate: "사전공고",
    assistants: [],
    notes: "",
    cancelDate: "",
  };
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [formWarning, setFormWarning] = useState("");
  const [page, setPage] = useState(1);
  const [copyMode, setCopyMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState("전체");
  const [filterStatus, setFilterStatus] = useState("전체");

  const selectedRecord = records.find((r) => r.id === selectedId);

  const handleSubmit = () => {
    const missing = [];
    const isWonLost = form.status === "수주" || form.status === "실주";
    if (!form.member) missing.push("담당자");
    if (isWonLost && !form.leader) missing.push("총괄");
    if (!form.client) missing.push("발주기관");
    if (!form.project) missing.push("프로젝트명");
    if (!form.amount && form.amount !== 0) missing.push("금액(억)");
    if (isWonLost && (!form.submitDate || form.submitDate === "사전공고")) missing.push("제출일");
    if (missing.length > 0) {
      setFormWarning(`${missing.join(", ")}을(를) 입력해주세요.`);
      return;
    }
    setFormWarning("");
    const month = form.date.slice(5, 7);
    onAdd({
      ...form,
      amount: parseFloat(form.amount) || 0,
      month,
      id: crypto.randomUUID(),
    });
    setForm(empty);
    setShowForm(false);
    setCopyMode(false);
    setPage(1);
  };

  // ── Detail View ──
  if (selectedRecord) {
    return (
      <div>
        <RecordDetail
          record={selectedRecord}
          onClose={() => setSelectedId(null)}
          onDelete={onDelete}
          onUpdate={(updated) => {
            onUpdate(updated);
            setSelectedId(null);
          }}
          members={members}
          clients={clients}
          onCopy={(rec) => {
            const gid = rec.groupId || `grp-${Date.now()}`;
            if (!rec.groupId) {
              onUpdate({ ...rec, groupId: gid });
            }
            setSelectedId(null);
            setForm({
              ...rec,
              id: undefined,
              member: "",
              type: TYPES[0],
              notes: "",
              groupId: gid,
            });
            setCopyMode(true);
            setShowForm(true);
            setPage(1);
          }}
          onNavigateToClients={onNavigateToClients}
          currentUser={currentUser}
        />
      </div>
    );
  }

  // ── List View ──
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <p style={{ fontSize: 13, color: NAVY[300], marginTop: 2 }}>
            총 {records.length}건 등록
          </p>
        </div>
        {currentUser?.role !== "뷰어" && <button
          onClick={() => setShowForm(!showForm)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            borderRadius: 12,
            border: "none",
            background: NAVY[500],
            color: "white",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {showForm ? <X size={16} /> : <PlusCircle size={16} />}
          {showForm ? "닫기" : "새 건 등록"}
        </button>}
      </div>

      {!showForm && (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="프로젝트명, 담당자, 발주기관 검색"
              style={{
                width: "100%",
                padding: "10px 14px 10px 38px",
                borderRadius: 12,
                border: `1.5px solid ${NAVY[100]}`,
                background: "white",
                fontSize: 14,
                color: NAVY[700],
                boxSizing: "border-box",
              }}
            />
            <svg
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
              }}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={NAVY[300]}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setPage(1);
                }}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: NAVY[300],
                  padding: 4,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <Select
            value={filterMonth}
            onChange={(v) => {
              setFilterMonth(v);
              setPage(1);
            }}
            options={[
              { value: "전체", label: "전체" },
              ...MONTHS.map((m) => ({ value: m, label: `${m}월` })),
            ]}
            style={{ minWidth: 100 }}
          />
          <Select
            value={filterStatus}
            onChange={(v) => {
              setFilterStatus(v);
              setPage(1);
            }}
            options={[
              { value: "전체", label: "전체" },
              ...STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
            ]}
            style={{ minWidth: 100 }}
          />
        </div>
      )}

      {showForm && (
        <div
          style={{
            background: "white",
            borderRadius: 16,
            padding: 24,
            border: `2px solid ${copyMode ? ACCENT.purple : ACCENT.blue}30`,
            boxShadow: `0 4px 20px ${copyMode ? ACCENT.purple : ACCENT.blue}10`,
          }}
        >
          <h4
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: NAVY[700],
              marginBottom: 16,
            }}
          >
            {copyMode ? "복사 등록" : "새 제안 등록"}
          </h4>
          {copyMode && (
            <p
              style={{
                fontSize: 12,
                color: ACCENT.purple,
                fontWeight: 600,
                marginBottom: 12,
              }}
            >
              ※ 담당자, 유형, 비고만 수정 가능합니다
            </p>
          )}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            {copyMode ? (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: NAVY[50],
                  border: `1.5px solid ${NAVY[100]}`,
                }}
              >
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: NAVY[300],
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  배정일
                </label>
                <p style={{ fontSize: 14, color: NAVY[500], fontWeight: 500 }}>
                  {form.date}
                </p>
              </div>
            ) : (
              <Input
                label="배정일"
                type="date"
                value={form.date}
                onChange={(v) => setForm((p) => ({ ...p, date: v }))}
                required
              />
            )}
            <Select
              label="담당자"
              value={form.member}
              onChange={(v) =>
                setForm((p) => ({
                  ...p,
                  member: v,
                  ...(p.type === "발표" ? { leader: v } : {}),
                }))
              }
              options={[
                { value: "", label: "-- 선택 --" },
                ...members.map((m) => ({ value: m, label: m })),
              ]}
              required
            />
            <Select
              label="유형"
              value={form.type}
              onChange={(v) =>
                setForm((p) => ({
                  ...p,
                  type: v,
                  ...(v === "발표" ? { leader: p.member } : {}),
                }))
              }
              options={TYPES}
            />
            {copyMode ? (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: NAVY[50],
                  border: `1.5px solid ${NAVY[100]}`,
                }}
              >
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: NAVY[300],
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  총괄
                </label>
                <p style={{ fontSize: 14, color: NAVY[500], fontWeight: 500 }}>
                  {form.leader || "—"}
                </p>
              </div>
            ) : (
              <Input
                label="총괄"
                value={form.leader}
                onChange={(v) => setForm((p) => ({ ...p, leader: v }))}
                placeholder="감리 총괄"
                required={form.status === "수주" || form.status === "실주"}
              />
            )}
            {copyMode ? (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: NAVY[50],
                  border: `1.5px solid ${NAVY[100]}`,
                }}
              >
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: NAVY[300],
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  상태
                </label>
                <StatusBadge status={form.status} />
              </div>
            ) : (
              <Select
                label="상태"
                value={form.status}
                onChange={(v) => setForm((p) => ({
                  ...p,
                  status: v,
                  cancelDate: v === "취소" && !p.cancelDate ? new Date().toISOString().slice(0, 10) : v !== "취소" ? "" : p.cancelDate,
                }))}
                options={STATUS_OPTIONS}
              />
            )}
            <Input
              label="취소일"
              type="date"
              value={form.cancelDate || ""}
              onChange={(v) => setForm((p) => ({ ...p, cancelDate: v }))}
            />
            {copyMode ? (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: NAVY[50],
                  border: `1.5px solid ${NAVY[100]}`,
                }}
              >
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: NAVY[300],
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  발주기관
                </label>
                <p style={{ fontSize: 14, color: NAVY[500], fontWeight: 500 }}>
                  {form.client}
                </p>
              </div>
            ) : (
              <ClientSearchInput
                label="발주기관"
                value={form.client}
                onChange={(v) => setForm((p) => ({ ...p, client: v }))}
                clients={clients}
                onNavigateToClients={onNavigateToClients}
                required
              />
            )}
            {copyMode ? (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: NAVY[50],
                  border: `1.5px solid ${NAVY[100]}`,
                }}
              >
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: NAVY[300],
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  프로젝트명
                </label>
                <p style={{ fontSize: 14, color: NAVY[500], fontWeight: 500 }}>
                  {form.project}
                </p>
              </div>
            ) : (
              <Input
                label="프로젝트명"
                value={form.project}
                onChange={(v) => setForm((p) => ({ ...p, project: v }))}
                placeholder="사업명 입력"
                required
              />
            )}
            {copyMode ? (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: NAVY[50],
                  border: `1.5px solid ${NAVY[100]}`,
                }}
              >
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: NAVY[300],
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  금액(억)
                </label>
                <p
                  style={{
                    fontSize: 14,
                    color: NAVY[500],
                    fontWeight: 600,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {fmt(form.amount)}
                </p>
              </div>
            ) : (
              <Input
                label="금액(억)"
                type="number"
                value={form.amount}
                onChange={(v) => setForm((p) => ({ ...p, amount: v }))}
                placeholder="0.00"
                required
              />
            )}
            {copyMode ? (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: NAVY[50],
                  border: `1.5px solid ${NAVY[100]}`,
                }}
              >
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: NAVY[300],
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  제출일
                </label>
                <p style={{ fontSize: 14, color: NAVY[500], fontWeight: 500 }}>
                  {form.submitDate || "—"}
                </p>
              </div>
            ) : (
              <SubmitDateInput
                value={form.submitDate}
                onChange={(v) => setForm((p) => ({ ...p, submitDate: v }))}
                required={form.status === "수주" || form.status === "실주"}
              />
            )}
            {copyMode ? (
              <div
                style={{
                  gridColumn: "span 2",
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: NAVY[50],
                  border: `1.5px solid ${NAVY[100]}`,
                }}
              >
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: NAVY[300],
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  보조 제안
                </label>
                {form.assistants && form.assistants.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {form.assistants.map((t, i) => (
                      <span
                        key={i}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 8,
                          background: ACCENT.purple + "14",
                          color: ACCENT.purple,
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 14, color: NAVY[500] }}>—</p>
                )}
              </div>
            ) : (
              <div style={{ gridColumn: "span 2" }}>
                <TagInput
                  label="보조 제안"
                  tags={form.assistants || []}
                  onChange={(v) => setForm((p) => ({ ...p, assistants: v }))}
                  placeholder="이름 입력 후 Enter"
                />
              </div>
            )}
            <div style={{ gridColumn: "span 2" }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: NAVY[400],
                  display: "block",
                  marginBottom: 4,
                }}
              >
                비고
              </label>
              <textarea
                value={form.notes || ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="비고 입력"
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: `1.5px solid ${NAVY[100]}`,
                  background: "white",
                  fontSize: 14,
                  color: NAVY[700],
                  boxSizing: "border-box",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </div>
          </div>
          {formWarning && (
            <div
              style={{
                marginTop: 16,
                padding: "10px 16px",
                borderRadius: 10,
                background: ACCENT.red + "12",
                border: `1px solid ${ACCENT.red}30`,
              }}
            >
              <span
                style={{ fontSize: 13, fontWeight: 600, color: ACCENT.red }}
              >
                {formWarning}
              </span>
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 20,
            }}
          >
            <button
              onClick={() => {
                setForm(empty);
                setShowForm(false);
                setFormWarning("");
                setCopyMode(false);
              }}
              style={{
                padding: "10px 24px",
                borderRadius: 12,
                border: `1.5px solid ${NAVY[100]}`,
                background: "white",
                fontSize: 14,
                fontWeight: 600,
                color: NAVY[400],
                cursor: "pointer",
              }}
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 24px",
                borderRadius: 12,
                border: "none",
                background: ACCENT.blue,
                color: "white",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Check size={16} /> 등록
            </button>
          </div>
        </div>
      )}

      {/* Records as clickable cards with pagination */}
      {!showForm &&
        (() => {
          const PAGE_SIZE = 10;
          const monthFiltered =
            filterMonth === "전체"
              ? records
              : records.filter((r) => r.status === "수주" || r.status === "실주" ? r.submitDate?.slice(5, 7) === filterMonth : r.date?.slice(5, 7) === filterMonth);
          const statusFiltered =
            filterStatus === "전체"
              ? monthFiltered
              : monthFiltered.filter((r) => r.status === filterStatus);
          const term = searchTerm.trim().toLowerCase();
          const filtered = term
            ? statusFiltered.filter(
                (r) =>
                  r.project?.toLowerCase().includes(term) ||
                  r.member?.toLowerCase().includes(term) ||
                  r.client?.toLowerCase().includes(term),
              )
            : statusFiltered;
          const sorted = filtered
            .slice()
            .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
          const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
          const safePage = Math.min(page, totalPages);
          const start = (safePage - 1) * PAGE_SIZE;
          const paged = sorted.slice(start, start + PAGE_SIZE);

          return (
            <>
              {(term || filterMonth !== "전체" || filterStatus !== "전체") && (
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: ACCENT.blue,
                    marginBottom: 4,
                  }}
                >
                  검색결과 {sorted.length}건
                </p>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {paged.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "6px 16px",
                      background: "white",
                      borderRadius: 10,
                      border: `1px solid ${NAVY[50]}`,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = ACCENT.blue + "40";
                      e.currentTarget.style.boxShadow = `0 2px 12px ${ACCENT.blue}12`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = NAVY[50];
                      e.currentTarget.style.boxShadow =
                        "0 1px 3px rgba(0,0,0,0.03)";
                    }}
                  >
                    {/* Type indicator */}
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 6,
                        flexShrink: 0,
                        background:
                          r.type === "제안서"
                            ? ACCENT.blue + "14"
                            : ACCENT.cyan + "14",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: r.type === "제안서" ? ACCENT.blue : ACCENT.cyan,
                        fontSize: 10,
                        fontWeight: 800,
                      }}
                    >
                      {r.type === "제안서" ? "제안" : "발표"}
                    </div>

                    {/* Main info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          overflow: "hidden",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            color: NAVY[300],
                            flexShrink: 0,
                          }}
                        >
                          {fmtDate(r.date)}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: ACCENT.blue,
                            flexShrink: 0,
                          }}
                        >
                          {r.client}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: NAVY[700],
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.project}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0,
                          marginTop: 2,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            color: NAVY[300],
                            minWidth: 60,
                            display: "inline-block",
                          }}
                        >
                          {r.member}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: ACCENT.blue + "99",
                            minWidth: 80,
                            display: "inline-block",
                          }}
                        >
                          {r.leader ? `총괄 ${r.leader}` : ""}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: NAVY[300],
                            display: "inline-block",
                          }}
                        >
                          {r.submitDate === "사전공고" || !r.submitDate
                            ? "사전공고"
                            : `제출일 ${fmtDate(r.submitDate)}`}
                        </span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div
                      style={{
                        textAlign: "right",
                        flexShrink: 0,
                        marginRight: 8,
                      }}
                    >
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: NAVY[600],
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {fmt(r.amount)}
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 500,
                            color: NAVY[300],
                          }}
                        >
                          {" "}
                          억
                        </span>
                      </p>
                    </div>

                    {/* Status + Arrow */}
                    <StatusBadge status={r.status} />
                    <ChevronRight
                      size={16}
                      color={NAVY[200]}
                      style={{ flexShrink: 0 }}
                    />
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 4,
                    marginTop: 20,
                  }}
                >
                  <button
                    onClick={() => setPage(1)}
                    disabled={safePage === 1}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: `1px solid ${NAVY[100]}`,
                      background: "white",
                      fontSize: 12,
                      fontWeight: 600,
                      color: safePage === 1 ? NAVY[200] : NAVY[500],
                      cursor: safePage === 1 ? "default" : "pointer",
                    }}
                  >
                    {"«"}
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: `1px solid ${NAVY[100]}`,
                      background: "white",
                      fontSize: 12,
                      fontWeight: 600,
                      color: safePage === 1 ? NAVY[200] : NAVY[500],
                      cursor: safePage === 1 ? "default" : "pointer",
                    }}
                  >
                    {"‹"}
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 8,
                          border: "none",
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          background: p === safePage ? NAVY[500] : "white",
                          color: p === safePage ? "white" : NAVY[400],
                          minWidth: 36,
                        }}
                      >
                        {p}
                      </button>
                    ),
                  )}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: `1px solid ${NAVY[100]}`,
                      background: "white",
                      fontSize: 12,
                      fontWeight: 600,
                      color: safePage === totalPages ? NAVY[200] : NAVY[500],
                      cursor: safePage === totalPages ? "default" : "pointer",
                    }}
                  >
                    {"›"}
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={safePage === totalPages}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: `1px solid ${NAVY[100]}`,
                      background: "white",
                      fontSize: 12,
                      fontWeight: 600,
                      color: safePage === totalPages ? NAVY[200] : NAVY[500],
                      cursor: safePage === totalPages ? "default" : "pointer",
                    }}
                  >
                    {"»"}
                  </button>
                </div>
              )}
            </>
          );
        })()}
    </div>
  );
}

// ─── Individual Stats View (개인별 실적) ───
function IndividualStatsView({ records, members, selectedYear }) {
  const [filterMonth, setFilterMonth] = useState("전체");

  const data = useMemo(() => {
    const todayMonth = new Date().toISOString().slice(5, 7);
    const getMonth = (r) =>
      r.status === "수주" || r.status === "실주" ? r.submitDate?.slice(5, 7)
      : r.status === "취소" ? r.cancelDate?.slice(5, 7) || r.date?.slice(5, 7)
      : r.status === "진행중" ? todayMonth
      : r.date?.slice(5, 7);
    const filtered =
      filterMonth === "전체"
        ? records
        : records.filter((r) => getMonth(r) === filterMonth);
    return members.map((name) => {
      const mr = filtered.filter((r) => r.member === name);
      const ps = mr.filter((r) => r.type === "제안서");
      const pt = mr.filter((r) => r.type === "발표");
      const won = (a) => a.filter((r) => r.status === "수주");
      const done = (a) =>
        a.filter((r) => r.status === "수주" || r.status === "실주");
      const prog = (a) => a.filter((r) => r.status === "진행중");
      const cancel = (a) => a.filter((r) => r.status === "취소");
      const amt = (a) => a.reduce((s, r) => s + (r.amount || 0), 0);
      return {
        name,
        total: mr.length,
        evalDone: done(mr).length,
        wins: won(mr).length,
        winRate:
          done(mr).length > 0 ? (won(mr).length / done(mr).length) * 100 : null,
        winAmt: amt(won(mr)),
        inProg: prog(mr).length,
        canceled: cancel(mr).length,
        ps_done: done(ps).length,
        ps_wins: won(ps).length,
        ps_rate:
          done(ps).length > 0 ? (won(ps).length / done(ps).length) * 100 : null,
        ps_amt: amt(won(ps)),
        ps_prog: prog(ps).length,
        ps_cancel: cancel(ps).length,
        pt_done: done(pt).length,
        pt_wins: won(pt).length,
        pt_rate:
          done(pt).length > 0 ? (won(pt).length / done(pt).length) * 100 : null,
        pt_amt: amt(won(pt)),
        pt_prog: prog(pt).length,
        pt_cancel: cancel(pt).length,
      };
    });
  }, [records, members, filterMonth]);

  const hStyle = {
    padding: "10px 8px",
    textAlign: "center",
    fontWeight: 700,
    color: NAVY[600],
    fontSize: 11,
    borderBottom: `2px solid ${NAVY[100]}`,
    position: "sticky",
    top: 0,
    background: "white",
    whiteSpace: "nowrap",
  };
  const h2Style = {
    padding: "6px 8px",
    textAlign: "center",
    fontWeight: 600,
    color: NAVY[400],
    fontSize: 11,
    borderBottom: `1px solid ${NAVY[100]}`,
    background: NAVY[50] + "50",
    whiteSpace: "nowrap",
  };
  const cStyle = {
    padding: "7px 8px",
    fontSize: 12,
    color: NAVY[500],
    textAlign: "center",
    fontFamily: "'JetBrains Mono', monospace",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div></div>
        <Select
          value={filterMonth}
          onChange={setFilterMonth}
          options={[
            { value: "전체", label: "전체" },
            ...MONTHS.map((m) => ({ value: m, label: `${m}월` })),
          ]}
          label="월 선택"
          style={{ minWidth: 100 }}
        />
      </div>

      <div
        style={{
          background: "white",
          borderRadius: 16,
          border: `1px solid ${NAVY[50]}`,
          overflow: "auto",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
        >
          <thead>
            <tr>
              <th rowSpan={2} style={hStyle}>
                성명
              </th>
              <th
                colSpan={7}
                style={{
                  ...hStyle,
                  background: ACCENT.blue + "10",
                  color: ACCENT.blue,
                }}
              >
                총계
              </th>
              <th
                colSpan={6}
                style={{
                  ...hStyle,
                  background: ACCENT.green + "10",
                  color: ACCENT.green,
                  borderLeft: `2px solid ${NAVY[100]}`,
                }}
              >
                제안서
              </th>
              <th
                colSpan={6}
                style={{
                  ...hStyle,
                  background: ACCENT.cyan + "10",
                  color: ACCENT.cyan,
                  borderLeft: `2px solid ${NAVY[100]}`,
                }}
              >
                발표
              </th>
            </tr>
            <tr>
              {[
                "소계",
                "평가완료",
                "수주건수",
                "수주율",
                "수주금액(억)",
                "진행중",
                "취소",
              ].map((h) => (
                <th key={"t" + h} style={h2Style}>
                  {h}
                </th>
              ))}
              {["완료", "수주건수", "수주율", "수주금액(억)", "진행중", "취소"].map(
                (h) => (
                  <th
                    key={"p" + h}
                    style={{
                      ...h2Style,
                      borderLeft:
                        h === "완료" ? `2px solid ${NAVY[100]}` : undefined,
                    }}
                  >
                    {h}
                  </th>
                ),
              )}
              {["완료", "수주건수", "수주율", "수주금액(억)", "진행중", "취소"].map(
                (h) => (
                  <th
                    key={"b" + h}
                    style={{
                      ...h2Style,
                      borderLeft:
                        h === "완료" ? `2px solid ${NAVY[100]}` : undefined,
                    }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr
                key={d.name}
                style={{ background: i % 2 === 0 ? "white" : NAVY[50] + "40" }}
              >
                <td
                  style={{
                    padding: "7px 12px",
                    fontSize: 13,
                    fontWeight: 600,
                    color: NAVY[700],
                    whiteSpace: "nowrap",
                  }}
                >
                  {d.name}
                </td>
                <td style={cStyle}>{d.total}</td>
                <td style={cStyle}>{d.evalDone}</td>
                <td
                  style={{
                    ...cStyle,
                    color: d.wins > 0 ? ACCENT.green : undefined,
                    fontWeight: d.wins > 0 ? 700 : 400,
                  }}
                >
                  {d.wins}
                </td>
                <td style={cStyle}>
                  {d.winRate !== null ? `${d.winRate.toFixed(1)}%` : "N/A"}
                </td>
                <td style={cStyle}>{fmt(d.winAmt)}</td>
                <td style={cStyle}>{d.inProg}</td>
                <td style={cStyle}>{d.canceled}</td>
                <td style={{ ...cStyle, borderLeft: `2px solid ${NAVY[100]}` }}>
                  {d.ps_done}
                </td>
                <td style={cStyle}>{d.ps_wins}</td>
                <td style={cStyle}>
                  {d.ps_rate !== null ? `${d.ps_rate.toFixed(1)}%` : "N/A"}
                </td>
                <td style={cStyle}>{fmt(d.ps_amt)}</td>
                <td style={cStyle}>{d.ps_prog}</td>
                <td style={cStyle}>{d.ps_cancel}</td>
                <td style={{ ...cStyle, borderLeft: `2px solid ${NAVY[100]}` }}>
                  {d.pt_done}
                </td>
                <td style={cStyle}>{d.pt_wins}</td>
                <td style={cStyle}>
                  {d.pt_rate !== null ? `${d.pt_rate.toFixed(1)}%` : "N/A"}
                </td>
                <td style={cStyle}>{fmt(d.pt_amt)}</td>
                <td style={cStyle}>{d.pt_prog}</td>
                <td style={cStyle}>{d.pt_cancel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Team Stats View (팀실적) ───
function mergeTeamRecords(records) {
  const map = new Map();
  records.forEach((r) => {
    if (map.has(r.project)) {
      const existing = map.get(r.project);
      if (!existing.types.includes(r.type)) existing.types.push(r.type);
      if (!existing.members.includes(r.member)) existing.members.push(r.member);
      if (r.date < existing.date) existing.date = r.date;
      if (
        r.submitDate &&
        r.submitDate !== "사전공고" &&
        (!existing.submitDate || existing.submitDate === "사전공고")
      )
        existing.submitDate = r.submitDate;
      if (r.status === "수주") existing.status = "수주";
      else if (r.status === "실주" && existing.status !== "수주")
        existing.status = "실주";
      else if (r.status === "취소" && existing.status === "진행중")
        existing.status = "취소";
    } else {
      map.set(r.project, { ...r, types: [r.type], members: [r.member] });
    }
  });
  return Array.from(map.values()).map((r) => ({
    ...r,
    mergedType:
      r.types.includes("제안서") && r.types.includes("발표")
        ? "제안서+발표"
        : r.types[0],
  }));
}

function TeamStatsView({ records, selectedYear }) {
  const [filterMonth, setFilterMonth] = useState("전체");
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const PAGE_SIZE = 10;
  const filtered =
    filterMonth === "전체"
      ? records
      : records.filter((r) =>
          r.status === "수주" || r.status === "실주"
            ? r.submitDate?.slice(0, 7) === `${selectedYear}-${filterMonth}`
            : r.date?.slice(5, 7) === filterMonth
        );
  const merged = useMemo(() => mergeTeamRecords(filtered), [filtered]);
  const term = searchTerm.trim().toLowerCase();
  const searched = term
    ? merged.filter(
        (r) =>
          r.project?.toLowerCase().includes(term) ||
          r.member?.toLowerCase().includes(term) ||
          r.client?.toLowerCase().includes(term) ||
          r.members?.some((m) => m.toLowerCase().includes(term)),
      )
    : merged;
  const sorted = searched.slice().reverse();
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const typeBadge = (type) => {
    if (type === "제안서+발표")
      return { bg: ACCENT.purple + "16", color: ACCENT.purple };
    if (type === "제안서")
      return { bg: ACCENT.blue + "16", color: ACCENT.blue };
    return { bg: ACCENT.cyan + "16", color: ACCENT.cyan };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <p style={{ fontSize: 13, color: NAVY[300], marginTop: 2 }}>
            총 {merged.length}건 (중복 제거)
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="프로젝트명, 담당자, 발주기관 검색"
            style={{
              width: "100%",
              padding: "10px 14px 10px 38px",
              borderRadius: 12,
              border: `1.5px solid ${NAVY[100]}`,
              background: "white",
              fontSize: 14,
              color: NAVY[700],
              boxSizing: "border-box",
            }}
          />
          <svg
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
            }}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={NAVY[300]}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                setPage(1);
              }}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: NAVY[300],
                padding: 4,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <Select
          value={filterMonth}
          onChange={(v) => {
            setFilterMonth(v);
            setPage(1);
          }}
          options={[
            { value: "전체", label: "전체" },
            ...MONTHS.map((m) => ({ value: m, label: `${m}월` })),
          ]}
          style={{ minWidth: 100 }}
        />
      </div>

      {term && (
        <p style={{ fontSize: 12, fontWeight: 600, color: ACCENT.blue }}>
          검색결과 {sorted.length}건
        </p>
      )}

      <div
        style={{
          background: "white",
          borderRadius: 16,
          border: `1px solid ${NAVY[50]}`,
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
        >
          <thead>
            <tr style={{ background: NAVY[50] }}>
              {["사업명", "금액(억)", "유형", "상태", "배정일", "제출일"].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontWeight: 700,
                      color: NAVY[600],
                      fontSize: 12,
                      borderBottom: `2px solid ${NAVY[100]}`,
                    }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {paged.map((r, i) => {
              const tb = typeBadge(r.mergedType);
              return (
                <tr
                  key={r.id}
                  style={{
                    borderBottom: `1px solid ${NAVY[50]}`,
                    background: i % 2 === 0 ? "white" : NAVY[50] + "40",
                  }}
                >
                  <td
                    style={{
                      padding: "8px 12px",
                      fontSize: 13,
                      color: NAVY[700],
                      fontWeight: 500,
                      maxWidth: 300,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.project}
                  </td>
                  <td
                    style={{
                      padding: "8px 12px",
                      fontSize: 13,
                      color: NAVY[500],
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 600,
                    }}
                  >
                    {fmt(r.amount)}
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <span
                      style={{
                        background: tb.bg,
                        color: tb.color,
                        padding: "3px 10px",
                        borderRadius: 6,
                        fontWeight: 600,
                        fontSize: 12,
                      }}
                    >
                      {r.mergedType}
                    </span>
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <StatusBadge status={r.status} />
                  </td>
                  <td
                    style={{
                      padding: "8px 12px",
                      fontSize: 13,
                      color: NAVY[400],
                    }}
                  >
                    {fmtDate(r.date)}
                  </td>
                  <td
                    style={{
                      padding: "8px 12px",
                      fontSize: 13,
                      color: NAVY[400],
                    }}
                  >
                    {fmtDate(r.submitDate) || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 4,
          }}
        >
          <button
            onClick={() => setPage(1)}
            disabled={safePage === 1}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: `1px solid ${NAVY[100]}`,
              background: "white",
              fontSize: 12,
              fontWeight: 600,
              color: safePage === 1 ? NAVY[200] : NAVY[500],
              cursor: safePage === 1 ? "default" : "pointer",
            }}
          >
            {"«"}
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: `1px solid ${NAVY[100]}`,
              background: "white",
              fontSize: 12,
              fontWeight: 600,
              color: safePage === 1 ? NAVY[200] : NAVY[500],
              cursor: safePage === 1 ? "default" : "pointer",
            }}
          >
            {"‹"}
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "none",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                background: p === safePage ? NAVY[500] : "white",
                color: p === safePage ? "white" : NAVY[400],
                minWidth: 36,
              }}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: `1px solid ${NAVY[100]}`,
              background: "white",
              fontSize: 12,
              fontWeight: 600,
              color: safePage === totalPages ? NAVY[200] : NAVY[500],
              cursor: safePage === totalPages ? "default" : "pointer",
            }}
          >
            {"›"}
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={safePage === totalPages}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: `1px solid ${NAVY[100]}`,
              background: "white",
              fontSize: 12,
              fontWeight: 600,
              color: safePage === totalPages ? NAVY[200] : NAVY[500],
              cursor: safePage === totalPages ? "default" : "pointer",
            }}
          >
            {"»"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Monthly Stats View (팀 월별 실적) ───
function MonthlyStatsView({ records, kcaData, selectedYear }) {
  const merged = useMemo(() => mergeTeamRecords(records), [records]);
  const primaryYear = selectedYear || new Date().getFullYear().toString();
  const kcaTotal = kcaData[primaryYear] || 0;

  const monthlyData = useMemo(() => {
    const todayMonth = new Date().toISOString().slice(5, 7);
    const getMonth = (r) =>
      r.status === "수주" || r.status === "실주" ? r.submitDate?.slice(5, 7)
      : r.status === "취소" ? r.cancelDate?.slice(5, 7) || r.date?.slice(5, 7)
      : r.status === "진행중" ? todayMonth
      : r.date?.slice(5, 7);
    const calcStats = (mr, ps, pt) => {
      const won = (a) => a.filter((r) => r.status === "수주");
      const done = (a) =>
        a.filter((r) => r.status === "수주" || r.status === "실주");
      const prog = (a) => a.filter((r) => r.status === "진행중");
      const cancel = (a) => a.filter((r) => r.status === "취소");
      const amt = (a) => a.reduce((s, r) => s + (r.amount || 0), 0);
      return {
        total: mr.length,
        evalDone: done(mr).length,
        wins: won(mr).length,
        winRate:
          done(mr).length > 0 ? (won(mr).length / done(mr).length) * 100 : null,
        winAmt: amt(won(mr)),
        inProg: prog(mr).length,
        canceled: cancel(mr).length,
        ps_done: done(ps).length,
        ps_wins: won(ps).length,
        ps_rate:
          done(ps).length > 0 ? (won(ps).length / done(ps).length) * 100 : null,
        ps_amt: amt(won(ps)),
        ps_prog: prog(ps).length,
        ps_cancel: cancel(ps).length,
        pt_done: done(pt).length,
        pt_wins: won(pt).length,
        pt_rate:
          done(pt).length > 0 ? (won(pt).length / done(pt).length) * 100 : null,
        pt_amt: amt(won(pt)),
        pt_prog: prog(pt).length,
        pt_cancel: cancel(pt).length,
      };
    };
    const rows = MONTHS.map((m) => {
      const mr = merged.filter((r) => getMonth(r) === m);
      const ps = mr.filter((r) => r.mergedType.includes("제안서"));
      const pt = mr.filter((r) => r.mergedType.includes("발표"));
      return { month: m, ...calcStats(mr, ps, pt) };
    });
    const all = merged;
    const ps = all.filter((r) => r.mergedType.includes("제안서"));
    const pt = all.filter((r) => r.mergedType.includes("발표"));
    const totals = { month: "계", ...calcStats(all, ps, pt) };
    return { rows, totals };
  }, [merged]);

  const hStyle = {
    padding: "10px 8px",
    textAlign: "center",
    fontWeight: 700,
    color: NAVY[600],
    fontSize: 11,
    borderBottom: `2px solid ${NAVY[100]}`,
    position: "sticky",
    top: 0,
    background: "white",
    whiteSpace: "nowrap",
  };
  const h2Style = {
    padding: "6px 8px",
    textAlign: "center",
    fontWeight: 600,
    color: NAVY[400],
    fontSize: 11,
    borderBottom: `1px solid ${NAVY[100]}`,
    background: NAVY[50] + "50",
    whiteSpace: "nowrap",
  };
  const cStyle = {
    padding: "7px 8px",
    fontSize: 12,
    color: NAVY[500],
    textAlign: "center",
    fontFamily: "'JetBrains Mono', monospace",
    whiteSpace: "nowrap",
  };
  const totalAmt = monthlyData.totals.winAmt;

  const renderRow = (d, i, isTotal) => (
    <tr
      key={d.month}
      style={{
        background: isTotal
          ? NAVY[50]
          : i % 2 === 0
            ? "white"
            : NAVY[50] + "40",
        fontWeight: isTotal ? 700 : 400,
      }}
    >
      <td style={{ ...cStyle, fontWeight: 700, color: NAVY[700] }}>
        {d.month}
      </td>
      <td style={cStyle}>{d.total}</td>
      <td style={cStyle}>{d.evalDone}</td>
      <td
        style={{
          ...cStyle,
          color: d.wins > 0 ? ACCENT.green : undefined,
          fontWeight: d.wins > 0 ? 700 : 400,
        }}
      >
        {d.wins}
      </td>
      <td style={cStyle}>
        {d.winRate !== null ? `${d.winRate.toFixed(1)}%` : "N/A"}
      </td>
      <td style={cStyle}>{fmt(d.winAmt)}</td>
      <td style={cStyle}>{d.inProg}</td>
      <td style={cStyle}>{d.canceled}</td>
      <td style={{ ...cStyle, borderLeft: `2px solid ${NAVY[100]}` }}>
        {d.ps_done}
      </td>
      <td style={cStyle}>{d.ps_wins}</td>
      <td style={cStyle}>
        {d.ps_rate !== null ? `${d.ps_rate.toFixed(1)}%` : "N/A"}
      </td>
      <td style={cStyle}>{fmt(d.ps_amt)}</td>
      <td style={cStyle}>{d.ps_prog}</td>
      <td style={cStyle}>{d.ps_cancel}</td>
      <td style={{ ...cStyle, borderLeft: `2px solid ${NAVY[100]}` }}>
        {d.pt_done}
      </td>
      <td style={cStyle}>{d.pt_wins}</td>
      <td style={cStyle}>
        {d.pt_rate !== null ? `${d.pt_rate.toFixed(1)}%` : "N/A"}
      </td>
      <td style={cStyle}>{fmt(d.pt_amt)}</td>
      <td style={cStyle}>{d.pt_prog}</td>
      <td style={cStyle}>{d.pt_cancel}</td>
    </tr>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div></div>

      <div
        style={{
          background: "white",
          borderRadius: 16,
          border: `1px solid ${NAVY[50]}`,
          overflow: "auto",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
        >
          <thead>
            <tr>
              <th rowSpan={2} style={hStyle}>
                월
              </th>
              <th
                colSpan={7}
                style={{
                  ...hStyle,
                  background: ACCENT.blue + "10",
                  color: ACCENT.blue,
                }}
              >
                총계
              </th>
              <th
                colSpan={6}
                style={{
                  ...hStyle,
                  background: ACCENT.green + "10",
                  color: ACCENT.green,
                  borderLeft: `2px solid ${NAVY[100]}`,
                }}
              >
                제안서
              </th>
              <th
                colSpan={6}
                style={{
                  ...hStyle,
                  background: ACCENT.cyan + "10",
                  color: ACCENT.cyan,
                  borderLeft: `2px solid ${NAVY[100]}`,
                }}
              >
                발표
              </th>
            </tr>
            <tr>
              {[
                "소계",
                "평가완료",
                "수주건수",
                "수주율",
                "수주금액(억)",
                "진행중",
                "취소",
              ].map((h) => (
                <th key={"t" + h} style={h2Style}>
                  {h}
                </th>
              ))}
              {["완료", "수주건수", "수주율", "수주금액(억)", "진행중", "취소"].map(
                (h) => (
                  <th
                    key={"p" + h}
                    style={{
                      ...h2Style,
                      borderLeft:
                        h === "완료" ? `2px solid ${NAVY[100]}` : undefined,
                    }}
                  >
                    {h}
                  </th>
                ),
              )}
              {["완료", "수주건수", "수주율", "수주금액(억)", "진행중", "취소"].map(
                (h) => (
                  <th
                    key={"b" + h}
                    style={{
                      ...h2Style,
                      borderLeft:
                        h === "완료" ? `2px solid ${NAVY[100]}` : undefined,
                    }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {monthlyData.rows.map((d, i) => renderRow(d, i, false))}
            {renderRow(monthlyData.totals, 0, true)}
          </tbody>
        </table>
      </div>

      {/* KCA 비율 */}
      {kcaTotal > 0 && (
        <div style={{ display: "flex", gap: 16 }}>
          <div
            style={{
              flex: 1,
              background: "white",
              borderRadius: 14,
              padding: "16px 20px",
              border: `1px solid ${NAVY[50]}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: NAVY[500] }}>
              KCA 감리 수주 금액
            </span>
            <span
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: NAVY[700],
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {kcaTotal}
              <span style={{ fontSize: 13, fontWeight: 500, color: NAVY[400] }}>
                {" "}
                억
              </span>
            </span>
          </div>
          <div
            style={{
              flex: 1,
              background: "white",
              borderRadius: 14,
              padding: "16px 20px",
              border: `1px solid ${NAVY[50]}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: NAVY[500] }}>
              제안팀 수주 비율
            </span>
            <span
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: totalAmt > 0 ? ACCENT.green : NAVY[400],
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {((totalAmt / kcaTotal) * 100).toFixed(2)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Report View ───
function ReportView({ stats, records, kcaData, members }) {
  const merged = useMemo(() => mergeTeamRecords(records), [records]);
  const primaryYear = useMemo(() => {
    const years = {};
    records.forEach((r) => {
      const y = r.date?.slice(0, 4);
      if (y) years[y] = (years[y] || 0) + 1;
    });
    return (
      Object.entries(years).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      new Date().getFullYear().toString()
    );
  }, [records]);
  const kcaTotal = kcaData[primaryYear] || 0;
  const total = merged.length;
  const totalWon = merged.filter((r) => r.status === "수주").length;
  const totalDone = merged.filter((r) => r.status === "수주" || r.status === "실주").length;
  const totalAmt = merged.filter((r) => r.status === "수주").reduce((s, r) => s + (r.amount || 0), 0);
  const viewerNames = members ? members.filter((m) => m.role === "뷰어").map((m) => m.name) : [];
  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return (
    <div id="report-area" style={{ maxWidth: 900, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        <button
          onClick={() => window.print?.()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 18px",
            borderRadius: 10,
            border: `1.5px solid ${NAVY[100]}`,
            background: "white",
            fontSize: 13,
            fontWeight: 600,
            color: NAVY[500],
            cursor: "pointer",
          }}
        >
          <Printer size={15} /> 인쇄 / PDF
        </button>
      </div>

      <div
        style={{
          background: "white",
          borderRadius: 20,
          padding: 40,
          border: `1px solid ${NAVY[50]}`,
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}
      >
        {/* Header */}
        <div
          style={{
            borderBottom: `3px solid ${NAVY[500]}`,
            paddingBottom: 24,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 12,
                  color: NAVY[300],
                  fontWeight: 600,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                KCA · 제안전략본부
              </p>
              <h1
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: NAVY[700],
                  lineHeight: 1.2,
                }}
              >
                제안팀 업무현황
              </h1>
              <p style={{ fontSize: 14, color: NAVY[400], marginTop: 6 }}>
                {primaryYear}년 실적 보고서
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 13, color: NAVY[400] }}>보고일: {today}</p>
              {kcaTotal > 0 && (
                <p style={{ fontSize: 13, color: NAVY[400] }}>
                  KCA 감리 수주금액: <strong>{kcaTotal}억</strong>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Summary KPIs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 16,
            marginBottom: 32,
          }}
        >
          {[
            { label: "팀 제안 건수", value: total, unit: "건" },
            { label: "평가완료 건수", value: totalDone, unit: "건" },
            { label: "팀 수주 건수", value: totalWon, unit: "건" },
            {
              label: "팀 수주율",
              value:
                totalDone > 0
                  ? `${((totalWon / totalDone) * 100).toFixed(1)}`
                  : "N/A",
              unit: totalDone > 0 ? "%" : "",
            },
            { label: "팀 수주금액", value: fmt(totalAmt), unit: "억" },
          ].map((k, i) => (
            <div
              key={i}
              style={{
                textAlign: "center",
                padding: 20,
                background: NAVY[50] + "80",
                borderRadius: 12,
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  color: NAVY[400],
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                {k.label}
              </p>
              <p
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: NAVY[700],
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {k.value}
                <span style={{ fontSize: 14, fontWeight: 500 }}>{k.unit}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Individual Table */}
        <h3
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: NAVY[700],
            marginBottom: 12,
            paddingLeft: 4,
          }}
        >
          개인별 실적
        </h3>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
            marginBottom: 32,
          }}
        >
          {(() => {
            const indivData = stats.individual.filter((m) => !viewerNames.includes(m.name));
            const hasCancel = indivData.some((m) => m.canceled > 0);
            return (<>
          <thead>
            <tr>
              <th style={rthStyle}>성명</th>
              <th style={rthStyle}>소계</th>
              <th style={rthStyle}>평가완료</th>
              <th style={rthStyle}>수주</th>
              <th style={rthStyle}>수주율</th>
              <th style={rthStyle}>수주금액(억)</th>
              <th style={rthStyle}>진행중</th>
              {hasCancel && <th style={rthStyle}>취소</th>}
            </tr>
          </thead>
          <tbody>
            {indivData.map((m, i) => (
              <tr
                key={m.name}
                style={{ background: i % 2 === 0 ? "white" : NAVY[50] + "50" }}
              >
                <td style={rtdStyle}>{m.name}</td>
                <td style={{ ...rtdStyle, textAlign: "center" }}>{m.total}</td>
                <td style={{ ...rtdStyle, textAlign: "center" }}>
                  {m.evalDone}
                </td>
                <td
                  style={{
                    ...rtdStyle,
                    textAlign: "center",
                    fontWeight: m.wins > 0 ? 700 : 400,
                    color: m.wins > 0 ? ACCENT.green : undefined,
                  }}
                >
                  {m.wins}
                </td>
                <td style={{ ...rtdStyle, textAlign: "center" }}>
                  {m.winRate !== null ? `${m.winRate.toFixed(1)}%` : "N/A"}
                </td>
                <td
                  style={{
                    ...rtdStyle,
                    textAlign: "center",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {fmt(m.winAmt)}
                </td>
                <td style={{ ...rtdStyle, textAlign: "center" }}>
                  {m.inProgress}
                </td>
                {hasCancel && <td style={{ ...rtdStyle, textAlign: "center" }}>{m.canceled}</td>}
              </tr>
            ))}
          </tbody>
            </>);
          })()}
        </table>

        {/* Recent Projects */}
        <h3
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: NAVY[700],
            marginBottom: 12,
            paddingLeft: 4,
          }}
        >
          진행중 프로젝트
        </h3>
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
        >
          <thead>
            <tr>
              {["프로젝트명", "발주기관", "담당자", "유형", "금액(억)"].map(
                (h) => (
                  <th key={h} style={rthStyle}>
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {records
              .filter((r) => r.status === "진행중")
              .map((r, i) => (
                <tr
                  key={r.id}
                  style={{
                    background: i % 2 === 0 ? "white" : NAVY[50] + "50",
                  }}
                >
                  <td style={rtdStyle}>{r.project}</td>
                  <td style={rtdStyle}>{r.client}</td>
                  <td style={rtdStyle}>{r.member}</td>
                  <td style={rtdStyle}>{r.type}</td>
                  <td
                    style={{
                      ...rtdStyle,
                      textAlign: "center",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {fmt(r.amount)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {/* Footer */}
        <div
          style={{
            marginTop: 40,
            paddingTop: 16,
            borderTop: `2px solid ${NAVY[100]}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <p style={{ fontSize: 11, color: NAVY[300] }}>
            © {primaryYear} KCA 제안전략본부 · 제안팀
          </p>
          <p style={{ fontSize: 11, color: NAVY[300] }}>Confidential</p>
        </div>
      </div>
    </div>
  );
}

// ─── Master List View (재사용 가능한 목록 관리) ───
function MasterListView({
  items,
  onUpdate,
  title,
  unit,
  placeholder,
  deleteLabel,
}) {
  const [editIdx, setEditIdx] = useState(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const PAGE_SIZE = 10;
  const term = searchTerm.trim().toLowerCase();
  const filteredItems = term
    ? items
        .map((name, idx) => ({ name, idx }))
        .filter((o) => o.name.toLowerCase().includes(term))
    : items.map((name, idx) => ({ name, idx }));
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const paged = filteredItems.slice(start, start + PAGE_SIZE);

  const handleAdd = () => {
    if (!newName.trim() || items.includes(newName.trim())) return;
    onUpdate([...items, newName.trim()]);
    setNewName("");
    setPage(Math.ceil((items.length + 1) / PAGE_SIZE));
  };

  const handleEditSave = (idx) => {
    if (!editName.trim()) return;
    const updated = [...items];
    updated[idx] = editName.trim();
    onUpdate(updated);
    setEditIdx(null);
    setEditName("");
  };

  const handleDelete = (idx) => {
    onUpdate(items.filter((_, i) => i !== idx));
    setShowDeleteConfirm(null);
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: NAVY[700] }}>
            {title}
          </h3>
          <p style={{ fontSize: 13, color: NAVY[300], marginTop: 2 }}>
            총 {items.length}
            {unit}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder={`${title} 검색`}
            style={{
              width: "100%",
              padding: "10px 14px 10px 38px",
              borderRadius: 12,
              border: `1.5px solid ${NAVY[100]}`,
              background: "white",
              fontSize: 14,
              color: NAVY[700],
              boxSizing: "border-box",
            }}
          />
          <Search
            size={15}
            color={NAVY[300]}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                setPage(1);
              }}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: NAVY[300],
                padding: 4,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {term && (
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: ACCENT.blue,
            marginBottom: 8,
          }}
        >
          검색결과 {filteredItems.length}건
        </p>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 12,
            border: `1.5px solid ${NAVY[100]}`,
            background: "white",
            fontSize: 14,
            color: NAVY[700],
          }}
        />
        <button
          onClick={handleAdd}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 20px",
            borderRadius: 12,
            border: "none",
            background: NAVY[500],
            color: "white",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <PlusCircle size={16} /> 추가
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {paged.map((item) => {
          const idx = item.idx;
          const name = item.name;
          return (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                background: "white",
                borderRadius: 12,
                border: `1px solid ${NAVY[50]}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: NAVY[500] + "12",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: NAVY[500],
                  flexShrink: 0,
                }}
              >
                {idx + 1}
              </span>
              {editIdx === idx ? (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleEditSave(idx)}
                    style={{
                      flex: 1,
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: `1.5px solid ${ACCENT.blue}`,
                      fontSize: 14,
                      color: NAVY[700],
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={() => handleEditSave(idx)}
                    style={{
                      background: ACCENT.blue,
                      border: "none",
                      color: "white",
                      cursor: "pointer",
                      padding: "6px 12px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    저장
                  </button>
                  <button
                    onClick={() => setEditIdx(null)}
                    style={{
                      background: "none",
                      border: `1px solid ${NAVY[100]}`,
                      color: NAVY[400],
                      cursor: "pointer",
                      padding: "6px 12px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    취소
                  </button>
                </>
              ) : (
                <>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 15,
                      fontWeight: 500,
                      color: NAVY[700],
                    }}
                  >
                    {name}
                  </span>
                  <button
                    onClick={() => {
                      setEditIdx(idx);
                      setEditName(name);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: NAVY[300],
                      padding: 4,
                      borderRadius: 6,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = ACCENT.blue)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = NAVY[300])
                    }
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(idx)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: NAVY[300],
                      padding: 4,
                      borderRadius: 6,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = ACCENT.red)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = NAVY[300])
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 4,
            marginTop: 20,
          }}
        >
          <button
            onClick={() => setPage(1)}
            disabled={safePage === 1}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: `1px solid ${NAVY[100]}`,
              background: "white",
              fontSize: 12,
              fontWeight: 600,
              color: safePage === 1 ? NAVY[200] : NAVY[500],
              cursor: safePage === 1 ? "default" : "pointer",
            }}
          >
            {"«"}
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: `1px solid ${NAVY[100]}`,
              background: "white",
              fontSize: 12,
              fontWeight: 600,
              color: safePage === 1 ? NAVY[200] : NAVY[500],
              cursor: safePage === 1 ? "default" : "pointer",
            }}
          >
            {"‹"}
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "none",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                background: p === safePage ? NAVY[500] : "white",
                color: p === safePage ? "white" : NAVY[400],
                minWidth: 36,
              }}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: `1px solid ${NAVY[100]}`,
              background: "white",
              fontSize: 12,
              fontWeight: 600,
              color: safePage === totalPages ? NAVY[200] : NAVY[500],
              cursor: safePage === totalPages ? "default" : "pointer",
            }}
          >
            {"›"}
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={safePage === totalPages}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: `1px solid ${NAVY[100]}`,
              background: "white",
              fontSize: 12,
              fontWeight: 600,
              color: safePage === totalPages ? NAVY[200] : NAVY[500],
              cursor: safePage === totalPages ? "default" : "pointer",
            }}
          >
            {"»"}
          </button>
        </div>
      )}

      {showDeleteConfirm !== null && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(13,32,53,0.5)",
              backdropFilter: "blur(4px)",
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              background: "white",
              borderRadius: 20,
              padding: 32,
              width: 380,
              maxWidth: "90vw",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: ACCENT.red + "14",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Trash2 size={22} color={ACCENT.red} />
            </div>
            <h4
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: NAVY[700],
                marginBottom: 8,
              }}
            >
              {deleteLabel}
            </h4>
            <p
              style={{
                fontSize: 14,
                color: NAVY[400],
                lineHeight: 1.6,
                marginBottom: 6,
              }}
            >
              삭제하시겠습니까?
            </p>
            <p
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: NAVY[700],
                padding: "10px 14px",
                background: NAVY[50],
                borderRadius: 10,
                marginBottom: 24,
              }}
            >
              {items[showDeleteConfirm]}
            </p>
            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setShowDeleteConfirm(null)}
                style={{
                  padding: "10px 24px",
                  borderRadius: 12,
                  border: `1.5px solid ${NAVY[100]}`,
                  background: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  color: NAVY[400],
                  cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: ACCENT.red,
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Trash2 size={15} /> 삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Review Detail ───
const REVIEW_TYPES = ["Pink", "Red", "발표"];

function ReviewDetail({
  record,
  onClose,
  onDelete,
  onUpdate,
  members,
  clients,
  onCopy,
  currentUser,
  onNavigateToClients,
}) {
  const canEdit = currentUser?.role !== "뷰어" && (currentUser?.role === "관리자" || currentUser?.name === record.member);
  const [editing, setEditing] = useState(false);
  const toDateStr = (d) => (d ? String(d).slice(0, 10) : "");
  const normalizeRecord = (r) => ({ ...r, date: toDateStr(r.date) });
  const [form, setForm] = useState(normalizeRecord(record));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [warning, setWarning] = useState("");

  const trySave = () => {
    const missing = [];
    if (!form.date) missing.push("날짜");
    if (!form.member) missing.push("담당자");
    if (!form.author || !form.author.trim()) missing.push("제안 작성자");
    if (!form.amount && form.amount !== 0) missing.push("금액(억)");
    if (!form.client) missing.push("발주기관");
    if (!form.project) missing.push("프로젝트명");
    if (missing.length > 0) {
      setWarning(`${missing.join(", ")}을(를) 입력해주세요.`);
      return;
    }
    setWarning("");
    setShowSaveConfirm(true);
  };

  const handleSave = () => {
    const month = form.date.slice(5, 7);
    onUpdate({ ...form, amount: parseFloat(form.amount) || 0, month });
    setShowSaveConfirm(false);
    setEditing(false);
  };

  const Field = ({ label, children }) => (
    <div style={{ marginBottom: 20 }}>
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: NAVY[300],
          letterSpacing: 1,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </p>
      {children}
    </div>
  );
  const FieldValue = ({ value }) => (
    <p
      style={{
        fontSize: 15,
        fontWeight: 500,
        color: NAVY[700],
        lineHeight: 1.5,
      }}
    >
      {value}
    </p>
  );
  const reviewColor =
    record.type === "Pink"
      ? "#F472B6"
      : record.type === "Red"
        ? ACCENT.red
        : ACCENT.cyan;

  return (
    <div
      style={{
        background: "white",
        borderRadius: 20,
        border: `1px solid ${NAVY[50]}`,
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {showDeleteConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(13,32,53,0.5)",
              backdropFilter: "blur(4px)",
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              background: "white",
              borderRadius: 20,
              padding: 32,
              width: 400,
              maxWidth: "90vw",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <h4
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: NAVY[700],
                marginBottom: 8,
              }}
            >
              삭제 확인
            </h4>
            <p style={{ fontSize: 14, color: NAVY[400], marginBottom: 24 }}>
              이 리뷰를 삭제하시겠습니까?
            </p>
            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: "10px 24px",
                  borderRadius: 12,
                  border: `1.5px solid ${NAVY[100]}`,
                  background: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  color: NAVY[400],
                  cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                onClick={() => {
                  onDelete(record.id);
                  setShowDeleteConfirm(false);
                }}
                style={{
                  padding: "10px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: ACCENT.red,
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
      {showSaveConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowSaveConfirm(false)}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(13,32,53,0.5)",
              backdropFilter: "blur(4px)",
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              background: "white",
              borderRadius: 20,
              padding: 32,
              width: 400,
              maxWidth: "90vw",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <h4
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: NAVY[700],
                marginBottom: 8,
              }}
            >
              저장 확인
            </h4>
            <p style={{ fontSize: 14, color: NAVY[400], marginBottom: 24 }}>
              변경 사항을 저장하시겠습니까?
            </p>
            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setShowSaveConfirm(false)}
                style={{
                  padding: "10px 24px",
                  borderRadius: 12,
                  border: `1.5px solid ${NAVY[100]}`,
                  background: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  color: NAVY[400],
                  cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                onClick={handleSave}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: ACCENT.blue,
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Check size={16} /> 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${NAVY[700]}, ${NAVY[600]})`,
          padding: "24px 28px",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255,255,255,0.15)",
            border: "none",
            color: "white",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            padding: "6px 14px",
            borderRadius: 8,
            marginBottom: 16,
            backdropFilter: "blur(4px)",
          }}
        >
          <ArrowLeft size={15} /> 목록으로
        </button>
        <h3
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "white",
            lineHeight: 1.4,
            paddingRight: 80,
          }}
        >
          {record.project}
        </h3>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <span
            style={{
              background: reviewColor + "30",
              padding: "4px 12px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              color: "white",
            }}
          >
            {record.type}
          </span>
        </div>
        <div
          style={{
            position: "absolute",
            top: 24,
            right: 24,
            display: "flex",
            gap: 8,
          }}
        >
          {canEdit && (
          <button
            onClick={() => setEditing(!editing)}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "white",
              cursor: "pointer",
              padding: 8,
              borderRadius: 8,
            }}
          >
            <Pencil size={16} />
          </button>
          )}
          {currentUser?.role !== "뷰어" && <button
            onClick={() => onCopy(record)}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "white",
              cursor: "pointer",
              padding: 8,
              borderRadius: 8,
            }}
          >
            <Copy size={16} />
          </button>}
          {canEdit && <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              background: "rgba(239,68,68,0.3)",
              border: "none",
              color: "white",
              cursor: "pointer",
              padding: 8,
              borderRadius: 8,
            }}
          >
            <Trash2 size={16} />
          </button>}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: 28 }}>
        {editing ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 16,
              }}
            >
              <Input
                label="날짜"
                required
                type="date"
                value={form.date}
                onChange={(v) => setForm((p) => ({ ...p, date: v }))}
                required
              />
              <Select
                label="담당자"
                required
                value={form.member}
                onChange={(v) => setForm((p) => ({ ...p, member: v }))}
                options={members}
              />
              <Select
                label="유형"
                value={form.type}
                onChange={(v) => setForm((p) => ({ ...p, type: v }))}
                options={REVIEW_TYPES}
              />
              <Input
                label="제안 작성자"
                required
                value={form.author || ""}
                onChange={(v) => setForm((p) => ({ ...p, author: v }))}
                placeholder="작성자 입력"
              />
              <Input
                label="총괄"
                value={form.leader || ""}
                onChange={(v) => setForm((p) => ({ ...p, leader: v }))}
                placeholder="감리 총괄"
              />
              <Input
                label="금액(억)"
                required
                type="number"
                value={form.amount}
                onChange={(v) => setForm((p) => ({ ...p, amount: v }))}
              />
              <ClientSearchInput
                label="발주기관"
                required
                value={form.client}
                onChange={(v) => setForm((p) => ({ ...p, client: v }))}
                clients={clients}
                onNavigateToClients={onNavigateToClients}
              />
              <Input
                label="프로젝트명"
                required
                value={form.project}
                onChange={(v) => setForm((p) => ({ ...p, project: v }))}
                required
                style={{ gridColumn: "span 2" }}
              />
            </div>
            {warning && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 16px",
                  borderRadius: 10,
                  background: ACCENT.red + "12",
                  border: `1px solid ${ACCENT.red}30`,
                }}
              >
                <span
                  style={{ fontSize: 13, fontWeight: 600, color: ACCENT.red }}
                >
                  {warning}
                </span>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 24,
              }}
            >
              <button
                onClick={() => {
                  setForm(normalizeRecord(record));
                  setEditing(false);
                  setWarning("");
                }}
                style={{
                  padding: "10px 24px",
                  borderRadius: 12,
                  border: `1.5px solid ${NAVY[100]}`,
                  background: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  color: NAVY[400],
                  cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                onClick={trySave}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: ACCENT.blue,
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Check size={16} /> 저장
              </button>
            </div>
          </>
        ) : (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}
          >
            <Field label="날짜">
              <FieldValue value={fmtDate(record.date)} />
            </Field>
            <Field label="담당자">
              <FieldValue value={record.member} />
            </Field>
            <Field label="유형">
              <FieldValue value={record.type} />
            </Field>
            <Field label="제안 작성자">
              <FieldValue value={record.author || "—"} />
            </Field>
            <Field label="총괄">
              <FieldValue value={record.leader || "—"} />
            </Field>
            <Field label="금액(억)">
              <p
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: NAVY[700],
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {fmt(record.amount)}
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: NAVY[400],
                    marginLeft: 4,
                  }}
                >
                  억
                </span>
              </p>
            </Field>
            <Field label="발주기관">
              <FieldValue value={record.client} />
            </Field>
            <div style={{ gridColumn: "span 2", marginBottom: 20 }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: NAVY[300],
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                프로젝트명
              </p>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: NAVY[700],
                  lineHeight: 1.5,
                }}
              >
                {record.project}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Review View (제안서 리뷰) ───
function ReviewView({ records, onAdd, onDelete, onUpdate, members, clients, currentUser, onNavigateToClients }) {
  const empty = {
    date: new Date().toISOString().slice(0, 10),
    member: currentUser?.name || "",
    type: REVIEW_TYPES[0],
    author: "",
    leader: "",
    project: "",
    client: "",
    amount: "",
  };
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [formWarning, setFormWarning] = useState("");
  const [page, setPage] = useState(1);
  const [copyMode, setCopyMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState("전체");

  const selectedRecord = records.find((r) => r.id === selectedId);

  const handleSubmit = () => {
    const missing = [];
    if (!form.date) missing.push("날짜");
    if (!form.member) missing.push("담당자");
    if (!form.author || !form.author.trim()) missing.push("제안 작성자");
    if (!form.amount && form.amount !== 0) missing.push("금액(억)");
    if (!form.client) missing.push("발주기관");
    if (!form.project) missing.push("프로젝트명");
    if (missing.length > 0) {
      setFormWarning(`${missing.join(", ")}을(를) 입력해주세요.`);
      return;
    }
    setFormWarning("");
    const month = form.date.slice(5, 7);
    onAdd({
      ...form,
      amount: parseFloat(form.amount) || 0,
      month,
      id: crypto.randomUUID(),
    });
    setForm(empty);
    setShowForm(false);
    setCopyMode(false);
    setPage(1);
  };

  if (selectedRecord) {
    return (
      <div style={{ maxWidth: 720 }}>
        <ReviewDetail
          record={selectedRecord}
          onClose={() => setSelectedId(null)}
          onDelete={onDelete}
          onUpdate={(updated) => {
            onUpdate(updated);
            setSelectedId(null);
          }}
          members={members}
          clients={clients}
          onCopy={(rec) => {
            const gid = rec.groupId || `grp-${Date.now()}`;
            if (!rec.groupId) onUpdate({ ...rec, groupId: gid });
            setSelectedId(null);
            setForm({
              ...rec,
              id: undefined,
              member: "",
              type: REVIEW_TYPES[0],
              groupId: gid,
            });
            setCopyMode(true);
            setShowForm(true);
            setPage(1);
          }}
          currentUser={currentUser}
          onNavigateToClients={onNavigateToClients}
        />
      </div>
    );
  }

  const reviewColor = (t) =>
    t === "Pink" ? "#F472B6" : t === "Red" ? ACCENT.red : ACCENT.cyan;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <p style={{ fontSize: 13, color: NAVY[300], marginTop: 2 }}>
            총 {records.length}건 등록
          </p>
        </div>
        {currentUser?.role !== "뷰어" && <button
          onClick={() => setShowForm(!showForm)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            borderRadius: 12,
            border: "none",
            background: NAVY[500],
            color: "white",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {showForm ? <X size={16} /> : <PlusCircle size={16} />}
          {showForm ? "닫기" : "새 건 등록"}
        </button>}
      </div>

      {!showForm && (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="프로젝트명, 담당자, 발주기관 검색"
              style={{
                width: "100%",
                padding: "10px 14px 10px 38px",
                borderRadius: 12,
                border: `1.5px solid ${NAVY[100]}`,
                background: "white",
                fontSize: 14,
                color: NAVY[700],
                boxSizing: "border-box",
              }}
            />
            <svg
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
              }}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={NAVY[300]}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setPage(1);
                }}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: NAVY[300],
                  padding: 4,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <Select
            value={filterMonth}
            onChange={(v) => {
              setFilterMonth(v);
              setPage(1);
            }}
            options={[
              { value: "전체", label: "전체" },
              ...MONTHS.map((m) => ({ value: m, label: `${m}월` })),
            ]}
            style={{ minWidth: 100 }}
          />
        </div>
      )}

      {showForm && (
        <div
          style={{
            background: "white",
            borderRadius: 16,
            padding: 24,
            border: `2px solid ${copyMode ? ACCENT.purple : ACCENT.blue}30`,
            boxShadow: `0 4px 20px ${copyMode ? ACCENT.purple : ACCENT.blue}10`,
          }}
        >
          <h4
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: NAVY[700],
              marginBottom: 16,
            }}
          >
            {copyMode ? "복사 등록" : "새 리뷰 등록"}
          </h4>
          {copyMode && (
            <p
              style={{
                fontSize: 12,
                color: ACCENT.purple,
                fontWeight: 600,
                marginBottom: 12,
              }}
            >
              ※ 담당자, 유형, 제안 작성자만 수정 가능합니다
            </p>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            {copyMode ? (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: NAVY[50],
                  border: `1.5px solid ${NAVY[100]}`,
                }}
              >
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: NAVY[300],
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  날짜<span style={{ color: ACCENT.red }}> *</span>
                </label>
                <p style={{ fontSize: 14, color: NAVY[500], fontWeight: 500 }}>
                  {form.date}
                </p>
              </div>
            ) : (
              <Input
                label="날짜"
                required
                type="date"
                value={form.date}
                onChange={(v) => setForm((p) => ({ ...p, date: v }))}
                required
              />
            )}
            <Select
              label="담당자"
              required
              value={form.member}
              onChange={(v) => setForm((p) => ({ ...p, member: v }))}
              options={[
                { value: "", label: "-- 선택 --" },
                ...members.map((m) => ({ value: m, label: m })),
              ]}
            />
            <Select
              label="유형"
              value={form.type}
              onChange={(v) => setForm((p) => ({ ...p, type: v }))}
              options={REVIEW_TYPES}
            />
            <Input
              label="제안 작성자"
              required
              value={form.author || ""}
              onChange={(v) => setForm((p) => ({ ...p, author: v }))}
              placeholder="작성자 입력"
            />
            {copyMode ? (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: NAVY[50],
                  border: `1.5px solid ${NAVY[100]}`,
                }}
              >
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: NAVY[300],
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  총괄
                </label>
                <p style={{ fontSize: 14, color: NAVY[500], fontWeight: 500 }}>
                  {form.leader || "—"}
                </p>
              </div>
            ) : (
              <Input
                label="총괄"
                value={form.leader}
                onChange={(v) => setForm((p) => ({ ...p, leader: v }))}
                placeholder="감리 총괄"
              />
            )}
            {copyMode ? (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: NAVY[50],
                  border: `1.5px solid ${NAVY[100]}`,
                }}
              >
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: NAVY[300],
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  금액(억)<span style={{ color: ACCENT.red }}> *</span>
                </label>
                <p
                  style={{
                    fontSize: 14,
                    color: NAVY[500],
                    fontWeight: 600,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {fmt(form.amount)}
                </p>
              </div>
            ) : (
              <Input
                label="금액(억)"
                required
                type="number"
                value={form.amount}
                onChange={(v) => setForm((p) => ({ ...p, amount: v }))}
                placeholder="0.00"
              />
            )}
            {copyMode ? (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: NAVY[50],
                  border: `1.5px solid ${NAVY[100]}`,
                }}
              >
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: NAVY[300],
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  발주기관<span style={{ color: ACCENT.red }}> *</span>
                </label>
                <p style={{ fontSize: 14, color: NAVY[500], fontWeight: 500 }}>
                  {form.client}
                </p>
              </div>
            ) : (
              <ClientSearchInput
                label="발주기관"
                required
                value={form.client}
                onChange={(v) => setForm((p) => ({ ...p, client: v }))}
                clients={clients}
                onNavigateToClients={onNavigateToClients}
              />
            )}
            {copyMode ? (
              <div
                style={{
                  gridColumn: "span 2",
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: NAVY[50],
                  border: `1.5px solid ${NAVY[100]}`,
                }}
              >
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: NAVY[300],
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  프로젝트명<span style={{ color: ACCENT.red }}> *</span>
                </label>
                <p style={{ fontSize: 14, color: NAVY[500], fontWeight: 500 }}>
                  {form.project}
                </p>
              </div>
            ) : (
              <Input
                label="프로젝트명"
                required
                value={form.project}
                onChange={(v) => setForm((p) => ({ ...p, project: v }))}
                placeholder="사업명 입력"
                style={{ gridColumn: "span 2" }}
              />
            )}
          </div>
          {formWarning && (
            <div
              style={{
                marginTop: 16,
                padding: "10px 16px",
                borderRadius: 10,
                background: ACCENT.red + "12",
                border: `1px solid ${ACCENT.red}30`,
              }}
            >
              <span
                style={{ fontSize: 13, fontWeight: 600, color: ACCENT.red }}
              >
                {formWarning}
              </span>
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 20,
            }}
          >
            <button
              onClick={() => {
                setForm(empty);
                setShowForm(false);
                setFormWarning("");
                setCopyMode(false);
              }}
              style={{
                padding: "10px 24px",
                borderRadius: 12,
                border: `1.5px solid ${NAVY[100]}`,
                background: "white",
                fontSize: 14,
                fontWeight: 600,
                color: NAVY[400],
                cursor: "pointer",
              }}
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 24px",
                borderRadius: 12,
                border: "none",
                background: ACCENT.blue,
                color: "white",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Check size={16} /> 등록
            </button>
          </div>
        </div>
      )}

      {!showForm &&
        (() => {
          const PAGE_SIZE = 10;
          const monthFiltered =
            filterMonth === "전체"
              ? records
              : records.filter((r) => r.date?.slice(5, 7) === filterMonth);
          const term = searchTerm.trim().toLowerCase();
          const filtered = term
            ? monthFiltered.filter(
                (r) =>
                  r.project?.toLowerCase().includes(term) ||
                  r.member?.toLowerCase().includes(term) ||
                  r.client?.toLowerCase().includes(term),
              )
            : monthFiltered;
          const sorted = filtered.slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
          const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
          const safePage = Math.min(page, totalPages);
          const paged = sorted.slice(
            (safePage - 1) * PAGE_SIZE,
            safePage * PAGE_SIZE,
          );
          return (
            <>
              {(term || filterMonth !== "전체") && (
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: ACCENT.blue,
                    marginBottom: 4,
                  }}
                >
                  검색결과 {sorted.length}건
                </p>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {paged.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: "10px 16px",
                      background: "white",
                      borderRadius: 14,
                      border: `1px solid ${NAVY[50]}`,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = ACCENT.blue + "40";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = NAVY[50];
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          background: reviewColor(r.type) + "18",
                          color: reviewColor(r.type),
                          padding: "3px 10px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {r.type}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: NAVY[700],
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.project}
                      </span>
                    </div>
                    <span
                      style={{ fontSize: 12, color: NAVY[400], flexShrink: 0 }}
                    >
                      {r.member}
                    </span>
                    <span
                      style={{ fontSize: 12, color: NAVY[300], flexShrink: 0 }}
                    >
                      {fmtDate(r.date)}
                    </span>
                    <p
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: NAVY[600],
                        fontFamily: "'JetBrains Mono', monospace",
                        flexShrink: 0,
                      }}
                    >
                      {fmt(r.amount)}
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: NAVY[300],
                        }}
                      >
                        {" "}
                        억
                      </span>
                    </p>
                    <ChevronRight
                      size={18}
                      color={NAVY[200]}
                      style={{ flexShrink: 0 }}
                    />
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 4,
                    marginTop: 20,
                  }}
                >
                  <button
                    onClick={() => setPage(1)}
                    disabled={safePage === 1}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: `1px solid ${NAVY[100]}`,
                      background: "white",
                      fontSize: 12,
                      fontWeight: 600,
                      color: safePage === 1 ? NAVY[200] : NAVY[500],
                      cursor: safePage === 1 ? "default" : "pointer",
                    }}
                  >
                    {"«"}
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: `1px solid ${NAVY[100]}`,
                      background: "white",
                      fontSize: 12,
                      fontWeight: 600,
                      color: safePage === 1 ? NAVY[200] : NAVY[500],
                      cursor: safePage === 1 ? "default" : "pointer",
                    }}
                  >
                    {"‹"}
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 8,
                          border: "none",
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          background: p === safePage ? NAVY[500] : "white",
                          color: p === safePage ? "white" : NAVY[400],
                          minWidth: 36,
                        }}
                      >
                        {p}
                      </button>
                    ),
                  )}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: `1px solid ${NAVY[100]}`,
                      background: "white",
                      fontSize: 12,
                      fontWeight: 600,
                      color: safePage === totalPages ? NAVY[200] : NAVY[500],
                      cursor: safePage === totalPages ? "default" : "pointer",
                    }}
                  >
                    {"›"}
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={safePage === totalPages}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: `1px solid ${NAVY[100]}`,
                      background: "white",
                      fontSize: 12,
                      fontWeight: 600,
                      color: safePage === totalPages ? NAVY[200] : NAVY[500],
                      cursor: safePage === totalPages ? "default" : "pointer",
                    }}
                  >
                    {"»"}
                  </button>
                </div>
              )}
            </>
          );
        })()}
    </div>
  );
}

// ─── Schedule View (일정) ───
const SCHED_CATS = ["감리", "휴가", "기타"];
const SCHED_CAT_COLORS = { 감리: "#3B82F6", 휴가: "#10B981", 기타: "#F59E0B" };

function ScheduleView({ schedules, onAdd, onDelete, onUpdate, currentUser }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectStart, setSelectStart] = useState(null);
  const [selectEnd, setSelectEnd] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [task, setTask] = useState("");
  const [category, setCategory] = useState(SCHED_CATS[0]);
  const [hoveredId, setHoveredId] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [selectedSched, setSelectedSched] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    start: "",
    end: "",
    task: "",
    category: "",
  });

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const dayNames = ["월", "화", "수", "목", "금", "토", "일"];
  const pad = (n) => String(n).padStart(2, "0");
  const toStr = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  };

  const handleDayClick = (dateStr) => {
    if (currentUser.role === "뷰어") return;
    if (!selectStart || (selectStart && selectEnd)) {
      setSelectStart(dateStr);
      setSelectEnd(null);
    } else {
      if (dateStr < selectStart) {
        setSelectEnd(selectStart);
        setSelectStart(dateStr);
      } else setSelectEnd(dateStr);
      setShowForm(true);
      setTask("");
    }
  };

  const handleSubmit = () => {
    if (category !== "휴가" && !task.trim()) return;
    if (!selectStart || !selectEnd) return;
    onAdd({
      id: crypto.randomUUID(),
      start: selectStart,
      end: selectEnd,
      task: task.trim(),
      category,
      author: currentUser.name,
      authorId: currentUser.id,
    });
    setShowForm(false);
    setSelectStart(null);
    setSelectEnd(null);
    setTask("");
    setCategory(SCHED_CATS[0]);
  };

  const cancelSelect = () => {
    setShowForm(false);
    setSelectStart(null);
    setSelectEnd(null);
    setTask("");
    setCategory(SCHED_CATS[0]);
  };

  const handleBarClick = (e, sched) => {
    e.stopPropagation();
    setSelectedSched(sched);
    setEditMode(false);
    setEditForm({
      start: sched.start,
      end: sched.end,
      task: sched.task,
      category: sched.category || "감리",
    });
  };

  const handleEditSave = () => {
    if (editForm.category !== "휴가" && !editForm.task.trim()) return;
    if (!editForm.start || !editForm.end) return;
    const s = editForm.start <= editForm.end ? editForm.start : editForm.end;
    const e = editForm.start <= editForm.end ? editForm.end : editForm.start;
    onUpdate({
      ...selectedSched,
      start: s,
      end: e,
      task: editForm.task.trim(),
      category: editForm.category,
    });
    setSelectedSched(null);
    setEditMode(false);
  };

  const getCatColor = (cat) =>
    SCHED_CAT_COLORS[cat] || SCHED_CAT_COLORS["기타"];

  // Build calendar grid
  const weeks = [];
  let week = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  // Get schedules visible in this month
  const monthStart = toStr(viewYear, viewMonth, 1);
  const monthEnd = toStr(viewYear, viewMonth, daysInMonth);
  const visible = schedules.filter(
    (s) => s.start <= monthEnd && s.end >= monthStart,
  );

  const isSelected = (d) => {
    if (!d) return false;
    const ds = toStr(viewYear, viewMonth, d);
    if (selectStart && !selectEnd) return ds === selectStart;
    if (selectStart && selectEnd) return ds >= selectStart && ds <= selectEnd;
    return false;
  };

  const isToday = (d) =>
    d &&
    viewYear === today.getFullYear() &&
    viewMonth === today.getMonth() &&
    d === today.getDate();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div></div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {selectStart && (
            <p style={{ fontSize: 12, color: ACCENT.blue, fontWeight: 600 }}>
              {selectStart}
              {selectEnd ? ` ~ ${selectEnd}` : " (종료일 선택)"}
            </p>
          )}
          {selectStart && (
            <button
              onClick={cancelSelect}
              style={{
                padding: "4px 12px",
                borderRadius: 8,
                border: `1px solid ${NAVY[100]}`,
                background: "white",
                fontSize: 12,
                color: NAVY[400],
                cursor: "pointer",
              }}
            >
              취소
            </button>
          )}
        </div>
      </div>

      {/* Month Navigation */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 20,
        }}
      >
        <button
          onClick={prevMonth}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 8,
          }}
        >
          <ChevronLeft size={20} color={NAVY[500]} />
        </button>
        <h4
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: NAVY[700],
            minWidth: 140,
            textAlign: "center",
          }}
        >
          {viewYear}년 {viewMonth + 1}월
        </h4>
        <button
          onClick={nextMonth}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 8,
          }}
        >
          <ChevronRight size={20} color={NAVY[500]} />
        </button>
      </div>

      {/* Calendar Grid */}
      <div
        style={{
          background: "white",
          borderRadius: 16,
          border: `1px solid ${NAVY[50]}`,
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        {/* Day names */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            borderBottom: `2px solid ${NAVY[100]}`,
          }}
        >
          {dayNames.map((d, i) => (
            <div
              key={d}
              style={{
                padding: "10px 0",
                textAlign: "center",
                fontSize: 12,
                fontWeight: 700,
                color: i === 6 ? ACCENT.red : i === 5 ? ACCENT.blue : NAVY[500],
              }}
            >
              {d}
            </div>
          ))}
        </div>
        {/* Weeks */}
        {weeks.map((wk, wi) => {
          // Compute bars for this week
          const weekBars = [];
          visible.forEach((s) => {
            const c = getCatColor(s.category);
            for (let di = 0; di < 7; di++) {
              const d = wk[di];
              if (!d) continue;
              const ds = toStr(viewYear, viewMonth, d);
              if (
                ds === s.start ||
                (ds >= s.start && ds <= s.end && di === 0)
              ) {
                // bar starts here
                let span = 0;
                for (let j = di; j < 7; j++) {
                  const dd = wk[j];
                  if (!dd) break;
                  const dds = toStr(viewYear, viewMonth, dd);
                  if (dds >= s.start && dds <= s.end) span++;
                  else break;
                }
                if (span > 0) weekBars.push({ ...s, col: di, span, color: c });
              }
            }
          });
          // Assign rows to avoid overlap
          const barRows = [];
          weekBars.forEach((bar) => {
            let row = 0;
            while (
              barRows.some(
                (b) =>
                  b.row === row &&
                  !(bar.col >= b.col + b.span || bar.col + bar.span <= b.col),
              )
            )
              row++;
            bar.row = row;
            barRows.push(bar);
          });
          const maxRow =
            barRows.length > 0 ? Math.max(...barRows.map((b) => b.row)) + 1 : 0;
          const barAreaHeight = maxRow * 22;

          return (
            <div
              key={wi}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                borderBottom:
                  wi < weeks.length - 1 ? `1px solid ${NAVY[50]}` : "none",
                position: "relative",
              }}
            >
              {wk.map((d, di) => (
                <div
                  key={di}
                  onClick={() =>
                    d && handleDayClick(toStr(viewYear, viewMonth, d))
                  }
                  style={{
                    minHeight: 28 + barAreaHeight,
                    padding: "4px 4px 2px",
                    borderRight: di < 6 ? `1px solid ${NAVY[50]}` : "none",
                    background: isSelected(d)
                      ? ACCENT.blue + "12"
                      : isToday(d)
                        ? ACCENT.amber + "08"
                        : "white",
                    cursor: d ? "pointer" : "default",
                  }}
                >
                  {d && (
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: isToday(d) ? 800 : 500,
                        color: isToday(d)
                          ? ACCENT.blue
                          : di === 6
                            ? ACCENT.red + "99"
                            : di === 5
                              ? ACCENT.blue + "99"
                              : NAVY[400],
                        textAlign: "right",
                        paddingRight: 4,
                      }}
                    >
                      {d}
                    </p>
                  )}
                </div>
              ))}
              {/* Connected bars */}
              {barRows.map((bar) => {
                const bc = getCatColor(bar.category);
                return (
                  <div
                    key={`${bar.id}-${bar.col}`}
                    onMouseEnter={(e) => {
                      setHoveredId(bar.id);
                      setHoverPos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => setHoveredId(null)}
                    onMouseMove={(e) => {
                      if (hoveredId === bar.id)
                        setHoverPos({ x: e.clientX, y: e.clientY });
                    }}
                    onClick={(e) => handleBarClick(e, bar)}
                    style={{
                      position: "absolute",
                      top: 24 + bar.row * 22,
                      left: `calc(${(bar.col / 7) * 100}% + 3px)`,
                      width: `calc(${(bar.span / 7) * 100}% - 6px)`,
                      height: 18,
                      background: bc + "22",
                      border: `1px solid ${bc}40`,
                      borderRadius: 4,
                      display: "flex",
                      alignItems: "center",
                      paddingLeft: 6,
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                      zIndex: 1,
                    }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 700, color: bc }}>
                      {bar.author}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Schedule List */}
      {visible.length > 0 && (
        <div
          style={{
            background: "white",
            borderRadius: 16,
            padding: 20,
            border: `1px solid ${NAVY[50]}`,
          }}
        >
          <h4
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: NAVY[700],
              marginBottom: 12,
            }}
          >
            이번 달 일정 ({visible.length}건)
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {visible
              .sort((a, b) => a.start.localeCompare(b.start))
              .map((s) => {
                const c = getCatColor(s.category);
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedSched(s);
                      setEditMode(false);
                      setEditForm({
                        start: s.start,
                        end: s.end,
                        task: s.task,
                        category: s.category || "감리",
                      });
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "5px 12px",
                      borderRadius: 8,
                      border: `1px solid ${NAVY[50]}`,
                      background: c + "06",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: 3,
                        height: 22,
                        borderRadius: 2,
                        background: c,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        padding: "2px 7px",
                        borderRadius: 5,
                        fontSize: 10,
                        fontWeight: 700,
                        background: c + "20",
                        color: c,
                        flexShrink: 0,
                      }}
                    >
                      {s.category || "감리"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: NAVY[700],
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.task}
                      </p>
                      <p style={{ fontSize: 10, color: NAVY[300] }}>
                        {fmtDateRange(s.start, s.end)} · {s.author}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Tooltip */}
      {hoveredId &&
        !selectedSched &&
        (() => {
          const s = schedules.find((s) => s.id === hoveredId);
          if (!s) return null;
          const tc = getCatColor(s.category);
          return (
            <div
              style={{
                position: "fixed",
                left: hoverPos.x + 12,
                top: hoverPos.y - 10,
                background: NAVY[700],
                color: "white",
                padding: "10px 14px",
                borderRadius: 10,
                fontSize: 13,
                maxWidth: 300,
                zIndex: 10000,
                boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    background: tc + "30",
                    color: tc,
                  }}
                >
                  {s.category || "감리"}
                </span>
                <span style={{ fontWeight: 700 }}>{s.task}</span>
              </div>
              <p style={{ fontSize: 11, color: NAVY[200] }}>
                {fmtDateRange(s.start, s.end)}
              </p>
              <p style={{ fontSize: 11, color: ACCENT.cyan }}>{s.author}</p>
            </div>
          );
        })()}

      {/* Add Form Modal */}
      {showForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={cancelSelect}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(13,32,53,0.5)",
              backdropFilter: "blur(4px)",
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              background: "white",
              borderRadius: 20,
              padding: 32,
              width: 440,
              maxWidth: "90vw",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <h4
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: NAVY[700],
                marginBottom: 8,
              }}
            >
              일정 등록
            </h4>
            <p style={{ fontSize: 13, color: NAVY[300], marginBottom: 20 }}>
              {selectStart} ~ {selectEnd} · {currentUser.name}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: NAVY[400],
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  구분 <span style={{ color: ACCENT.red }}>*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: `1.5px solid ${NAVY[100]}`,
                    fontSize: 14,
                    color: NAVY[700],
                    cursor: "pointer",
                  }}
                >
                  {SCHED_CATS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: NAVY[400],
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  업무 내용
                  {category !== "휴가" && (
                    <span style={{ color: ACCENT.red }}> *</span>
                  )}
                </label>
                <textarea
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="업무 내용을 입력하세요"
                  autoFocus
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: `1.5px solid ${NAVY[100]}`,
                    fontSize: 14,
                    color: NAVY[700],
                    boxSizing: "border-box",
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                marginTop: 20,
              }}
            >
              <button
                onClick={cancelSelect}
                style={{
                  padding: "10px 24px",
                  borderRadius: 12,
                  border: `1.5px solid ${NAVY[100]}`,
                  background: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  color: NAVY[400],
                  cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: ACCENT.blue,
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Check size={16} /> 등록
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail / Edit Modal */}
      {selectedSched && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => {
            setSelectedSched(null);
            setEditMode(false);
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(13,32,53,0.5)",
              backdropFilter: "blur(4px)",
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              background: "white",
              borderRadius: 20,
              padding: 32,
              width: 460,
              maxWidth: "90vw",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            {editMode ? (
              <>
                <h4
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: NAVY[700],
                    marginBottom: 20,
                  }}
                >
                  일정 수정
                </h4>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 14 }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: NAVY[400],
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        시작일
                      </label>
                      <input
                        type="date"
                        value={editForm.start}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, start: e.target.value }))
                        }
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: 12,
                          border: `1.5px solid ${NAVY[100]}`,
                          fontSize: 14,
                          color: NAVY[700],
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: NAVY[400],
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        종료일
                      </label>
                      <input
                        type="date"
                        value={editForm.end}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, end: e.target.value }))
                        }
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: 12,
                          border: `1.5px solid ${NAVY[100]}`,
                          fontSize: 14,
                          color: NAVY[700],
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: NAVY[400],
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      구분
                    </label>
                    <select
                      value={editForm.category}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, category: e.target.value }))
                      }
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: `1.5px solid ${NAVY[100]}`,
                        fontSize: 14,
                        color: NAVY[700],
                        cursor: "pointer",
                      }}
                    >
                      {SCHED_CATS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: NAVY[400],
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      업무 내용
                      {editForm.category !== "휴가" && (
                        <span style={{ color: ACCENT.red }}> *</span>
                      )}
                    </label>
                    <textarea
                      value={editForm.task}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, task: e.target.value }))
                      }
                      rows={3}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: `1.5px solid ${NAVY[100]}`,
                        fontSize: 14,
                        color: NAVY[700],
                        boxSizing: "border-box",
                        resize: "vertical",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    justifyContent: "flex-end",
                    marginTop: 20,
                  }}
                >
                  <button
                    onClick={() => setEditMode(false)}
                    style={{
                      padding: "10px 24px",
                      borderRadius: 12,
                      border: `1.5px solid ${NAVY[100]}`,
                      background: "white",
                      fontSize: 14,
                      fontWeight: 600,
                      color: NAVY[400],
                      cursor: "pointer",
                    }}
                  >
                    취소
                  </button>
                  <button
                    onClick={handleEditSave}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "10px 24px",
                      borderRadius: 12,
                      border: "none",
                      background: ACCENT.blue,
                      color: "white",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <Check size={16} /> 저장
                  </button>
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      background: getCatColor(selectedSched.category) + "20",
                      color: getCatColor(selectedSched.category),
                    }}
                  >
                    {selectedSched.category || "감리"}
                  </span>
                  <h4
                    style={{ fontSize: 18, fontWeight: 700, color: NAVY[700] }}
                  >
                    일정 상세
                  </h4>
                </div>
                <div
                  style={{
                    padding: "16px 20px",
                    background: NAVY[50] + "80",
                    borderRadius: 12,
                    marginBottom: 20,
                  }}
                >
                  <p
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: NAVY[700],
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {selectedSched.task}
                  </p>
                  <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                    <p style={{ fontSize: 13, color: NAVY[400] }}>
                      {fmtDateRange(selectedSched.start, selectedSched.end)}
                    </p>
                    <p style={{ fontSize: 13, color: ACCENT.blue }}>
                      {selectedSched.author}
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    onClick={() => {
                      setSelectedSched(null);
                      setEditMode(false);
                    }}
                    style={{
                      padding: "10px 24px",
                      borderRadius: 12,
                      border: `1.5px solid ${NAVY[100]}`,
                      background: "white",
                      fontSize: 14,
                      fontWeight: 600,
                      color: NAVY[400],
                      cursor: "pointer",
                    }}
                  >
                    닫기
                  </button>
                  {currentUser.role !== "뷰어" && selectedSched.authorId === currentUser.id && (
                    <>
                      <button
                        onClick={() => {
                          onDelete(selectedSched.id);
                          setSelectedSched(null);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "10px 24px",
                          borderRadius: 12,
                          border: "none",
                          background: ACCENT.red,
                          color: "white",
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 size={15} /> 삭제
                      </button>
                      <button
                        onClick={() => setEditMode(true)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "10px 24px",
                          borderRadius: 12,
                          border: "none",
                          background: ACCENT.blue,
                          color: "white",
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        <Pencil size={15} /> 수정
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── KCA Settings View ───
function KcaSettingsView({ kcaData, onUpdate }) {
  const [newYear, setNewYear] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [editYear, setEditYear] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [saved, setSaved] = useState(false);

  const years = Object.keys(kcaData).sort((a, b) => b.localeCompare(a));

  const handleAdd = () => {
    const y = newYear.trim();
    const a = parseFloat(newAmount);
    if (!y || isNaN(a) || a < 0 || kcaData[y] !== undefined) return;
    onUpdate({ ...kcaData, [y]: a });
    setNewYear("");
    setNewAmount("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleEditSave = (year) => {
    const a = parseFloat(editAmount);
    if (isNaN(a) || a < 0) return;
    onUpdate({ ...kcaData, [year]: a });
    setEditYear(null);
    setEditAmount("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = (year) => {
    const next = { ...kcaData };
    delete next[year];
    onUpdate(next);
  };

  return (
    <div style={{ maxWidth: 500 }}>
      <h3
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: NAVY[700],
          marginBottom: 8,
        }}
      >
        KCA 감리 수주금액
      </h3>
      <p style={{ fontSize: 13, color: NAVY[300], marginBottom: 24 }}>
        년도별 KCA 감리 수주금액을 설정합니다
      </p>

      {/* Add new year */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
          alignItems: "center",
        }}
      >
        <input
          type="number"
          value={newYear}
          onChange={(e) => setNewYear(e.target.value)}
          placeholder="년도"
          style={{
            width: 100,
            padding: "10px 14px",
            borderRadius: 12,
            border: `1.5px solid ${NAVY[100]}`,
            background: "white",
            fontSize: 14,
            color: NAVY[700],
            boxSizing: "border-box",
          }}
        />
        <input
          type="number"
          value={newAmount}
          onChange={(e) => setNewAmount(e.target.value)}
          placeholder="금액(억)"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 12,
            border: `1.5px solid ${NAVY[100]}`,
            background: "white",
            fontSize: 14,
            color: NAVY[700],
            boxSizing: "border-box",
          }}
        />
        <button
          onClick={handleAdd}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 20px",
            borderRadius: 12,
            border: "none",
            background: NAVY[500],
            color: "white",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <PlusCircle size={16} /> 추가
        </button>
      </div>

      {saved && (
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: ACCENT.green,
            marginBottom: 12,
          }}
        >
          저장되었습니다
        </p>
      )}

      {/* Year list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {years.map((year) => (
          <div
            key={year}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              background: "white",
              borderRadius: 12,
              border: `1px solid ${NAVY[50]}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: NAVY[700],
                minWidth: 50,
              }}
            >
              {year}
            </span>
            {editYear === year ? (
              <>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleEditSave(year)}
                  style={{
                    flex: 1,
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: `1.5px solid ${ACCENT.blue}`,
                    fontSize: 14,
                    color: NAVY[700],
                    outline: "none",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                />
                <span style={{ fontSize: 13, color: NAVY[400] }}>억</span>
                <button
                  onClick={() => handleEditSave(year)}
                  style={{
                    background: ACCENT.blue,
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  저장
                </button>
                <button
                  onClick={() => setEditYear(null)}
                  style={{
                    background: "none",
                    border: `1px solid ${NAVY[100]}`,
                    color: NAVY[400],
                    cursor: "pointer",
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  취소
                </button>
              </>
            ) : (
              <>
                <span
                  style={{
                    flex: 1,
                    fontSize: 18,
                    fontWeight: 700,
                    color: NAVY[600],
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {kcaData[year]}
                  <span
                    style={{ fontSize: 13, fontWeight: 500, color: NAVY[400] }}
                  >
                    {" "}
                    억
                  </span>
                </span>
                <button
                  onClick={() => {
                    setEditYear(year);
                    setEditAmount(String(kcaData[year]));
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: NAVY[300],
                    padding: 4,
                    borderRadius: 6,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = ACCENT.blue)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = NAVY[300])
                  }
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => handleDelete(year)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: NAVY[300],
                    padding: 4,
                    borderRadius: 6,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = ACCENT.red)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = NAVY[300])
                  }
                >
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Auth Screens ───
function LoginScreen({ members, onLogin, onGoSignup }) {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (!id.trim() || !pw.trim()) {
      setError("ID와 패스워드를 입력해주세요.");
      return;
    }
    const user = members.find((m) => m.id === id.trim() && String(m.pw) === pw);
    if (!user) {
      setError("ID 또는 패스워드가 일치하지 않습니다.");
      return;
    }
    onLogin(user);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${NAVY[800]}, ${NAVY[600]})`,
        fontFamily: "'Pretendard', sans-serif",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 24,
          padding: "48px 40px",
          width: 380,
          maxWidth: "90vw",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: NAVY[700],
              marginBottom: 4,
            }}
          >
            제안전략본부
          </h1>
          <p style={{ fontSize: 13, color: NAVY[300] }}>
            제안팀 업무현황 관리 시스템
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: NAVY[400],
                display: "block",
                marginBottom: 4,
              }}
            >
              ID
            </label>
            <input
              type="text"
              value={id}
              onChange={(e) => {
                setId(e.target.value);
                setError("");
              }}
              placeholder="아이디 입력"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 12,
                border: `1.5px solid ${NAVY[100]}`,
                fontSize: 14,
                color: NAVY[700],
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: NAVY[400],
                display: "block",
                marginBottom: 4,
              }}
            >
              패스워드
            </label>
            <input
              type="password"
              value={pw}
              onChange={(e) => {
                setPw(e.target.value);
                setError("");
              }}
              placeholder="패스워드 입력"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 12,
                border: `1.5px solid ${NAVY[100]}`,
                fontSize: 14,
                color: NAVY[700],
                boxSizing: "border-box",
              }}
            />
          </div>
          {error && (
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: ACCENT.red,
                textAlign: "center",
              }}
            >
              {error}
            </p>
          )}
          <button
            onClick={handleLogin}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 12,
              border: "none",
              background: NAVY[500],
              color: "white",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              marginTop: 8,
            }}
          >
            로그인
          </button>
          <button
            onClick={onGoSignup}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 12,
              border: `1.5px solid ${NAVY[100]}`,
              background: "white",
              color: NAVY[400],
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            회원가입
          </button>
        </div>
      </div>
    </div>
  );
}

function SignupScreen({ members, onSignup, onGoLogin }) {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSignup = () => {
    if (!id.trim()) {
      setError("ID를 입력해주세요.");
      return;
    }
    if (!pw) {
      setError("패스워드를 입력해주세요.");
      return;
    }
    if (pw !== pw2) {
      setError("패스워드가 일치하지 않습니다.");
      return;
    }
    if (!name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    if (members.find((m) => m.id === id.trim())) {
      setError("이미 사용 중인 ID입니다.");
      return;
    }
    onSignup({ id: id.trim(), pw, name: name.trim(), role: "사용자" });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${NAVY[800]}, ${NAVY[600]})`,
        fontFamily: "'Pretendard', sans-serif",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 24,
          padding: "48px 40px",
          width: 380,
          maxWidth: "90vw",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: NAVY[700],
              marginBottom: 4,
            }}
          >
            회원가입
          </h1>
          <p style={{ fontSize: 13, color: NAVY[300] }}>
            제안팀 업무현황 관리 시스템
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: NAVY[400],
                display: "block",
                marginBottom: 4,
              }}
            >
              ID <span style={{ color: ACCENT.red }}>*</span>
            </label>
            <input
              type="text"
              value={id}
              onChange={(e) => {
                setId(e.target.value);
                setError("");
              }}
              placeholder="아이디 입력"
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 12,
                border: `1.5px solid ${NAVY[100]}`,
                fontSize: 14,
                color: NAVY[700],
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: NAVY[400],
                display: "block",
                marginBottom: 4,
              }}
            >
              패스워드 <span style={{ color: ACCENT.red }}>*</span>
            </label>
            <input
              type="password"
              value={pw}
              onChange={(e) => {
                setPw(e.target.value);
                setError("");
              }}
              placeholder="패스워드 입력"
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 12,
                border: `1.5px solid ${NAVY[100]}`,
                fontSize: 14,
                color: NAVY[700],
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: NAVY[400],
                display: "block",
                marginBottom: 4,
              }}
            >
              패스워드 확인 <span style={{ color: ACCENT.red }}>*</span>
            </label>
            <input
              type="password"
              value={pw2}
              onChange={(e) => {
                setPw2(e.target.value);
                setError("");
              }}
              placeholder="패스워드 재입력"
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 12,
                border: `1.5px solid ${NAVY[100]}`,
                fontSize: 14,
                color: NAVY[700],
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: NAVY[400],
                display: "block",
                marginBottom: 4,
              }}
            >
              이름 <span style={{ color: ACCENT.red }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="이름 입력"
              onKeyDown={(e) => e.key === "Enter" && handleSignup()}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 12,
                border: `1.5px solid ${NAVY[100]}`,
                fontSize: 14,
                color: NAVY[700],
                boxSizing: "border-box",
              }}
            />
          </div>
          {error && (
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: ACCENT.red,
                textAlign: "center",
              }}
            >
              {error}
            </p>
          )}
          <button
            onClick={handleSignup}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 12,
              border: "none",
              background: ACCENT.blue,
              color: "white",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              marginTop: 8,
            }}
          >
            가입하기
          </button>
          <button
            onClick={onGoLogin}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 12,
              border: `1.5px solid ${NAVY[100]}`,
              background: "white",
              color: NAVY[400],
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            로그인으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Team Member Settings View ───
function TeamMemberListView({ members, onUpdate }) {
  const [editIdx, setEditIdx] = useState(null);
  const [editForm, setEditForm] = useState({
    id: "",
    pw: "",
    name: "",
    role: "사용자",
  });
  const [newForm, setNewForm] = useState({
    id: "",
    pw: "",
    name: "",
    role: "사용자",
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const PAGE_SIZE = 10;
  const term = searchTerm.trim().toLowerCase();
  const filtered = term
    ? members
        .map((m, idx) => ({ ...m, idx }))
        .filter(
          (o) =>
            o.name.toLowerCase().includes(term) ||
            o.id.toLowerCase().includes(term),
        )
    : members.map((m, idx) => ({ ...m, idx }));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const handleAdd = () => {
    if (!newForm.id.trim() || !newForm.pw.trim() || !newForm.name.trim())
      return;
    if (members.find((m) => m.id === newForm.id.trim())) return;
    onUpdate([
      ...members,
      {
        id: newForm.id.trim(),
        pw: newForm.pw.trim(),
        name: newForm.name.trim(),
        role: newForm.role,
      },
    ]);
    setNewForm({ id: "", pw: "", name: "", role: "사용자" });
    setPage(Math.ceil((members.length + 1) / PAGE_SIZE));
  };

  const handleEditSave = (idx) => {
    if (!editForm.id.trim() || !editForm.pw.trim() || !editForm.name.trim())
      return;
    const updated = [...members];
    updated[idx] = {
      id: editForm.id.trim(),
      pw: editForm.pw.trim(),
      name: editForm.name.trim(),
      role: editForm.role,
    };
    onUpdate(updated);
    setEditIdx(null);
  };

  const handleDelete = (idx) => {
    onUpdate(members.filter((_, i) => i !== idx));
    setShowDeleteConfirm(null);
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: NAVY[700] }}>
          사용자
        </h3>
        <p style={{ fontSize: 13, color: NAVY[300], marginTop: 2 }}>
          총 {members.length}명
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="이름, ID 검색"
            style={{
              width: "100%",
              padding: "10px 14px 10px 38px",
              borderRadius: 12,
              border: `1.5px solid ${NAVY[100]}`,
              background: "white",
              fontSize: 14,
              color: NAVY[700],
              boxSizing: "border-box",
            }}
          />
          <Search
            size={15}
            color={NAVY[300]}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                setPage(1);
              }}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: NAVY[300],
                padding: 4,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {term && (
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: ACCENT.blue,
            marginBottom: 8,
          }}
        >
          검색결과 {filtered.length}건
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr auto auto",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <input
          value={newForm.id}
          onChange={(e) => setNewForm((p) => ({ ...p, id: e.target.value }))}
          placeholder="ID"
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: `1.5px solid ${NAVY[100]}`,
            fontSize: 14,
            color: NAVY[700],
          }}
        />
        <input
          type="password"
          value={newForm.pw}
          onChange={(e) => setNewForm((p) => ({ ...p, pw: e.target.value }))}
          placeholder="패스워드"
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: `1.5px solid ${NAVY[100]}`,
            fontSize: 14,
            color: NAVY[700],
          }}
        />
        <input
          value={newForm.name}
          onChange={(e) => setNewForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="이름"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: `1.5px solid ${NAVY[100]}`,
            fontSize: 14,
            color: NAVY[700],
          }}
        />
        <select
          value={newForm.role}
          onChange={(e) => setNewForm((p) => ({ ...p, role: e.target.value }))}
          style={{
            padding: "10px 10px",
            borderRadius: 12,
            border: `1.5px solid ${NAVY[100]}`,
            fontSize: 13,
            color: NAVY[700],
            cursor: "pointer",
          }}
        >
          <option value="사용자">사용자</option>
          <option value="뷰어">뷰어</option>
          <option value="관리자">관리자</option>
        </select>
        <button
          onClick={handleAdd}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 20px",
            borderRadius: 12,
            border: "none",
            background: NAVY[500],
            color: "white",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <PlusCircle size={16} /> 추가
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {paged.map((item) => {
          const idx = item.idx;
          return (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                background: "white",
                borderRadius: 12,
                border: `1px solid ${NAVY[50]}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: NAVY[500] + "12",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: NAVY[500],
                  flexShrink: 0,
                }}
              >
                {idx + 1}
              </span>
              {editIdx === idx ? (
                <>
                  <input
                    value={editForm.id}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, id: e.target.value }))
                    }
                    autoFocus
                    style={{
                      width: 80,
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: `1.5px solid ${ACCENT.blue}`,
                      fontSize: 13,
                      color: NAVY[700],
                      outline: "none",
                    }}
                  />
                  <input
                    type="password"
                    value={editForm.pw}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, pw: e.target.value }))
                    }
                    style={{
                      width: 80,
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: `1.5px solid ${ACCENT.blue}`,
                      fontSize: 13,
                      color: NAVY[700],
                      outline: "none",
                    }}
                  />
                  <input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, name: e.target.value }))
                    }
                    onKeyDown={(e) => e.key === "Enter" && handleEditSave(idx)}
                    style={{
                      flex: 1,
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: `1.5px solid ${ACCENT.blue}`,
                      fontSize: 13,
                      color: NAVY[700],
                      outline: "none",
                    }}
                  />
                  <select
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, role: e.target.value }))
                    }
                    style={{
                      padding: "6px 8px",
                      borderRadius: 8,
                      border: `1.5px solid ${ACCENT.blue}`,
                      fontSize: 12,
                      color: NAVY[700],
                      cursor: "pointer",
                    }}
                  >
                    <option value="사용자">사용자</option>
                    <option value="뷰어">뷰어</option>
                    <option value="관리자">관리자</option>
                  </select>
                  <button
                    onClick={() => handleEditSave(idx)}
                    style={{
                      background: ACCENT.blue,
                      border: "none",
                      color: "white",
                      cursor: "pointer",
                      padding: "6px 12px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    저장
                  </button>
                  <button
                    onClick={() => setEditIdx(null)}
                    style={{
                      background: "none",
                      border: `1px solid ${NAVY[100]}`,
                      color: NAVY[400],
                      cursor: "pointer",
                      padding: "6px 12px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    취소
                  </button>
                </>
              ) : (
                <>
                  <span
                    style={{
                      width: 70,
                      fontSize: 13,
                      color: NAVY[400],
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {item.id}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 15,
                      fontWeight: 500,
                      color: NAVY[700],
                    }}
                  >
                    {item.name}
                  </span>
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      background:
                        (item.role === "관리자" ? ACCENT.purple : NAVY[300]) +
                        "18",
                      color: item.role === "관리자" ? ACCENT.purple : NAVY[400],
                    }}
                  >
                    {item.role || "사용자"}
                  </span>
                  <button
                    onClick={() => {
                      setEditIdx(idx);
                      setEditForm({
                        id: item.id,
                        pw: item.pw,
                        name: item.name,
                        role: item.role || "사용자",
                      });
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: NAVY[300],
                      padding: 4,
                      borderRadius: 6,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = ACCENT.blue)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = NAVY[300])
                    }
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(idx)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: NAVY[300],
                      padding: 4,
                      borderRadius: 6,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = ACCENT.red)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = NAVY[300])
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 4,
            marginTop: 20,
          }}
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "none",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                background: p === safePage ? NAVY[500] : "white",
                color: p === safePage ? "white" : NAVY[400],
                minWidth: 36,
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {showDeleteConfirm !== null && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(13,32,53,0.5)",
              backdropFilter: "blur(4px)",
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              background: "white",
              borderRadius: 20,
              padding: 32,
              width: 380,
              maxWidth: "90vw",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <h4
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: NAVY[700],
                marginBottom: 8,
              }}
            >
              인력 삭제
            </h4>
            <p
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: NAVY[700],
                padding: "10px 14px",
                background: NAVY[50],
                borderRadius: 10,
                marginBottom: 24,
              }}
            >
              {members[showDeleteConfirm]?.name} (
              {members[showDeleteConfirm]?.id})
            </p>
            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setShowDeleteConfirm(null)}
                style={{
                  padding: "10px 24px",
                  borderRadius: 12,
                  border: `1.5px solid ${NAVY[100]}`,
                  background: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  color: NAVY[400],
                  cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: ACCENT.red,
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Trash2 size={15} /> 삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Table Styles ───
const thStyle = {
  padding: "10px 12px",
  textAlign: "left",
  fontWeight: 700,
  color: NAVY[600],
  fontSize: 12,
  borderBottom: `2px solid ${NAVY[100]}`,
  position: "sticky",
  top: 0,
  background: "white",
};
const th2Style = {
  padding: "8px 10px",
  textAlign: "center",
  fontWeight: 600,
  color: NAVY[400],
  fontSize: 11,
  borderBottom: `1px solid ${NAVY[100]}`,
  background: NAVY[50] + "50",
};
const tdStyle = {
  padding: "8px 12px",
  fontSize: 13,
  color: NAVY[600],
  whiteSpace: "nowrap",
};
const tdNumStyle = {
  padding: "8px 10px",
  fontSize: 13,
  color: NAVY[500],
  textAlign: "center",
  fontFamily: "'JetBrains Mono', monospace",
};
const tdStyle2 = { padding: "10px 14px", fontSize: 13, color: NAVY[600] };
const rthStyle = {
  padding: "10px 12px",
  textAlign: "left",
  fontWeight: 700,
  color: NAVY[600],
  fontSize: 12,
  borderBottom: `2px solid ${NAVY[200]}`,
  background: NAVY[50],
};
const rtdStyle = {
  padding: "8px 12px",
  fontSize: 13,
  color: NAVY[600],
  borderBottom: `1px solid ${NAVY[50]}`,
};

// ─── Main App ───
const NAV_ITEMS = [
  { key: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { key: "entry", label: "업무현황", icon: Users },
  { key: "individual", label: "개인별 실적", icon: Award },
  { key: "teamstats", label: "팀실적", icon: TrendingUp },
  { key: "monthlystats", label: "팀 월별 실적", icon: Calendar },
  { key: "report", label: "리포트", icon: FileText },
  { key: "review", label: "제안서 리뷰", icon: ClipboardList },
  { key: "schedule", label: "일정", icon: Calendar },
];

export default function App() {
  const [authScreen, setAuthScreen] = useState("login");
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState("dashboard");
  const [records, setRecords] = useState(INITIAL_RECORDS);
  const [members, setMembers] = useState(DEFAULT_MEMBERS);
  const [clients, setClients] = useState(DEFAULT_CLIENTS);
  const [kcaData, setKcaData] = useState(DEFAULT_KCA_DATA);
  const [reviews, setReviews] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [filterMonth, setFilterMonth] = useState("전체");
  const [loaded, setLoaded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showPwChange, setShowPwChange] = useState(false);
  const [pwForm, setPwForm] = useState({ old: "", new1: "", new2: "" });
  const [pwMsg, setPwMsg] = useState({ text: "", ok: false });
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString(),
  );

  const memberNames = useMemo(() => members.map((m) => m.name), [members]);
  const activeMemberNames = useMemo(() => members.filter((m) => m.role !== "뷰어").map((m) => m.name), [members]);

  const yearRecords = useMemo(
    () => records.filter((r) => r.date?.slice(0, 4) === selectedYear),
    [records, selectedYear],
  );
  const yearReviews = useMemo(
    () => reviews.filter((r) => r.date?.slice(0, 4) === selectedYear),
    [reviews, selectedYear],
  );

  useEffect(() => {
    Promise.all([
      loadRecords(),
      loadMembers(),
      loadClients(),
      loadKcaTotal(),
      loadReviews(),
      loadSchedules(),
    ]).then(([r, m, c, k, rv, sc]) => {
      setRecords(r);
      setMembers(m);
      setClients(c);
      setKcaData(k);
      setReviews(rv);
      setSchedules(sc);
      setLoaded(true);
    });
  }, []);

  // localStorage 폴백 자동 저장 (DB 실패 시 복구용)
  useEffect(() => { if (loaded) storageSet("kca-records-v1", records); }, [records, loaded]);
  useEffect(() => { if (loaded) storageSet("kca-members-v1", members); }, [members, loaded]);
  useEffect(() => { if (loaded) storageSet("kca-clients-v1", clients); }, [clients, loaded]);
  useEffect(() => { if (loaded) storageSet("kca-kcadata-v1", kcaData); }, [kcaData, loaded]);
  useEffect(() => { if (loaded) storageSet("kca-reviews-v1", reviews); }, [reviews, loaded]);
  useEffect(() => { if (loaded) storageSet("kca-schedules-v1", schedules); }, [schedules, loaded]);

  const stats = useMemo(
    () => computeStats(yearRecords, filterMonth, memberNames),
    [yearRecords, filterMonth, memberNames],
  );

  const handleSignup = (newUser) => {
    setMembers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    db.upsertMember(newUser);
  };

  if (!loaded) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, ${NAVY[800]}, ${NAVY[600]})`,
          fontFamily: "'Pretendard', sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: `4px solid ${NAVY[500]}`,
              borderTop: `4px solid white`,
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 20px",
            }}
          />
          <p style={{ color: "white", fontSize: 16, fontWeight: 700 }}>
            데이터 로딩 중...
          </p>
          <p style={{ color: NAVY[400], fontSize: 13, marginTop: 8 }}>
            데이터를 불러오고 있습니다
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    if (authScreen === "signup")
      return (
        <SignupScreen
          members={members}
          onSignup={handleSignup}
          onGoLogin={() => setAuthScreen("login")}
        />
      );
    return (
      <LoginScreen
        members={members}
        onLogin={setCurrentUser}
        onGoSignup={() => setAuthScreen("signup")}
      />
    );
  }

  const SHARED_FIELDS = [
    "leader",
    "status",
    "client",
    "project",
    "amount",
    "submitDate",
  ];
  const addRecord = (r) => {
    setRecords((prev) => [...prev, r]);
    db.upsertRecord(r);
  };
  const deleteRecord = (id) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    db.deleteRecord(id);
  };
  const updateRecord = (updated) =>
    setRecords((prev) => {
      const newRecords = prev.map((r) => (r.id === updated.id ? updated : r));
      if (!updated.groupId) {
        db.upsertRecord(updated);
        return newRecords;
      }
      const shared = {};
      SHARED_FIELDS.forEach((f) => {
        shared[f] = updated[f];
      });
      const result = newRecords.map((r) =>
        r.groupId === updated.groupId && r.id !== updated.id
          ? { ...r, ...shared }
          : r,
      );
      // DB에 변경된 레코드들 일괄 저장
      const changed = result.filter((r) => r.groupId === updated.groupId);
      db.upsertRecords(changed);
      return result;
    });

  const REVIEW_SHARED = ["author", "leader", "client", "project", "amount"];
  const addReview = (r) => {
    setReviews((prev) => [...prev, r]);
    db.upsertReview(r);
  };
  const deleteReview = (id) => {
    setReviews((prev) => prev.filter((r) => r.id !== id));
    db.deleteReview(id);
  };
  const updateReview = (updated) =>
    setReviews((prev) => {
      const newRecs = prev.map((r) => (r.id === updated.id ? updated : r));
      if (!updated.groupId) {
        db.upsertReview(updated);
        return newRecs;
      }
      const shared = {};
      REVIEW_SHARED.forEach((f) => {
        shared[f] = updated[f];
      });
      const result = newRecs.map((r) =>
        r.groupId === updated.groupId && r.id !== updated.id
          ? { ...r, ...shared }
          : r,
      );
      const changed = result.filter((r) => r.groupId === updated.groupId);
      db.upsertReviews(changed);
      return result;
    });

  const isSettings =
    view === "team" || view === "clients" || view === "kcasetting";
  const viewLabel =
    view === "team"
      ? "사용자"
      : view === "clients"
        ? "발주기관"
        : view === "kcasetting"
          ? "KCA 감리 수주금액"
          : NAV_ITEMS.find((n) => n.key === view)?.label;

  const settingsSubBtn = (key, icon, label) => (
    <button
      onClick={() => setView(key)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "8px 14px 8px 38px",
        borderRadius: 8,
        border: "none",
        background: view === key ? "rgba(255,255,255,0.1)" : "transparent",
        color: view === key ? "white" : NAVY[400],
        fontSize: 12,
        fontWeight: view === key ? 600 : 500,
        cursor: "pointer",
        textAlign: "left",
        marginTop: 2,
        transition: "all 0.15s",
      }}
    >
      {icon} {label}
    </button>
  );

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#F5F7FA",
        fontFamily:
          "'Pretendard', 'Apple SD Gothic Neo', -apple-system, sans-serif",
      }}
    >
      {/* Sidebar */}
      <nav
        style={{
          width: 220,
          background: `linear-gradient(180deg, ${NAVY[800]}, ${NAVY[700]})`,
          padding: "24px 0",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: "0 20px 24px",
            borderBottom: `1px solid ${NAVY[600]}`,
          }}
        >
          <div>
            <p
              style={{
                color: "white",
                fontWeight: 800,
                fontSize: 15,
                lineHeight: 1.2,
              }}
            >
              제안전략본부
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginTop: 4,
              }}
            >
              <span style={{ color: NAVY[400], fontSize: 11, fontWeight: 500 }}>
                제안팀 업무현황
              </span>
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{
                  width: 70,
                  background: NAVY[600],
                  color: "white",
                  border: `1px solid ${NAVY[500]}`,
                  borderRadius: 6,
                  padding: "3px 4px 3px 8px",
                  fontSize: 13,
                  fontWeight: 700,
                  textAlign: "left",
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ padding: "16px 12px", flex: 1 }}>
          {NAV_ITEMS.map((item) => {
            const active = view === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  setView(item.key);
                  setSettingsOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: active ? "rgba(255,255,255,0.12)" : "transparent",
                  color: active ? "white" : NAVY[300],
                  fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  marginBottom: 4,
                  transition: "all 0.2s",
                  textAlign: "left",
                }}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* 설정 영역 */}
        {currentUser.role !== "뷰어" && <div
          style={{ padding: "8px 12px", borderTop: `1px solid ${NAVY[600]}` }}
        >
          <button
            onClick={() => {
              setSettingsOpen(!settingsOpen);
              if (!settingsOpen)
                setView(currentUser.role === "관리자" ? "team" : "clients");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "11px 14px",
              borderRadius: 10,
              border: "none",
              background:
                isSettings || settingsOpen
                  ? "rgba(255,255,255,0.12)"
                  : "transparent",
              color: isSettings || settingsOpen ? "white" : NAVY[400],
              fontSize: 13,
              fontWeight: isSettings ? 700 : 500,
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s",
            }}
          >
            <Settings size={17} />
            설정
            <ChevronDown
              size={14}
              style={{
                marginLeft: "auto",
                transform:
                  settingsOpen || isSettings ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
              }}
            />
          </button>
          {(settingsOpen || isSettings) && (
            <div style={{ marginTop: 4 }}>
              {currentUser.role === "관리자" &&
                settingsSubBtn("team", <Users size={14} />, "사용자")}
              {settingsSubBtn("clients", <Building2 size={14} />, "발주기관")}
              {currentUser.role === "관리자" &&
                settingsSubBtn(
                  "kcasetting",
                  <Target size={14} />,
                  "KCA 수주금액",
                )}
            </div>
          )}
        </div>}

        <div
          style={{ padding: "12px 16px", borderTop: `1px solid ${NAVY[600]}` }}
        >
          <div
            onClick={() => {
              if (currentUser.role === "뷰어") return;
              setShowPwChange(true);
              setPwForm({ old: "", new1: "", new2: "" });
              setPwMsg({ text: "", ok: false });
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 10,
              cursor: "pointer",
              padding: "6px 8px",
              borderRadius: 8,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.08)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: ACCENT.blue + "30",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                color: "white",
                flexShrink: 0,
              }}
            >
              {currentUser.name[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "white",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {currentUser.name}{" "}
                <span
                  style={{
                    fontSize: 9,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background:
                      currentUser.role === "관리자"
                        ? ACCENT.purple + "40"
                        : NAVY[500],
                    color: "white",
                  }}
                >
                  {currentUser.role || "사용자"}
                </span>
              </p>
              <p style={{ fontSize: 10, color: NAVY[400] }}>{currentUser.id}</p>
            </div>
          </div>
          <button
            onClick={() => setCurrentUser(null)}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: 8,
              border: `1px solid ${NAVY[500]}`,
              background: "transparent",
              color: NAVY[400],
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            로그아웃
          </button>
        </div>

        {/* Password Change Modal */}
        {showPwChange && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => setShowPwChange(false)}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(13,32,53,0.5)",
                backdropFilter: "blur(4px)",
              }}
            />
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "relative",
                background: "white",
                borderRadius: 20,
                padding: 32,
                width: 400,
                maxWidth: "90vw",
                boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              }}
            >
              <h4
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: NAVY[700],
                  marginBottom: 4,
                }}
              >
                패스워드 변경
              </h4>
              <p style={{ fontSize: 13, color: NAVY[300], marginBottom: 24 }}>
                {currentUser.name} ({currentUser.id})
              </p>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: NAVY[400],
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    기존 패스워드
                  </label>
                  <input
                    type="password"
                    value={pwForm.old}
                    onChange={(e) => {
                      setPwForm((p) => ({ ...p, old: e.target.value }));
                      setPwMsg({ text: "", ok: false });
                    }}
                    placeholder="기존 패스워드 입력"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: `1.5px solid ${NAVY[100]}`,
                      fontSize: 14,
                      color: NAVY[700],
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: NAVY[400],
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    새 패스워드
                  </label>
                  <input
                    type="password"
                    value={pwForm.new1}
                    onChange={(e) => {
                      setPwForm((p) => ({ ...p, new1: e.target.value }));
                      setPwMsg({ text: "", ok: false });
                    }}
                    placeholder="새 패스워드 입력"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: `1.5px solid ${NAVY[100]}`,
                      fontSize: 14,
                      color: NAVY[700],
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: NAVY[400],
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    패스워드 확인
                  </label>
                  <input
                    type="password"
                    value={pwForm.new2}
                    onChange={(e) => {
                      setPwForm((p) => ({ ...p, new2: e.target.value }));
                      setPwMsg({ text: "", ok: false });
                    }}
                    placeholder="새 패스워드 재입력"
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      document.getElementById("pw-change-btn")?.click()
                    }
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: `1.5px solid ${NAVY[100]}`,
                      fontSize: 14,
                      color: NAVY[700],
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                {pwMsg.text && (
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: pwMsg.ok ? ACCENT.green : ACCENT.red,
                      textAlign: "center",
                    }}
                  >
                    {pwMsg.text}
                  </p>
                )}
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    justifyContent: "flex-end",
                    marginTop: 8,
                  }}
                >
                  <button
                    onClick={() => setShowPwChange(false)}
                    style={{
                      padding: "10px 24px",
                      borderRadius: 12,
                      border: `1.5px solid ${NAVY[100]}`,
                      background: "white",
                      fontSize: 14,
                      fontWeight: 600,
                      color: NAVY[400],
                      cursor: "pointer",
                    }}
                  >
                    취소
                  </button>
                  <button
                    id="pw-change-btn"
                    onClick={() => {
                      if (!pwForm.old) {
                        setPwMsg({
                          text: "기존 패스워드를 입력해주세요.",
                          ok: false,
                        });
                        return;
                      }
                      if (ppwForm.old !== String(currentUser.pw)) {
                        setPwMsg({
                          text: "기존 패스워드가 일치하지 않습니다.",
                          ok: false,
                        });
                        return;
                      }
                      if (!pwForm.new1) {
                        setPwMsg({
                          text: "새 패스워드를 입력해주세요.",
                          ok: false,
                        });
                        return;
                      }
                      if (pwForm.new1 !== pwForm.new2) {
                        setPwMsg({
                          text: "새 패스워드가 일치하지 않습니다.",
                          ok: false,
                        });
                        return;
                      }
                      const updatedMember = { ...currentUser, pw: pwForm.new1 };
                      const updated = members.map((m) =>
                        m.id === currentUser.id ? updatedMember : m,
                      );
                      setMembers(updated);
                      setCurrentUser(updatedMember);
                      db.upsertMember(updatedMember);
                      setPwMsg({
                        text: "패스워드가 변경되었습니다.",
                        ok: true,
                      });
                      setTimeout(() => setShowPwChange(false), 1500);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "10px 24px",
                      borderRadius: 12,
                      border: "none",
                      background: ACCENT.blue,
                      color: "white",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <Check size={16} /> 변경
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div
          style={{ padding: "12px 20px", borderTop: `1px solid ${NAVY[600]}` }}
        >
          <p style={{ fontSize: 10, color: NAVY[500], lineHeight: 1.5 }}>
            {useAPI ? "● Supabase DB 연동" : "● 로컬 저장 모드"}
          </p>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1, padding: 28, overflow: "auto" }}>
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: NAVY[700] }}>
              {viewLabel}
            </h2>
            <p style={{ fontSize: 13, color: NAVY[300], marginTop: 2 }}>
              {new Date().toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "long",
              })}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                background: ACCENT.green + "16",
                color: ACCENT.green,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              KCA
            </div>
          </div>
        </div>

        {view === "dashboard" && (
          <DashboardView records={yearRecords} kcaData={kcaData} />
        )}
        {view === "entry" && (
          <DataEntryView
            records={yearRecords}
            onAdd={addRecord}
            onDelete={deleteRecord}
            onUpdate={updateRecord}
            members={activeMemberNames}
            clients={clients}
            onNavigateToClients={() => setView("clients")}
            currentUser={currentUser}
          />
        )}
        {view === "individual" && (
          <IndividualStatsView records={yearRecords} members={activeMemberNames} selectedYear={selectedYear} />
        )}
        {view === "teamstats" && <TeamStatsView records={yearRecords} selectedYear={selectedYear} />}
        {view === "monthlystats" && (
          <MonthlyStatsView records={yearRecords} kcaData={kcaData} selectedYear={selectedYear} />
        )}
        {view === "report" && (
          <ReportView stats={stats} records={yearRecords} kcaData={kcaData} members={members} />
        )}
        {view === "review" && (
          <ReviewView
            records={yearReviews}
            onAdd={addReview}
            onDelete={deleteReview}
            onUpdate={updateReview}
            members={memberNames}
            clients={clients}
            currentUser={currentUser}
            onNavigateToClients={() => setView("clients")}
          />
        )}
        {view === "schedule" && (
          <ScheduleView
            schedules={schedules}
            onAdd={(s) => { setSchedules((prev) => [...prev, s]); db.upsertSchedule(s); }}
            onDelete={(id) => { setSchedules((prev) => prev.filter((s) => s.id !== id)); db.deleteSchedule(id); }}
            onUpdate={(updated) => { setSchedules((prev) => prev.map((s) => (s.id === updated.id ? updated : s))); db.upsertSchedule(updated); }}
            currentUser={currentUser}
          />
        )}
        {view === "team" && (
          <TeamMemberListView members={members} onUpdate={(m) => { setMembers(m); db.saveMembers(m); }} />
        )}
        {view === "clients" && (
          <MasterListView
            items={clients}
            onUpdate={(c) => { setClients(c); db.saveClients(c); }}
            title="발주기관"
            unit="개"
            placeholder="기관명 입력"
            deleteLabel="발주기관 삭제"
          />
        )}
        {view === "kcasetting" && (
          <KcaSettingsView kcaData={kcaData} onUpdate={(k) => { setKcaData(k); db.saveKcaData(k); }} />
        )}
      </main>

      <link
        href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;800&display=swap"
        rel="stylesheet"
      />
    </div>
  );
}
