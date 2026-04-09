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
    await supabase.from("members").upsert(members, { onConflict: "id" });
  }
}

export async function upsertMember(member) {
  if (!supabase) return;
  await supabase.from("members").upsert(member, { onConflict: "id" });
}

export async function deleteMember(id) {
  if (!supabase) return;
  await supabase.from("members").delete().eq("id", id);
}

// ─── Records ───
export async function loadRecords() {
  if (!supabase) return null;
  const { data, error } = await supabase.from("records").select("*");
  if (error) return null;
  return data;
}

export async function upsertRecord(record) {
  if (!supabase) return;
  await supabase.from("records").upsert(record, { onConflict: "id" });
}

export async function deleteRecord(id) {
  if (!supabase) return;
  await supabase.from("records").delete().eq("id", id);
}

export async function upsertRecords(records) {
  if (!supabase || records.length === 0) return;
  await supabase.from("records").upsert(records, { onConflict: "id" });
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
    await supabase
      .from("clients")
      .upsert(
        clients.map((name) => ({ name })),
        { onConflict: "name" },
      );
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
  await supabase.from("reviews").upsert(review, { onConflict: "id" });
}

export async function deleteReview(id) {
  if (!supabase) return;
  await supabase.from("reviews").delete().eq("id", id);
}

export async function upsertReviews(reviews) {
  if (!supabase || reviews.length === 0) return;
  await supabase.from("reviews").upsert(reviews, { onConflict: "id" });
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
  await supabase.from("schedules").upsert(schedule, { onConflict: "id" });
}

export async function deleteSchedule(id) {
  if (!supabase) return;
  await supabase.from("schedules").delete().eq("id", id);
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
