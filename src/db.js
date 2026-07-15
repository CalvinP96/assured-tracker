import { supabase } from "./supabaseClient";

// ─────────────────────────────────────────────────────────────────
// Data layer for App.jsx.
//
// Projects and users live in Supabase (tracker_projects /
// tracker_users — see migration-db-tables.sql) as JSONB blobs so the
// app can evolve fields without schema migrations. If Supabase is
// unreachable, reads and writes fall back to localStorage so the app
// keeps working offline; data re-syncs on the next successful save.
//
// The session (which PIN user is logged in + where they were) is
// device-specific, so it always lives in localStorage.
// ─────────────────────────────────────────────────────────────────

const LS_PROJECTS = "aes-projects";
const LS_USERS = "aes-users";
const LS_SESSION = "aes-session";

const lsGet = (key) => {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
};
const lsSet = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full/blocked */ }
};

// ── Projects ─────────────────────────────────────────────────────

export async function loadProjects() {
  try {
    const { data, error } = await supabase.from("tracker_projects").select("id, data");
    if (error) throw error;
    const projects = data.map((row) => row.data);
    lsSet(LS_PROJECTS, projects); // keep offline copy fresh
    return projects;
  } catch (err) {
    console.warn("loadProjects: Supabase unavailable, using local copy.", err?.message || err);
    return lsGet(LS_PROJECTS);
  }
}

export async function saveProjects(projects) {
  lsSet(LS_PROJECTS, projects); // never lose work, even offline
  try {
    const rows = projects.map((p) => ({ id: p.id, data: p }));
    const { error } = await supabase.from("tracker_projects").upsert(rows);
    if (error) throw error;
    // Remove projects deleted in the app
    const keep = projects.map((p) => p.id);
    const del = supabase.from("tracker_projects").delete();
    const { error: delErr } = keep.length
      ? await del.not("id", "in", `(${keep.map((id) => `"${id}"`).join(",")})`)
      : await del.neq("id", "");
    if (delErr) throw delErr;
  } catch (err) {
    console.warn("saveProjects: Supabase unavailable, saved locally only.", err?.message || err);
  }
}

// ── Users ────────────────────────────────────────────────────────

export async function loadUsers() {
  try {
    const { data, error } = await supabase.from("tracker_users").select("id, data");
    if (error) throw error;
    const users = data.map((row) => row.data);
    lsSet(LS_USERS, users);
    return users;
  } catch (err) {
    console.warn("loadUsers: Supabase unavailable, using local copy.", err?.message || err);
    return lsGet(LS_USERS) || [];
  }
}

export async function saveUser(user) {
  const local = lsGet(LS_USERS) || [];
  lsSet(LS_USERS, [...local.filter((u) => u.id !== user.id), user]);
  try {
    const { error } = await supabase
      .from("tracker_users")
      .upsert({ id: user.id, data: user });
    if (error) throw error;
  } catch (err) {
    console.warn("saveUser: Supabase unavailable, saved locally only.", err?.message || err);
  }
}

export async function deleteUser(id) {
  const local = lsGet(LS_USERS) || [];
  lsSet(LS_USERS, local.filter((u) => u.id !== id));
  try {
    const { error } = await supabase.from("tracker_users").delete().eq("id", id);
    if (error) throw error;
  } catch (err) {
    console.warn("deleteUser: Supabase unavailable, deleted locally only.", err?.message || err);
  }
}

// ── Session (device-local, synchronous) ──────────────────────────

export function getSession() {
  return lsGet(LS_SESSION);
}

export function setSession(userId) {
  if (userId === null || userId === undefined) {
    localStorage.removeItem(LS_SESSION);
  } else {
    lsSet(LS_SESSION, { ...(getSession() || {}), userId });
  }
}

export function setSessionNav(nav) {
  const session = getSession();
  if (session?.userId) lsSet(LS_SESSION, { ...session, ...nav });
}
