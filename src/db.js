// ─────────────────────────────────────────────────────────────────
// Data layer for App.jsx — localStorage persistence.
//
// All data (projects, PIN users, session) lives in the browser.
// To move to a hosted backend later, reimplement these eight
// functions against the new API; App.jsx doesn't need to change.
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
  return lsGet(LS_PROJECTS);
}

export async function saveProjects(projects) {
  lsSet(LS_PROJECTS, projects);
}

// ── Users ────────────────────────────────────────────────────────

export async function loadUsers() {
  return lsGet(LS_USERS) || [];
}

export async function saveUser(user) {
  const users = lsGet(LS_USERS) || [];
  lsSet(LS_USERS, [...users.filter((u) => u.id !== user.id), user]);
}

export async function deleteUser(id) {
  const users = lsGet(LS_USERS) || [];
  lsSet(LS_USERS, users.filter((u) => u.id !== id));
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
