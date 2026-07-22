import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

// ─── 연결 상태 ───
export function isSupabaseConfigured() {
  return !!supabase;
}

// ─── Members ───
export async function loadMembers() {
  if (!supabase) return null;
  const { data, error } = await supabase.from("members").select("*");
  if (error) return null;
  return data;
}

export async function saveMembers(members) {
  if (!supabase) return;
  await supabase.from("members").delete().neq("id", "");
  if (members.length > 0) {
    const { error } = await supabase.from("members").upsert(members, { onConflict: "id" });
    if (error) console.error("[DB] saveMembers:", error.message);
  }
}

export async function upsertMember(member) {
  if (!supabase) return;
  const { error } = await supabase.from("members").upsert(member, { onConflict: "id" });
  if (error) console.error("[DB] upsertMember:", error.message);
}

export async function deleteMember(id) {
  if (!supabase) return;
  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) console.error("[DB] deleteMember:", error.message);
}

// ─── Records ───
// assistants 필드: 앱에서는 배열, DB에서는 JSON 문자열
function recordToRow(record) {
  const row = { ...record, id: String(record.id) };
  if (Array.isArray(row.assistants)) {
    row.assistants = JSON.stringify(row.assistants);
  }
  return row;
}
function rowToRecord(row) {
  if (row.assistants && typeof row.assistants === "string") {
    try { row.assistants = JSON.parse(row.assistants); } catch { row.assistants = []; }
  }
  if (!row.assistants) row.assistants = [];
  return row;
}

export async function loadRecords() {
  if (!supabase) return null;
  const { data, error } = await supabase.from("records").select("*");
  if (error) { console.error("[DB] loadRecords:", error.message); return null; }
  return data.map(rowToRecord);
}

export async function upsertRecord(record) {
  if (!supabase) return;
  const { error } = await supabase.from("records").upsert(recordToRow(record), { onConflict: "id" });
  if (error) console.error("[DB] upsertRecord:", error.message);
}

export async function deleteRecord(id) {
  if (!supabase) { console.warn("[DB] supabase not configured"); return; }
  const strId = String(id);
  console.log("[DB] deleteRecord id:", strId, "type:", typeof strId);
  const { data, error } = await supabase.from("records").delete().eq("id", strId).select();
  if (error) console.error("[DB] deleteRecord error:", error.message);
  else console.log("[DB] deleteRecord result:", data);
}

export async function upsertRecords(records) {
  if (!supabase || records.length === 0) return;
  const { error } = await supabase.from("records").upsert(records.map(recordToRow), { onConflict: "id" });
  if (error) console.error("[DB] upsertRecords:", error.message);
}

// ─── Clients ───
export async function loadClients() {
  if (!supabase) return null;
  const { data, error } = await supabase.from("clients").select("name");
  if (error) return null;
  return data.map((c) => c.name);
}

export async function saveClients(clients) {
  if (!supabase) return;
  await supabase.from("clients").delete().neq("name", "");
  if (clients.length > 0) {
    const { error } = await supabase
      .from("clients")
      .upsert(
        clients.map((name) => ({ name })),
        { onConflict: "name" },
      );
    if (error) console.error("[DB] saveClients:", error.message);
  }
}

export async function addClient(name) {
  if (!supabase) return;
  await supabase.from("clients").upsert({ name }, { onConflict: "name" });
}

export async function deleteClient(name) {
  if (!supabase) return;
  await supabase.from("clients").delete().eq("name", name);
}

export async function renameClient(oldName, newName) {
  if (!supabase) return;
  await supabase.from("clients").delete().eq("name", oldName);
  await supabase.from("clients").upsert({ name: newName }, { onConflict: "name" });
}

// ─── Reviews ───
export async function loadReviews() {
  if (!supabase) return null;
  const { data, error } = await supabase.from("reviews").select("*");
  if (error) return null;
  return data;
}

export async function upsertReview(review) {
  if (!supabase) return;
  const row = { ...review, id: String(review.id) };
  const { error } = await supabase.from("reviews").upsert(row, { onConflict: "id" });
  if (error) console.error("[DB] upsertReview:", error.message);
}

export async function deleteReview(id) {
  if (!supabase) return;
  const { error } = await supabase.from("reviews").delete().eq("id", String(id));
  if (error) console.error("[DB] deleteReview:", error.message);
}

export async function upsertReviews(reviews) {
  if (!supabase || reviews.length === 0) return;
  const rows = reviews.map(r => ({ ...r, id: String(r.id) }));
  const { error } = await supabase.from("reviews").upsert(rows, { onConflict: "id" });
  if (error) console.error("[DB] upsertReviews:", error.message);
}

// ─── Review Targets ───
function rtRowToRecord(row) {
  return { ...row, is_close: row.is_close ? "Y" : "N" };
}
function rtRecordToRow(record) {
  return { ...record, id: String(record.id), is_close: record.is_close === "Y" };
}

export async function loadReviewTargets() {
  if (!supabase) return null;
  const { data, error } = await supabase.from("reviews_targets").select("*");
  if (error) return null;
  return data.map(rtRowToRecord);
}

export async function upsertReviewTarget(record) {
  if (!supabase) return;
  const { error } = await supabase.from("reviews_targets").upsert(rtRecordToRow(record), { onConflict: "id" });
  if (error) console.error("[DB] upsertReviewTarget:", error.message);
}

export async function deleteReviewTarget(id) {
  if (!supabase) return;
  const { error } = await supabase.from("reviews_targets").delete().eq("id", String(id));
  if (error) console.error("[DB] deleteReviewTarget:", error.message);
}

export async function upsertReviewTargets(records) {
  if (!supabase || records.length === 0) return;
  const rows = records.map(rtRecordToRow);
  const { error } = await supabase.from("reviews_targets").upsert(rows, { onConflict: "id" });
  if (error) console.error("[DB] upsertReviewTargets:", error.message);
}

// ─── Schedules ───
export async function loadSchedules() {
  if (!supabase) return null;
  const { data, error } = await supabase.from("schedules").select("*");
  if (error) return null;
  return data;
}

export async function upsertSchedule(schedule) {
  if (!supabase) return;
  const row = { ...schedule, id: String(schedule.id) };
  const { error } = await supabase.from("schedules").upsert(row, { onConflict: "id" });
  if (error) console.error("[DB] upsertSchedule:", error.message);
}

export async function deleteSchedule(id) {
  if (!supabase) return;
  const { error } = await supabase.from("schedules").delete().eq("id", String(id));
  if (error) console.error("[DB] deleteSchedule:", error.message);
}

// ─── KCA Data ───
export async function loadKcaData() {
  if (!supabase) return null;
  const { data, error } = await supabase.from("kca_data").select("*");
  if (error) return null;
  const obj = {};
  data.forEach((row) => {
    obj[row.year] = row.amount;
  });
  return obj;
}

export async function saveKcaData(kcaObj) {
  if (!supabase) return;
  await supabase.from("kca_data").delete().neq("year", "");
  const rows = Object.entries(kcaObj).map(([year, amount]) => ({
    year,
    amount,
  }));
  if (rows.length > 0) {
    await supabase.from("kca_data").upsert(rows, { onConflict: "year" });
  }
}

export async function upsertKcaYear(year, amount) {
  if (!supabase) return;
  await supabase
    .from("kca_data")
    .upsert({ year, amount }, { onConflict: "year" });
}

export async function deleteKcaYear(year) {
  if (!supabase) return;
  await supabase.from("kca_data").delete().eq("year", year);
}
