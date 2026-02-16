import { useState, useMemo, useEffect, useCallback } from "react";
import { useProjects } from "./useProjects";
import { useAuth } from "./Auth";

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = d => {
  if (!d) return "—";
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const today = () => new Date().toISOString().split("T")[0];
const parseLocal = d => { const [y,m,day] = d.split("-").map(Number); return new Date(y, m-1, day); };
const diffDays = (a, b) => {
  if (!a || !b) return null;
  return Math.round((parseLocal(b) - parseLocal(a)) / 86400000);
};
const daysSince = d => d ? Math.round((new Date().setHours(0,0,0,0) - parseLocal(d)) / 86400000) : null;

// Count only Mon-Fri between two dates
const diffBizDays = (a, b) => {
  if (!a || !b) return null;
  const start = parseLocal(a);
  const end = parseLocal(b);
  let count = 0;
  const d = new Date(start);
  const direction = end >= start ? 1 : -1;
  if (direction === 1) {
    d.setDate(d.getDate() + 1);
    while (d <= end) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) count++;
      d.setDate(d.getDate() + 1);
    }
  } else {
    return -diffBizDays(b, a);
  }
  return count;
};
const bizDaysSince = d => d ? diffBizDays(d, today()) : null;

const STAGES = ["Lead","Assessment Scheduled","Assessment Complete","Scope Submitted to RISE","RI Approved","Install Scheduled","Install Complete","Closed"];
const DOCS_WHE = ["Signed Audit Report","Manual J","Manual S","Customer Auth Form","Pre-install Photos","Scope of Work","AHRI Certificate","Post Inspection Form","Customer Acknowledgement","Invoice"];
const DOCS_HES = ["Signed Audit Report","Customer Auth Form","Pre-install Photos","Scope of Work","Post Inspection Form","Customer Acknowledgement","Invoice"];
const PERMIT_STATUSES = ["N/A","Not Applied","Applied","Approved","Issued","Final Inspection","Closed"];

const defaultProject = (program) => ({
  id: crypto.randomUUID(),
  program,
  customerName: "",
  address: "",
  stage: STAGES[0],
  type: "Comprehensive",
  leadDate: "",
  assessmentDate: "",
  riseSubmitDate: "",
  riApprovedDate: "",
  installDate: "",
  lastInstallDate: "",
  nextInstallDate: "",
  totalJobPrice: "",
  invoiceable: false,
  invoiceSubmittedDate: "",
  permitStatus: "N/A",
  permitNumber: "",
  permitAppliedDate: "",
  permitIssuedDate: "",
  permitJurisdiction: "",
  permitInspectionDate: "",
  permitClosedDate: "",
  permitNotes: "",
  docs: {},
  stageHistory: [],
  notes: "",
  onHold: false,
  holdReason: "",
  holdDate: "",
  holdParty: "",
  nextAction: "",
  nextActionDate: "",
  nextActionOwner: "",
  createdAt: today(),
});

const COLORS = {
  whe: "#3b82f6",
  hes: "#10b981",
  warn: "#f59e0b",
  danger: "#dc2626",
  ok: "#10b981",
  gray: "#6b7280",
  purple: "#8b5cf6",
  brand: "#991b1b",
  brandLight: "#dc2626",
  hold: "#ef4444",
  asi: "#f97316",
};

const HOLD_PARTIES = ["Us","Customer","Utility","Contractor","Permit Office","Other"];
const ACTION_OWNERS = ["Us","Customer","Utility","Contractor","Permit Office","Other"];

// ── themes ────────────────────────────────────────────────────────────────────
const themes = {
  dark: {
    bg: "#18181b",
    headerBg: "linear-gradient(135deg, #1c1917 0%, #27272a 100%)",
    headerBorder: "#991b1b",
    cardBg: "#27272a",
    cardBorder: "#3f3f46",
    cardHover: "0 8px 24px rgba(0,0,0,0.5)",
    cardShadow: "0 4px 12px rgba(0,0,0,0.3)",
    inputBg: "#18181b",
    inputBorder: "#3f3f46",
    text: "#f4f4f5",
    textSecondary: "#a1a1aa",
    textMuted: "#71717a",
    rowBorder: "#27272a",
    alertBg: "#7c2d12",
    alertBorder: "#dc2626",
    alertText: "#fca5a5",
    alertTextSub: "#d1d5db",
    warnBg: "#7c2d12",
    warnBorder: "#f59e0b",
    checkboxLabelBg: "#27272a",
    activeCheckboxBg: "#581c87",
    tabInactiveBg: "#27272a",
    tabInactiveText: "#a1a1aa",
    funnelBg: "#27272a",
    funnelItemBg: "#18181b",
    funnelItemText: "#f4f4f5",
    funnelLabelText: "#a1a1aa",
    selectOptionBg: "#18181b",
    statBg: "#27272a",
    statBorder: "#3f3f46",
    statLabel: "#71717a",
    statValue: "#f4f4f5",
  },
  light: {
    bg: "#f4f4f5",
    headerBg: "linear-gradient(135deg, #fff 0%, #f8fafc 100%)",
    headerBorder: "#991b1b",
    cardBg: "#ffffff",
    cardBorder: "#e4e4e7",
    cardHover: "0 8px 24px rgba(0,0,0,0.1)",
    cardShadow: "0 1px 4px rgba(0,0,0,0.06)",
    inputBg: "#ffffff",
    inputBorder: "#d4d4d8",
    text: "#18181b",
    textSecondary: "#52525b",
    textMuted: "#71717a",
    rowBorder: "#e4e4e7",
    alertBg: "#fef2f2",
    alertBorder: "#dc2626",
    alertText: "#991b1b",
    alertTextSub: "#52525b",
    warnBg: "#fffbeb",
    warnBorder: "#f59e0b",
    checkboxLabelBg: "#f4f4f5",
    activeCheckboxBg: "#f3e8ff",
    tabInactiveBg: "#e4e4e7",
    tabInactiveText: "#52525b",
    funnelBg: "#ffffff",
    funnelItemBg: "#f4f4f5",
    funnelItemText: "#18181b",
    funnelLabelText: "#52525b",
    selectOptionBg: "#ffffff",
    statBg: "#ffffff",
    statBorder: "#e4e4e7",
    statLabel: "#71717a",
    statValue: "#18181b",
  },
};

// ── storage (theme only — projects now in Supabase) ──────────────────────────
const THEME_KEY = "whe_hes_theme";
const loadTheme = () => {
  try { return localStorage.getItem(THEME_KEY) || "dark"; } catch { return "dark"; }
};
const saveTheme = t => {
  try { localStorage.setItem(THEME_KEY, t); } catch {}
};

// ── sub-components (OUTSIDE App to prevent remount/scroll-jump on re-render) ─
const Badge = ({ label, color = "#6b7280", small }) => (
  <span style={{
    background: color + "22", color, border: `1px solid ${color}44`,
    borderRadius: 999, padding: small ? "1px 7px" : "2px 10px",
    fontSize: small ? 11 : 12, fontWeight: 600, whiteSpace: "nowrap"
  }}>{label}</span>
);

const Stat = ({ label, value, sub, color, t }) => (
  <div style={{ background: t.statBg, borderRadius: 12, padding: "14px 18px", boxShadow: t.cardShadow, flex: 1, minWidth: 130, border: `1px solid ${t.statBorder}` }}>
    <div style={{ fontSize: 11, color: t.statLabel, fontWeight: 600, textTransform: "uppercase", letterSpacing: .5 }}>{label}</div>
    <div style={{ fontSize: 26, fontWeight: 800, color: color || t.statValue, lineHeight: 1.2, marginTop: 4 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: t.statLabel, marginTop: 2 }}>{sub}</div>}
  </div>
);

const ThemeToggle = ({ theme, setTheme }) => {
  const isDark = theme === "dark";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 14 }}>☀️</span>
      <div
        onClick={() => setTheme(isDark ? "light" : "dark")}
        style={{
          width: 44, height: 24, borderRadius: 12, cursor: "pointer",
          background: isDark ? "#991b1b" : "#d4d4d8",
          position: "relative", transition: "background .2s",
          border: `1px solid ${isDark ? "#7f1d1d" : "#a1a1aa"}`,
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: 9,
          background: "#fff",
          position: "absolute", top: 2,
          left: isDark ? 22 : 2,
          transition: "left .2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }} />
      </div>
      <span style={{ fontSize: 14 }}>🌙</span>
    </div>
  );
};

const Section = ({ title, children, t }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: t.text }}>{title}</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>{children}</div>
  </div>
);

const Field = ({ label, children, t }) => (
  <div>
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 4 }}>{label}</label>
    {children}
  </div>
);

const Row = ({ k, v, t }) => (
  <div style={{ display: "flex", gap: 8, padding: "4px 0", borderBottom: `1px solid ${t.rowBorder}` }}>
    <span style={{ fontSize: 11, color: t.textMuted, minWidth: 110, textTransform: "uppercase", letterSpacing: .3 }}>{k}</span>
    <span style={{ fontSize: 12, color: t.text, fontWeight: 500 }}>{v}</span>
  </div>
);

// ── permit helpers ────────────────────────────────────────────────────────────
const permitStageIndex = (status) => {
  const order = ["Not Applied","Applied","Approved","Issued","Final Inspection","Closed"];
  return order.indexOf(status);
};
const permitProgressPct = (status) => {
  if (status === "N/A") return 0;
  const idx = permitStageIndex(status);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / 6) * 100);
};
const permitStatusColor = (status) => {
  if (status === "N/A") return COLORS.gray;
  if (status === "Closed") return COLORS.ok;
  if (status === "Issued" || status === "Final Inspection") return COLORS.whe;
  if (status === "Applied") return COLORS.warn;
  if (status === "Approved") return COLORS.purple;
  return COLORS.warn;
};

// ── main ──────────────────────────────────────────────────────────────────────
export default function App() {
  const {
    projects, loading: dbLoading, error: dbError, clearError: clearDbError,
    addProject: dbAdd, updateProject: dbUpdate, deleteProject: dbDelete,
  } = useProjects();
  const auth = useAuth();
  const [tab, setTab] = useState("Overview");
  const [view, setView] = useState("list");
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [holdFilter, setHoldFilter] = useState("All");
  const [theme, setThemeState] = useState(loadTheme);
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calSelectedDay, setCalSelectedDay] = useState(null);
  const [calEventFilters, setCalEventFilters] = useState({
    lead: true, assessment: true, riseSubmit: true, riApproved: true,
    install: true, lastInstall: true, nextInstall: true, invoice: true,
    permitApplied: true, permitIssued: true, permitInspection: true, permitClosed: true,
  });
  const [calProgFilter, setCalProgFilter] = useState("All");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);

  const setTheme = (th) => { setThemeState(th); saveTheme(th); };
  const t = themes[theme];

  const autoUpdateStage = (projectData) => {
    const now = today();
    let newStage = projectData.stage;
    if (projectData.invoiceSubmittedDate) {
      newStage = "Closed";
    } else if (projectData.lastInstallDate && projectData.lastInstallDate <= now) {
      newStage = "Install Complete";
    } else if (projectData.installDate || projectData.nextInstallDate || projectData.lastInstallDate) {
      newStage = "Install Scheduled";
    } else if (projectData.riApprovedDate) {
      newStage = "RI Approved";
    } else if (projectData.riseSubmitDate) {
      newStage = "Scope Submitted to RISE";
    } else if (projectData.assessmentDate) {
      const assessDate = parseLocal(projectData.assessmentDate);
      const todayDate = parseLocal(now);
      if (assessDate < todayDate) {
        newStage = "Assessment Complete";
      } else {
        newStage = "Assessment Scheduled";
      }
    } else if (projectData.leadDate) {
      newStage = "Lead";
    }
    return newStage;
  };

  // Auto-update stages on load (syncs to DB for any that changed)
  useEffect(() => {
    if (dbLoading || !projects.length) return;
    const now = today();
    projects.forEach(p => {
      const updatedStage = autoUpdateStage(p);
      if (updatedStage !== p.stage) {
        const hist = [...(p.stageHistory || [])];
        hist.push({ stage: updatedStage, date: now });
        dbUpdate({ ...p, stage: updatedStage, stageHistory: hist });
      }
    });
  }, [dbLoading]);

  const prog = tab === "Overview" || tab === "KPIs" || tab === "Calendar" ? null : tab;
  const isASI = prog === "ASI";
  const docs = prog === "WHE SF" ? DOCS_WHE : DOCS_HES;

  const filtered = useMemo(() => {
    let ps = prog ? projects.filter(p => p.program === prog) : projects;
    if (search) ps = ps.filter(p => (p.customerName + p.address).toLowerCase().includes(search.toLowerCase()));
    if (stageFilter !== "All") ps = ps.filter(p => p.stage === stageFilter);
    if (typeFilter !== "All") ps = ps.filter(p => p.type === typeFilter);
    if (holdFilter === "On Hold") ps = ps.filter(p => p.onHold);
    else if (holdFilter === "Active") ps = ps.filter(p => !p.onHold);
    else if (holdFilter === "Customer Wait") ps = ps.filter(p => p.nextActionOwner === "Customer" || p.holdParty === "Customer");
    return ps.sort((a, b) => (a.nextInstallDate || "9999") > (b.nextInstallDate || "9999") ? 1 : -1);
  }, [projects, prog, search, stageFilter, typeFilter, holdFilter]);

  const metrics = useMemo(() => {
    const ps = prog ? projects.filter(p => p.program === prog) : projects;
    const total = ps.length;
    const comp = ps.filter(p => p.type === "Comprehensive").length;
    const def = ps.filter(p => p.type === "Deferred").length;
    const withAssess = ps.filter(p => p.assessmentDate && p.riseSubmitDate);
    const compliant48 = withAssess.filter(p => diffBizDays(p.assessmentDate, p.riseSubmitDate) <= 2);
    const rise48Rate = withAssess.length ? Math.round(compliant48.length / withAssess.length * 100) : null;
    const rise48Issues = ps.filter(p => p.assessmentDate && !p.riseSubmitDate && bizDaysSince(p.assessmentDate) > 2);
    const invoiced = ps.filter(p => p.lastInstallDate && p.invoiceSubmittedDate);
    const overdueInvoices = ps.filter(p => p.invoiceable && p.lastInstallDate && p.lastInstallDate <= today() && !p.invoiceSubmittedDate);
    const closed = ps.filter(p => p.stage === "Closed" && p.assessmentDate && p.invoiceSubmittedDate);
    const avgProjectDays = closed.length
      ? Math.round(closed.reduce((s, p) => s + (diffDays(p.assessmentDate, p.invoiceSubmittedDate) || 0), 0) / closed.length)
      : null;
    const permitPending = ps.filter(p => ["Applied","Approved"].includes(p.permitStatus)).length;
    const onHoldCount = ps.filter(p => p.onHold).length;
    const customerWaitCount = ps.filter(p => p.nextActionOwner === "Customer" || p.holdParty === "Customer").length;
    const upcoming = ps.filter(p => p.nextInstallDate && p.nextInstallDate >= today()).sort((a,b)=>a.nextInstallDate>b.nextInstallDate?1:-1).slice(0,5);
    const invoiceable = overdueInvoices.length;
    const totalRevenue = ps.reduce((sum, p) => sum + (parseFloat(p.totalJobPrice) || 0), 0);
    const invoiceableRevenue = overdueInvoices.reduce((sum, p) => sum + (parseFloat(p.totalJobPrice) || 0), 0);
    const docsCheck = (p) => {
      if (p.program === "ASI") return { done: 0, total: 0 };
      const d = p.program === "HES IE" ? DOCS_HES : DOCS_WHE;
      const done = d.filter(k => p.docs?.[k]).length;
      return { done, total: d.length };
    };
    return { total, comp, def, rise48Rate, rise48Issues, withAssess, avgProjectDays, permitPending, onHoldCount, customerWaitCount, upcoming, docsCheck, invoiceable, overdueInvoices, totalRevenue, invoiceableRevenue, invoiced, closed };
  }, [projects, prog]);

  // ── calendar event types & extraction ───────────────────────────────────────
  const EVENT_TYPES = {
    lead:             { label: "Lead",              color: "#6366f1", icon: "🎯" },
    assessment:       { label: "Assessment",        color: "#06b6d4", icon: "🔍" },
    riseSubmit:       { label: "RISE Submitted",    color: "#f59e0b", icon: "📤" },
    riApproved:       { label: "RI Approved",       color: "#10b981", icon: "✅" },
    install:          { label: "Install",           color: "#3b82f6", icon: "🔧" },
    lastInstall:      { label: "Last Install",      color: "#8b5cf6", icon: "🏁" },
    nextInstall:      { label: "Next Install",      color: "#ec4899", icon: "📅" },
    invoice:          { label: "Invoice Submitted", color: "#14b8a6", icon: "💰" },
    permitApplied:    { label: "Permit Applied",    color: "#a855f7", icon: "📋" },
    permitIssued:     { label: "Permit Issued",     color: "#22c55e", icon: "📜" },
    permitInspection: { label: "Permit Inspection", color: "#f97316", icon: "🏛" },
    permitClosed:     { label: "Permit Closed",     color: "#64748b", icon: "🔒" },
  };

  const calendarEvents = useMemo(() => {
    const events = [];
    const dateFields = [
      ["leadDate", "lead"],
      ["assessmentDate", "assessment"],
      ["riseSubmitDate", "riseSubmit"],
      ["riApprovedDate", "riApproved"],
      ["installDate", "install"],
      ["lastInstallDate", "lastInstall"],
      ["nextInstallDate", "nextInstall"],
      ["invoiceSubmittedDate", "invoice"],
      ["permitAppliedDate", "permitApplied"],
      ["permitIssuedDate", "permitIssued"],
      ["permitInspectionDate", "permitInspection"],
      ["permitClosedDate", "permitClosed"],
    ];
    let ps = projects;
    if (calProgFilter !== "All") ps = ps.filter(p => p.program === calProgFilter);
    ps.forEach(p => {
      dateFields.forEach(([field, type]) => {
        if (p[field] && calEventFilters[type]) {
          events.push({
            date: p[field],
            type,
            projectId: p.id,
            customerName: p.customerName || "Unnamed",
            address: p.address || "",
            program: p.program,
            stage: p.stage,
          });
        }
      });
    });
    return events;
  }, [projects, calEventFilters, calProgFilter]);

  const calEventsForDay = (day) => {
    const key = `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    return calendarEvents.filter(e => e.date === key);
  };

  const calMonthDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    return { firstDay, daysInMonth };
  }, [calYear, calMonth]);

  const calPrevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
    setCalSelectedDay(null);
  };
  const calNextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
    setCalSelectedDay(null);
  };
  const calToday = () => {
    const now = new Date();
    setCalMonth(now.getMonth());
    setCalYear(now.getFullYear());
    setCalSelectedDay(now.getDate());
  };

  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const toggleEventFilter = (key) => {
    setCalEventFilters(f => ({ ...f, [key]: !f[key] }));
  };
  const allFiltersOn = Object.values(calEventFilters).every(v => v);
  const toggleAllFilters = () => {
    const newVal = !allFiltersOn;
    setCalEventFilters(f => Object.fromEntries(Object.keys(f).map(k => [k, newVal])));
  };

  const openNew = () => { setForm(defaultProject(prog || "WHE SF")); setEditId(null); setConfirmDeleteId(null); setView("form"); };
  const openEdit = (p) => { setForm({ ...p }); setEditId(p.id); setConfirmDeleteId(null); setView("form"); };
  const openDetail = (p) => { setForm({ ...p }); setEditId(p.id); setConfirmDeleteId(null); setView("detail"); };

  const saveForm = async () => {
    setSaving(true);
    const now = today();
    const updatedStage = autoUpdateStage(form);
    if (editId) {
      const existing = projects.find(p => p.id === editId);
      const hist = [...(existing?.stageHistory || [])];
      if (updatedStage !== existing?.stage) hist.push({ stage: updatedStage, date: now });
      await dbUpdate({ ...form, stage: updatedStage, stageHistory: hist });
    } else {
      await dbAdd({ ...form, stage: updatedStage, stageHistory: [{ stage: updatedStage, date: now }] });
    }
    setSaving(false);
    setView("list"); setForm(null); setEditId(null);
  };

  const deleteProject = async (id) => {
    await dbDelete(id);
    setConfirmDeleteId(null);
    setView("list");
    setForm(null);
    setEditId(null);
  };
  const setDoc = (key, val) => setForm(f => ({ ...f, docs: { ...f.docs, [key]: val } }));

  const riseColor = (p) => {
    if (!p.assessmentDate) return COLORS.gray;
    if (p.riseSubmitDate) return diffBizDays(p.assessmentDate, p.riseSubmitDate) <= 2 ? COLORS.ok : COLORS.warn;
    const d = bizDaysSince(p.assessmentDate);
    if (d < 1) return COLORS.gray;
    if (d > 2) return COLORS.danger;
    return COLORS.warn;
  };
  const riseLabel = (p) => {
    if (!p.assessmentDate) return "No Assessment";
    if (p.riseSubmitDate) {
      const d = diffBizDays(p.assessmentDate, p.riseSubmitDate);
      if (d < 1) return "✓ Same day";
      return d <= 2 ? `✓ ${d}bd` : `⚠ ${d}bd`;
    }
    const d = bizDaysSince(p.assessmentDate);
    if (d < 1) return "RISE due";
    return d > 2 ? `! ${d}bd pending` : `${d}bd pending`;
  };
  const progColor = p => p === "WHE SF" ? COLORS.whe : p === "HES IE" ? COLORS.hes : p === "ASI" ? COLORS.asi : COLORS.purple;
  const tabColor = tab === "WHE SF" ? COLORS.whe : tab === "HES IE" ? COLORS.hes : tab === "ASI" ? COLORS.asi : COLORS.purple;

  const inputStyle = { padding:"8px 12px", border:`1px solid ${t.inputBorder}`, borderRadius:8, fontSize:13, width:"100%", background:t.inputBg, color:t.text };

  const TAB_ORDER = ["Overview","WHE SF","HES IE","ASI","Calendar","KPIs"];

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "system-ui,sans-serif" }}>
      {/* header */}
      <div style={{ background: t.headerBg, color: t.text, padding: "20px 28px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", borderBottom: `3px solid ${t.headerBorder}`, boxShadow: t.cardShadow }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 56, height: 56,
            background: "linear-gradient(135deg, #991b1b 0%, #dc2626 100%)",
            borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 900, fontSize: 32, color: "#fff",
            border: "2px solid #000", letterSpacing: -1,
            boxShadow: "0 4px 12px rgba(153,27,27,0.5)"
          }}>A</div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: 1, textTransform: "uppercase", color: t.text }}>Assured Energy Solutions</div>
            <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase" }}>Project Tracker • WHE SF • HES IE • ASI</div>
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={()=>{setTab("KPIs");setView("list");}} style={{
            padding: "8px 18px", borderRadius: 8,
            border: tab==="KPIs" ? "2px solid #991b1b" : `2px solid ${t.tabInactiveBg}`,
            cursor: "pointer", fontWeight: 800, fontSize: 13,
            textTransform: "uppercase", letterSpacing: 0.5,
            background: tab==="KPIs" ? "linear-gradient(135deg, #991b1b, #dc2626)" : t.tabInactiveBg,
            color: tab==="KPIs" ? "#fff" : t.tabInactiveText,
            transition: "all .2s",
            boxShadow: tab==="KPIs" ? "0 4px 12px rgba(153,27,27,0.4)" : "none"
          }}>KPIs</button>
          <div style={{ width: 1, height: 28, background: t.cardBorder, margin: "0 4px" }} />
          <ThemeToggle theme={theme} setTheme={setTheme} />
          <div style={{ width: 1, height: 28, background: t.cardBorder, margin: "0 4px" }} />
          {["Overview","WHE SF","HES IE","ASI","Calendar"].map(tName => (
            <button key={tName} onClick={()=>{setTab(tName);setView("list");}} style={{
              padding: "8px 18px", borderRadius: 8,
              border: tab===tName ? "2px solid #991b1b" : `2px solid ${t.tabInactiveBg}`,
              cursor: "pointer", fontWeight: 800, fontSize: 13,
              textTransform: "uppercase", letterSpacing: 0.5,
              background: tab===tName ? "linear-gradient(135deg, #991b1b, #dc2626)" : t.tabInactiveBg,
              color: tab===tName ? "#fff" : t.tabInactiveText,
              transition: "all .2s",
              boxShadow: tab===tName ? "0 4px 12px rgba(153,27,27,0.4)" : "none"
            }}>{tName}</button>
          ))}
          {auth && (
            <>
              <div style={{ width: 1, height: 28, background: t.cardBorder, margin: "0 4px" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: t.textMuted, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {auth.session?.user?.email}
                </span>
                <button onClick={auth.handleLogout} style={{ padding: "5px 10px", background: t.tabInactiveBg, border: `1px solid ${t.cardBorder}`, borderRadius: 6, cursor: "pointer", fontSize: 11, color: t.tabInactiveText, fontWeight: 600 }}>
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px" }}>

        {/* DB error toast */}
        {dbError && (
          <div style={{ background: t.alertBg, border: `1px solid ${COLORS.danger}`, borderRadius: 10, padding: "10px 16px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: t.alertText, fontWeight: 600 }}>⚠ Database error: {dbError}</span>
            <button onClick={clearDbError} style={{ background: "none", border: "none", color: t.alertText, cursor: "pointer", fontSize: 16, fontWeight: 700 }}>✕</button>
          </div>
        )}

        {/* Loading state */}
        {dbLoading && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 32, marginBottom: 12, animation: "spin 1s linear infinite" }}>⟳</div>
            <div style={{ fontSize: 14, color: t.textMuted, fontWeight: 600 }}>Loading projects from database…</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {!dbLoading && (<>

        {/* ── KPI TAB ── */}
        {tab === "KPIs" && (
          <div>
            <h2 style={{ fontWeight: 800, color: t.text, margin: "0 0 20px", fontSize: 22 }}>📊 Quarterly Performance KPIs</h2>

            {["HES IE", "WHE SF", "ASI"].map(program => {
              const ps = projects.filter(p => p.program === program);
              const isHES = program === "HES IE";
              const isASIProg = program === "ASI";
              const pc = program === "WHE SF" ? COLORS.whe : program === "ASI" ? COLORS.asi : COLORS.hes;

              if (isASIProg) {
                const installed = ps.filter(p=>p.installDate || p.lastInstallDate).length;
                const invoiced = ps.filter(p=>p.invoiceSubmittedDate).length;
                const needsInvoice = ps.filter(p=>p.installDate&&!p.invoiceSubmittedDate).length;
                const revenue = ps.reduce((s,p)=>s+(parseFloat(p.totalJobPrice)||0),0);
                const onHoldN = ps.filter(p=>p.onHold).length;
                const custWait = ps.filter(p=>p.holdParty==="Customer" || p.nextActionOwner==="Customer").length;
                return (
                  <div key={program} style={{ background: t.cardBg, borderRadius: 14, padding: "20px 24px", marginBottom: 20, boxShadow: t.cardShadow, border: `2px solid ${pc}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: pc }}>ASI</span>
                      <Badge label={`${ps.length} projects`} color={pc} />
                      <span style={{ fontSize:11, color:t.textMuted, fontStyle:"italic" }}>RISE Private Pay</span>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <Stat t={t} label="Total" value={ps.length} color={pc} />
                      <Stat t={t} label="Installed" value={installed} color={COLORS.ok} />
                      <Stat t={t} label="Pending Install" value={ps.length - installed} color={COLORS.warn} />
                      <Stat t={t} label="Invoiced" value={invoiced} color={COLORS.purple} />
                      <Stat t={t} label="Needs Invoice" value={needsInvoice} color={needsInvoice>0?COLORS.warn:COLORS.gray} />
                      <Stat t={t} label="Revenue" value={revenue > 0 ? `$${revenue.toLocaleString()}` : "$0"} color={COLORS.asi} />
                      <Stat t={t} label="On Hold" value={onHoldN} color={COLORS.hold} />
                    </div>
                  </div>
                );
              }

              const withLeadAssess = ps.filter(p => p.leadDate && p.assessmentDate);
              const leadToAssess = withLeadAssess.length ? Math.round(withLeadAssess.reduce((s, p) => s + (diffDays(p.leadDate, p.assessmentDate) || 0), 0) / withLeadAssess.length * 10) / 10 : null;
              const withAssess = ps.filter(p => p.assessmentDate && p.riseSubmitDate);
              const assessToRISE = withAssess.length ? Math.round(withAssess.reduce((s, p) => s + (diffBizDays(p.assessmentDate, p.riseSubmitDate) || 0), 0) / withAssess.length * 10) / 10 : null;
              const compliant48 = withAssess.filter(p => diffBizDays(p.assessmentDate, p.riseSubmitDate) <= 2);
              const rise48 = withAssess.length ? Math.round(compliant48.length / withAssess.length * 100) : null;
              const withRiseApproval = ps.filter(p => p.riseSubmitDate && p.riApprovedDate);
              const riseToApproval = withRiseApproval.length ? Math.round(withRiseApproval.reduce((s, p) => s + (diffDays(p.riseSubmitDate, p.riApprovedDate) || 0), 0) / withRiseApproval.length * 10) / 10 : null;
              const withApprovalInstall = ps.filter(p => p.riApprovedDate && p.lastInstallDate);
              const approvalToInstall = withApprovalInstall.length ? Math.round(withApprovalInstall.reduce((s, p) => s + (diffDays(p.riApprovedDate, p.lastInstallDate) || 0), 0) / withApprovalInstall.length * 10) / 10 : null;
              const invoiced = ps.filter(p => p.lastInstallDate && p.invoiceSubmittedDate);
              const invoiceTAT = invoiced.length ? Math.round(invoiced.reduce((s, p) => s + (diffDays(p.lastInstallDate, p.invoiceSubmittedDate) || 0), 0) / invoiced.length * 10) / 10 : null;
              const closed = ps.filter(p => p.stage === "Closed" && p.assessmentDate && p.invoiceSubmittedDate);
              const avgProject = closed.length ? Math.round(closed.reduce((s, p) => s + (diffDays(p.assessmentDate, p.invoiceSubmittedDate) || 0), 0) / closed.length) : null;
              const closedWithLead = ps.filter(p => p.stage === "Closed" && p.leadDate && p.invoiceSubmittedDate);
              const leadToClose = closedWithLead.length ? Math.round(closedWithLead.reduce((s, p) => s + (diffDays(p.leadDate, p.invoiceSubmittedDate) || 0), 0) / closedWithLead.length) : null;
              const completionRate = ps.length > 0 ? Math.round((ps.filter(p => p.stage === "Closed").length / ps.length) * 100) : null;
              const overdueInvoices = ps.filter(p => p.invoiceable && p.lastInstallDate && p.lastInstallDate <= today() && !p.invoiceSubmittedDate);

              return (
                <div key={program} style={{ background: t.cardBg, borderRadius: 14, padding: "20px 24px", marginBottom: 20, boxShadow: t.cardShadow, border: `2px solid ${pc}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: pc }}>{program}</span>
                    <Badge label={`${ps.length} projects`} color={pc} />
                    <Badge label={`${closed.length} closed`} color={COLORS.ok} small />
                    {!isHES && <Badge label="Tracking Only" color={COLORS.gray} small />}
                  </div>

                  {isHES && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: .5 }}>🎯 Graded KPIs</div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <Stat t={t} label="Lead → Assessment" value={leadToAssess !== null ? `${leadToAssess}d` : "—"} color={leadToAssess !== null ? (leadToAssess <= 10 ? COLORS.ok : leadToAssess <= 15 ? COLORS.warn : COLORS.danger) : t.textMuted} sub={`Target: ≤10d • ${withLeadAssess.length} tracked`} />
                        <Stat t={t} label="Assessment → RISE" value={assessToRISE !== null ? `${assessToRISE}bd` : "—"} color={assessToRISE !== null ? (assessToRISE <= 2 ? COLORS.ok : COLORS.danger) : t.textMuted} sub={`Target: ≤2 biz days • ${rise48}% compliant`} />
                        <Stat t={t} label="RI Approved → Install" value={approvalToInstall !== null ? `${approvalToInstall}d` : "—"} color={approvalToInstall !== null ? (approvalToInstall <= 5 ? COLORS.ok : approvalToInstall <= 7 ? COLORS.warn : COLORS.danger) : t.textMuted} sub={`Target: ≤5d • ${withApprovalInstall.length} installed`} />
                        <Stat t={t} label="Install → Invoice" value={invoiceTAT !== null ? `${invoiceTAT}d` : "—"} color={invoiceTAT !== null ? (invoiceTAT <= 1 ? COLORS.ok : invoiceTAT <= 3 ? COLORS.warn : COLORS.danger) : t.textMuted} sub={`Target: ≤1d • ${invoiced.length} invoiced`} />
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: .5 }}>
                      {isHES ? "📊 Additional Tracking" : "📊 Average Turnaround Times"}
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {!isHES && (
                        <>
                          <Stat t={t} label="Lead → Assessment" value={leadToAssess !== null ? `${leadToAssess}d` : "—"} color={t.textMuted} sub={`${withLeadAssess.length} tracked`} />
                          <Stat t={t} label="Assessment → RISE" value={assessToRISE !== null ? `${assessToRISE}bd` : "—"} color={t.textMuted} sub={`${withAssess.length} submitted`} />
                        </>
                      )}
                      <Stat t={t} label="RISE → RI Approval" value={riseToApproval !== null ? `${riseToApproval}d` : "—"} color={t.textMuted} sub={`${isHES ? 'Tracking only • ' : ''}${withRiseApproval.length} approved`} />
                      {!isHES && (
                        <>
                          <Stat t={t} label="RI Approved → Install" value={approvalToInstall !== null ? `${approvalToInstall}d` : "—"} color={t.textMuted} sub={`${withApprovalInstall.length} installed`} />
                          <Stat t={t} label="Install → Invoice" value={invoiceTAT !== null ? `${invoiceTAT}d` : "—"} color={t.textMuted} sub={`${invoiced.length} invoiced`} />
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: .5 }}>🎯 Full Cycle</div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <Stat t={t} label="Lead → Close" value={leadToClose !== null ? `${leadToClose}d` : "—"} color={COLORS.purple} sub={`${closedWithLead.length} closed w/ lead date`} />
                      <Stat t={t} label="Assessment → Close" value={avgProject !== null ? `${avgProject}d` : "—"} color={COLORS.purple} sub={`${closed.length} closed projects`} />
                      <Stat t={t} label="Completion Rate" value={completionRate !== null ? `${completionRate}%` : "—"} color={completionRate !== null ? (completionRate >= 70 ? COLORS.ok : completionRate >= 50 ? COLORS.warn : COLORS.danger) : t.textMuted} sub={`${ps.filter(p => p.stage === "Closed").length} / ${ps.length}`} />
                    </div>
                  </div>

                  {overdueInvoices.length > 0 && (
                    <div style={{ background: t.alertBg, border: `1px solid ${t.alertBorder}`, borderRadius: 8, padding: "10px 12px", fontSize: 12, marginTop: 16 }}>
                      <strong style={{color:t.alertText}}>⚠ {overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? "s" : ""}</strong> <span style={{color:t.alertTextSub}}>- Last install complete but not yet invoiced</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pipeline funnel */}
            <div style={{ background: t.funnelBg, borderRadius: 14, padding: "20px 24px", boxShadow: t.cardShadow, border: `1px solid ${t.cardBorder}` }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: t.text }}>Pipeline Funnel (All Projects)</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {STAGES.map(stage => {
                  const count = projects.filter(p => p.stage === stage).length;
                  return count > 0 ? (
                    <div key={stage} style={{ background: t.funnelItemBg, borderRadius: 8, padding: "8px 12px", flex: "1 1 auto", minWidth: 100, border: `1px solid ${t.cardBorder}` }}>
                      <div style={{ fontSize: 11, color: t.funnelLabelText, marginBottom: 2 }}>{stage}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: t.funnelItemText }}>{count}</div>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── CALENDAR TAB ── */}
        {tab === "Calendar" && (
          <div>
            <h2 style={{ fontWeight: 800, color: t.text, margin: "0 0 16px", fontSize: 22 }}>📅 Project Calendar</h2>

            {/* Controls row */}
            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={calPrevMonth} style={{ padding: "6px 14px", background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 8, cursor: "pointer", fontSize: 16, color: t.text, fontWeight: 700 }}>‹</button>
              <div style={{ fontWeight: 800, fontSize: 18, color: t.text, minWidth: 180, textAlign: "center" }}>
                {MONTH_NAMES[calMonth]} {calYear}
              </div>
              <button onClick={calNextMonth} style={{ padding: "6px 14px", background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 8, cursor: "pointer", fontSize: 16, color: t.text, fontWeight: 700 }}>›</button>
              <button onClick={calToday} style={{ padding: "5px 14px", background: "linear-gradient(135deg, #991b1b, #dc2626)", color: "#fff", border: "2px solid #000", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: .5 }}>Today</button>
              <div style={{ marginLeft: "auto" }}>
                <select value={calProgFilter} onChange={e => setCalProgFilter(e.target.value)} style={{ padding: "6px 12px", border: `1px solid ${t.inputBorder}`, borderRadius: 8, fontSize: 13, background: t.inputBg, color: t.text }}>
                  <option value="All">All Programs</option>
                  <option value="WHE SF">WHE SF</option>
                  <option value="HES IE">HES IE</option>
                  <option value="ASI">ASI</option>
                </select>
              </div>
            </div>

            {/* Event type filters */}
            <div style={{ background: t.cardBg, borderRadius: 12, padding: "12px 16px", marginBottom: 14, boxShadow: t.cardShadow, border: `1px solid ${t.cardBorder}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: .5 }}>Filter Events</span>
                <button onClick={toggleAllFilters} style={{ fontSize: 10, padding: "2px 8px", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 6, cursor: "pointer", color: t.textSecondary, fontWeight: 600 }}>
                  {allFiltersOn ? "Clear All" : "Select All"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(EVENT_TYPES).map(([key, { label, color, icon }]) => (
                  <button key={key} onClick={() => toggleEventFilter(key)}
                    style={{
                      padding: "4px 10px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 600,
                      border: `1.5px solid ${calEventFilters[key] ? color : t.inputBorder}`,
                      background: calEventFilters[key] ? color + "22" : t.inputBg,
                      color: calEventFilters[key] ? color : t.textMuted,
                      transition: "all .15s", display: "flex", alignItems: "center", gap: 4,
                    }}>
                    <span style={{ fontSize: 12 }}>{icon}</span> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Calendar grid */}
            <div style={{ background: t.cardBg, borderRadius: 14, boxShadow: t.cardShadow, border: `1px solid ${t.cardBorder}`, overflow: "hidden" }}>
              {/* Day headers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                {DAY_NAMES.map(d => (
                  <div key={d} style={{ padding: "10px 4px", textAlign: "center", fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: .5, borderBottom: `1px solid ${t.cardBorder}`, background: t.inputBg }}>
                    {d}
                  </div>
                ))}
              </div>
              {/* Day cells */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                {/* Empty leading cells */}
                {Array.from({ length: calMonthDays.firstDay }, (_, i) => (
                  <div key={`empty-${i}`} style={{ minHeight: 120, borderBottom: `1px solid ${t.cardBorder}`, borderRight: `1px solid ${t.cardBorder}`, background: t.bg + "66" }} />
                ))}
                {/* Actual day cells */}
                {Array.from({ length: calMonthDays.daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const dayEvents = calEventsForDay(day);
                  const isToday = day === new Date().getDate() && calMonth === new Date().getMonth() && calYear === new Date().getFullYear();
                  const isSelected = day === calSelectedDay;
                  const isWeekend = (calMonthDays.firstDay + i) % 7 === 0 || (calMonthDays.firstDay + i) % 7 === 6;
                  return (
                    <div key={day}
                      onClick={() => setCalSelectedDay(day === calSelectedDay ? null : day)}
                      style={{
                        minHeight: 120, padding: "4px 6px",
                        borderBottom: `1px solid ${t.cardBorder}`,
                        borderRight: `1px solid ${t.cardBorder}`,
                        cursor: "pointer",
                        background: isSelected ? (COLORS.brand + "18") : isWeekend ? (t.bg + "44") : "transparent",
                        transition: "background .1s",
                        position: "relative",
                        outline: isSelected ? `2px solid ${COLORS.brand}` : "none",
                        outlineOffset: -2,
                      }}
                      onMouseOver={e => { if (!isSelected) e.currentTarget.style.background = t.inputBg; }}
                      onMouseOut={e => { if (!isSelected) e.currentTarget.style.background = isWeekend ? (t.bg + "44") : "transparent"; }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                        <span style={{
                          fontSize: 12, fontWeight: isToday ? 800 : 600,
                          color: isToday ? "#fff" : t.text,
                          background: isToday ? COLORS.brand : "transparent",
                          borderRadius: "50%",
                          width: isToday ? 22 : "auto", height: isToday ? 22 : "auto",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>{day}</span>
                        {dayEvents.length > 0 && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: COLORS.brand, background: COLORS.brand + "22", borderRadius: 6, padding: "0 5px" }}>
                            {dayEvents.length}
                          </span>
                        )}
                      </div>
                      {/* Event dots - show up to 5, then +N */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {dayEvents.slice(0, 5).map((ev, idx) => (
                          <div key={idx} style={{
                            fontSize: 10, lineHeight: 1.3, padding: "2px 5px", borderRadius: 4,
                            background: EVENT_TYPES[ev.type]?.color + "22",
                            color: EVENT_TYPES[ev.type]?.color,
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                            fontWeight: 600,
                          }}>
                            {EVENT_TYPES[ev.type]?.icon} {ev.customerName.split(" ")[0]}
                          </div>
                        ))}
                        {dayEvents.length > 5 && (
                          <div style={{ fontSize: 9, color: t.textMuted, fontWeight: 600, paddingLeft: 4 }}>
                            +{dayEvents.length - 5} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected day detail panel */}
            {calSelectedDay && (() => {
              const dayEvents = calEventsForDay(calSelectedDay);
              const dateStr = `${MONTH_NAMES[calMonth]} ${calSelectedDay}, ${calYear}`;
              return (
                <div style={{ background: t.cardBg, borderRadius: 12, padding: "16px 20px", marginTop: 14, boxShadow: t.cardShadow, border: `1px solid ${t.cardBorder}`, borderTop: `3px solid ${COLORS.brand}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: t.text }}>{dateStr}</div>
                      <div style={{ fontSize: 12, color: t.textMuted }}>{dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}</div>
                    </div>
                    <button onClick={() => setCalSelectedDay(null)} style={{ padding: "4px 10px", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 6, cursor: "pointer", fontSize: 12, color: t.textSecondary }}>✕ Close</button>
                  </div>
                  {dayEvents.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "20px 0", color: t.textMuted, fontSize: 13 }}>No events on this day.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {dayEvents.map((ev, idx) => {
                        const evType = EVENT_TYPES[ev.type];
                        return (
                          <div key={idx}
                            onClick={() => {
                              const proj = projects.find(p => p.id === ev.projectId);
                              if (proj) { openDetail(proj); setTab(proj.program); }
                            }}
                            style={{
                              display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                              background: t.inputBg, borderRadius: 10,
                              border: `1px solid ${t.inputBorder}`,
                              cursor: "pointer", transition: "box-shadow .15s",
                              borderLeft: `4px solid ${evType.color}`,
                            }}
                            onMouseOver={e => e.currentTarget.style.boxShadow = t.cardHover}
                            onMouseOut={e => e.currentTarget.style.boxShadow = "none"}
                          >
                            <div style={{ fontSize: 22 }}>{evType.icon}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                                <span style={{ fontWeight: 700, fontSize: 13, color: t.text }}>{ev.customerName}</span>
                                <Badge label={ev.program} color={progColor(ev.program)} small />
                              </div>
                              <div style={{ fontSize: 11, color: t.textSecondary }}>{ev.address}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <Badge label={evType.label} color={evType.color} small />
                              <div style={{ fontSize: 10, color: t.textMuted, marginTop: 3 }}>{ev.stage}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Month event summary */}
            {(() => {
              const monthEvents = calendarEvents.filter(e => {
                const d = parseLocal(e.date);
                return d.getMonth() === calMonth && d.getFullYear() === calYear;
              });
              const byType = {};
              monthEvents.forEach(e => {
                byType[e.type] = (byType[e.type] || 0) + 1;
              });
              return monthEvents.length > 0 ? (
                <div style={{ background: t.cardBg, borderRadius: 12, padding: "14px 18px", marginTop: 14, boxShadow: t.cardShadow, border: `1px solid ${t.cardBorder}` }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: t.text }}>Month Summary — {monthEvents.length} events</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                      <div key={type} style={{
                        display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
                        background: EVENT_TYPES[type]?.color + "15", borderRadius: 8,
                        border: `1px solid ${EVENT_TYPES[type]?.color}33`,
                      }}>
                        <span style={{ fontSize: 13 }}>{EVENT_TYPES[type]?.icon}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: EVENT_TYPES[type]?.color }}>{count}</span>
                        <span style={{ fontSize: 11, color: t.textSecondary }}>{EVENT_TYPES[type]?.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        )}

        {/* ── OVERVIEW TAB ── */}
        {tab === "Overview" && (
          <div>
            <h2 style={{ fontWeight: 800, color: t.text, margin: "0 0 16px" }}>Program Overview</h2>
            {["WHE SF","HES IE","ASI"].map(p => {
              const ps = projects.filter(x => x.program === p);
              const isASIProg = p === "ASI";
              const comp = ps.filter(x=>x.type==="Comprehensive").length;
              const def = ps.filter(x=>x.type==="Deferred").length;
              const withA = ps.filter(x=>x.assessmentDate&&x.riseSubmitDate);
              const ok48 = withA.filter(x=>diffBizDays(x.assessmentDate,x.riseSubmitDate)<=2).length;
              const rate = withA.length ? Math.round(ok48/withA.length*100) : null;
              const issues = ps.filter(x=>x.assessmentDate&&!x.riseSubmitDate&&bizDaysSince(x.assessmentDate)>2);
              const installed = ps.filter(x=>x.installDate || x.lastInstallDate).length;
              return (
                <div key={p} style={{ background:t.cardBg, borderRadius:14, padding:"18px 20px", marginBottom:16, boxShadow:t.cardShadow, borderLeft:`5px solid ${progColor(p)}`, border:`1px solid ${t.cardBorder}`, borderLeftWidth:5, borderLeftColor:progColor(p) }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                    <span style={{ fontWeight:800, fontSize:16, color: progColor(p) }}>{p}</span>
                    <Badge label={`${ps.length} projects`} color={progColor(p)} small />
                    {isASIProg && <span style={{ fontSize:11, color:t.textMuted, fontStyle:"italic" }}>RISE Private Pay</span>}
                  </div>
                  <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                    <Stat t={t} label="Total" value={ps.length} />
                    {isASIProg ? (
                      <>
                        <Stat t={t} label="Installed" value={installed} color={COLORS.ok} />
                        <Stat t={t} label="Pending" value={ps.length - installed} color={COLORS.warn} />
                        <Stat t={t} label="Invoiced" value={ps.filter(x=>x.invoiceSubmittedDate).length} color={COLORS.purple} />
                        <Stat t={t} label="Needs Invoice" value={ps.filter(x=>x.installDate&&!x.invoiceSubmittedDate).length} color={COLORS.warn} />
                        <Stat t={t} label="Revenue" value={ps.reduce((s,x)=>s+(parseFloat(x.totalJobPrice)||0),0) > 0 ? `$${ps.reduce((s,x)=>s+(parseFloat(x.totalJobPrice)||0),0).toLocaleString()}` : "$0"} color={COLORS.asi} />
                        <Stat t={t} label="On Hold" value={ps.filter(x=>x.onHold).length} color={COLORS.hold} />
                      </>
                    ) : (
                      <>
                        <Stat t={t} label="Comprehensive" value={comp} color={COLORS.ok} />
                        <Stat t={t} label="Deferred" value={def} color={COLORS.warn} />
                        <Stat t={t} label="48hr RISE" value={rate !== null ? `${rate}%` : "—"} color={rate!==null?(rate>=80?COLORS.ok:COLORS.danger):COLORS.gray} sub={`${issues.length} overdue`} />
                        <Stat t={t} label="Permit Pending" value={ps.filter(x=>["Applied","Approved"].includes(x.permitStatus)).length} color={COLORS.purple} />
                      </>
                    )}
                  </div>
                  {!isASIProg && (
                    <div style={{ marginTop:14 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:t.textMuted, marginBottom:6, textTransform:"uppercase", letterSpacing:.5 }}>Stage Breakdown</div>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        {STAGES.map(s => {
                          const n = ps.filter(x=>x.stage===s).length;
                          return n > 0 ? <Badge key={s} label={`${s}: ${n}`} color={progColor(p)} small /> : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{ background:t.cardBg, borderRadius:14, padding:"18px 20px", boxShadow:t.cardShadow, border:`1px solid ${t.cardBorder}` }}>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:10, color:t.text }}>📅 Upcoming Installs (All Programs)</div>
              {projects.filter(p=>p.nextInstallDate>=today()).sort((a,b)=>a.nextInstallDate>b.nextInstallDate?1:-1).slice(0,8).map(p=>(
                <div key={p.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:`1px solid ${t.rowBorder}` }}>
                  <Badge label={p.program} color={progColor(p.program)} small />
                  <span style={{ fontSize:13, fontWeight:600, flex:1, color:t.text }}>{p.customerName||"Unnamed"}</span>
                  <span style={{ fontSize:12, color:t.textSecondary }}>{p.address}</span>
                  <span style={{ fontSize:12, fontWeight:700, color: tabColor }}>{fmt(p.nextInstallDate)}</span>
                </div>
              ))}
              {!projects.filter(p=>p.nextInstallDate>=today()).length && <div style={{ color:t.textMuted, fontSize:13 }}>No upcoming installs scheduled.</div>}
            </div>
          </div>
        )}

        {/* ── PROGRAM TABS (WHE SF / HES IE) ── */}
        {prog && view === "list" && (
          <>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16 }}>
              <Stat t={t} label="Total" value={metrics.total} />
              {isASI ? (
                <>
                  <Stat t={t} label="Installed" value={filtered.filter(p=>p.installDate||p.lastInstallDate).length} color={COLORS.ok} />
                  <Stat t={t} label="Pending Install" value={filtered.filter(p=>!p.installDate&&!p.lastInstallDate).length} color={COLORS.warn} />
                  <Stat t={t} label="Invoiced" value={filtered.filter(p=>p.invoiceSubmittedDate).length} color={COLORS.purple} />
                  <Stat t={t} label="Needs Invoice" value={filtered.filter(p=>p.installDate&&!p.invoiceSubmittedDate).length} color={COLORS.warn} />
                  <Stat t={t} label="Revenue" value={filtered.reduce((s,p)=>s+(parseFloat(p.totalJobPrice)||0),0) > 0 ? `$${filtered.reduce((s,p)=>s+(parseFloat(p.totalJobPrice)||0),0).toLocaleString()}` : "$0"} color={COLORS.asi} />
                  <Stat t={t} label="On Hold" value={metrics.onHoldCount} color={COLORS.hold} />
                  <Stat t={t} label="Customer Wait" value={metrics.customerWaitCount} color={COLORS.warn} />
                </>
              ) : (
                <>
                  <Stat t={t} label="Comprehensive" value={metrics.comp} color={COLORS.ok} />
                  <Stat t={t} label="Deferred" value={metrics.def} color={COLORS.warn} />
                  <Stat t={t} label="Ready to Invoice" value={metrics.invoiceable} color={COLORS.purple} sub={metrics.invoiceableRevenue > 0 ? `$${metrics.invoiceableRevenue.toLocaleString()}` : ""} />
                  <Stat t={t} label="Total Revenue" value={metrics.totalRevenue > 0 ? `$${metrics.totalRevenue.toLocaleString()}` : "$0"} color={COLORS.whe} />
                  <Stat t={t} label="48hr RISE" value={metrics.rise48Rate !== null ? `${metrics.rise48Rate}%` : "—"} color={metrics.rise48Rate !== null ? (metrics.rise48Rate >= 80 ? COLORS.ok : COLORS.danger) : COLORS.gray} sub={`${metrics.rise48Issues.length} overdue`} />
                  <Stat t={t} label="Permit Pending" value={metrics.permitPending} color={COLORS.purple} />
                  <Stat t={t} label="On Hold" value={metrics.onHoldCount} color={COLORS.hold} />
                  <Stat t={t} label="Customer Wait" value={metrics.customerWaitCount} color={COLORS.warn} />
                  <Stat t={t} label="Avg Days/Project" value={metrics.avgProjectDays ?? "—"} color={COLORS.whe} sub="assessment→close" />
                </>
              )}
            </div>

            {!isASI && metrics.rise48Issues.length > 0 && (
              <div style={{ background:t.warnBg, border:`1px solid ${t.warnBorder}`, borderRadius:10, padding:"10px 14px", marginBottom:12, fontSize:13, color:t.text }}>
                <strong>⚠ {metrics.rise48Issues.length} project{metrics.rise48Issues.length>1?"s":""} past the 2 business day RISE submission window:</strong>{" "}
                {metrics.rise48Issues.map(p=>p.customerName||p.address||"Unnamed").join(", ")}
              </div>
            )}

            {metrics.upcoming.length > 0 && (
              <div style={{ background:t.cardBg, borderRadius:12, padding:"12px 16px", marginBottom:14, boxShadow:t.cardShadow, border:`1px solid ${t.cardBorder}` }}>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:8, color: tabColor }}>📅 Upcoming Installs</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {metrics.upcoming.map(p=>(
                    <div key={p.id} onClick={()=>openDetail(p)} style={{ cursor:"pointer", background: t.bg, border:`1px solid ${tabColor}33`, borderRadius:8, padding:"5px 10px", fontSize:12 }}>
                      <span style={{ fontWeight:700, color:t.text }}>{p.customerName||"Unnamed"}</span>
                      <span style={{ color:t.textSecondary }}> · {fmt(p.nextInstallDate)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customer / address…"
                style={{ flex:1, minWidth:180, ...inputStyle }} />
              {!isASI && (
                <select value={stageFilter} onChange={e=>setStageFilter(e.target.value)} style={{...inputStyle, width:"auto"}}>
                  <option value="All">All</option>
                  {STAGES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              )}
              {!isASI && (
                <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{...inputStyle, width:"auto"}}>
                  <option value="All">All</option>
                  <option value="Comprehensive">Comprehensive</option>
                  <option value="Deferred">Deferred</option>
                </select>
              )}
              <select value={holdFilter} onChange={e=>setHoldFilter(e.target.value)} style={{...inputStyle, width:"auto"}}>
                <option value="All">All Status</option>
                <option value="Active">Active Only</option>
                <option value="On Hold">On Hold</option>
                <option value="Customer Wait">Customer Wait</option>
              </select>
              <button onClick={openNew} style={{ padding:"7px 18px", background:"linear-gradient(135deg, #991b1b, #dc2626)", color:"#fff", border:"2px solid #000", borderRadius:8, fontWeight:800, fontSize:13, cursor:"pointer", textTransform:"uppercase", letterSpacing:0.5, boxShadow:"0 4px 12px rgba(153,27,27,0.5)" }}>
                + Add Project
              </button>
            </div>

            {filtered.length === 0 && (
              <div style={{ textAlign:"center", color:t.textMuted, padding:40 }}>No projects found. Add one to get started.</div>
            )}
            {filtered.map(p => {
              const dc = metrics.docsCheck(p);
              const docPct = Math.round(dc.done/dc.total*100);
              const canInvoice = p.invoiceable && p.lastInstallDate && p.lastInstallDate <= today();
              const borderColor = p.onHold ? COLORS.hold : canInvoice ? COLORS.purple : p.type==="Deferred" ? COLORS.warn : COLORS.ok;
              return (
                <div key={p.id} onClick={()=>openDetail(p)}
                  style={{ background:t.cardBg, borderRadius:12, padding:"14px 16px", marginBottom:10, boxShadow:t.cardShadow,
                    cursor:"pointer", borderLeft:`4px solid ${borderColor}`,
                    border:`1px solid ${p.onHold ? COLORS.hold+"66" : t.cardBorder}`, borderLeftWidth:4, borderLeftColor:borderColor,
                    transition:"box-shadow .15s", opacity: p.onHold ? 0.85 : 1 }}
                  onMouseOver={e=>e.currentTarget.style.boxShadow=t.cardHover}
                  onMouseOut={e=>e.currentTarget.style.boxShadow=t.cardShadow}
                >
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8, alignItems:"flex-start" }}>
                    <div style={{ flex:1, minWidth:160 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontWeight:700, fontSize:15, color:t.text }}>{p.customerName||<span style={{color:t.textMuted}}>Unnamed Customer</span>}</span>
                        {p.onHold && <span style={{ fontSize:10, fontWeight:800, color:"#fff", background:COLORS.hold, borderRadius:4, padding:"1px 6px", textTransform:"uppercase", letterSpacing:.5 }}>HOLD</span>}
                      </div>
                      <div style={{ fontSize:12, color:t.textSecondary, marginTop:1 }}>{p.address||"No address"}</div>
                    </div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                      {p.program === "ASI" ? (
                        <>
                          <Badge label="ASI" color={COLORS.asi} small />
                          {(p.installDate || p.lastInstallDate) ? <Badge label="Installed" color={COLORS.ok} small /> : <Badge label="Pending Install" color={COLORS.warn} small />}
                          {p.invoiceSubmittedDate ? <Badge label="Invoiced" color={COLORS.purple} small /> : (p.installDate ? <Badge label="Needs Invoice" color={COLORS.warn} small /> : null)}
                        </>
                      ) : (
                        <>
                          {canInvoice && <Badge label="✓ Ready to Invoice" color={COLORS.purple} small />}
                          <Badge label={p.type} color={p.type==="Deferred"?COLORS.warn:COLORS.ok} small />
                          <Badge label={p.stage} color={tabColor} small />
                          <Badge label={riseLabel(p)} color={riseColor(p)} small />
                          {p.permitStatus !== "N/A" && <Badge label={`Permit: ${p.permitStatus}`} color={permitStatusColor(p.permitStatus)} small />}
                        </>
                      )}
                    </div>
                  </div>
                  {/* Hold reason banner */}
                  {p.onHold && (
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:6, padding:"5px 10px", background:COLORS.hold+"15", borderRadius:6, border:`1px solid ${COLORS.hold}33` }}>
                      <span style={{ fontSize:13 }}>⏸</span>
                      <span style={{ fontSize:11, color:COLORS.hold, fontWeight:700 }}>
                        On Hold{p.holdParty ? ` — ${p.holdParty}` : ""}{p.holdReason ? `: ${p.holdReason}` : ""}
                      </span>
                      {p.holdDate && <span style={{ fontSize:10, color:t.textMuted, marginLeft:"auto" }}>since {fmt(p.holdDate)}</span>}
                    </div>
                  )}
                  {/* Next action line */}
                  {p.nextAction && (
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:p.onHold?4:6, padding:"5px 10px", background:COLORS.whe+"12", borderRadius:6, border:`1px solid ${COLORS.whe}28` }}>
                      <span style={{ fontSize:13 }}>➡️</span>
                      <span style={{ fontSize:11, color:COLORS.whe, fontWeight:600 }}>
                        Next: {p.nextAction}
                      </span>
                      {p.nextActionOwner && <Badge label={p.nextActionOwner} color={p.nextActionOwner==="Customer"?COLORS.warn:p.nextActionOwner==="Us"?COLORS.ok:COLORS.gray} small />}
                      {p.nextActionDate && <span style={{ fontSize:10, color:t.textMuted, marginLeft:"auto" }}>by {fmt(p.nextActionDate)}</span>}
                    </div>
                  )}
                  <div style={{ display:"flex", gap:16, marginTop:10, flexWrap:"wrap" }}>
                    {p.program !== "ASI" && p.totalJobPrice && <span style={{ fontSize:11, color:t.textMuted }}>💰 Job Price: <b style={{color:COLORS.whe}}>${parseFloat(p.totalJobPrice).toLocaleString()}</b></span>}
                    {p.program !== "ASI" && <span style={{ fontSize:11, color:t.textMuted }}>📋 Docs: <b style={{ color: docPct===100?COLORS.ok:docPct>50?COLORS.warn:COLORS.danger }}>{dc.done}/{dc.total}</b></span>}
                    {p.program === "ASI" && p.installDate && <span style={{ fontSize:11, color:t.textMuted }}>🔧 Install: <b style={{color:COLORS.ok}}>{fmt(p.installDate)}</b></span>}
                    {p.program === "ASI" && !p.installDate && <span style={{ fontSize:11, color:COLORS.warn }}>⏳ No install date yet</span>}
                    {p.program === "ASI" && p.invoiceSubmittedDate && <span style={{ fontSize:11, color:t.textMuted }}>🧾 Invoiced: <b style={{color:COLORS.purple}}>{fmt(p.invoiceSubmittedDate)}</b></span>}
                    {p.program === "ASI" && p.installDate && !p.invoiceSubmittedDate && <span style={{ fontSize:11, color:COLORS.warn }}>🧾 Not invoiced</span>}
                    {p.program === "ASI" && p.totalJobPrice && <span style={{ fontSize:11, color:t.textMuted }}>💰 <b style={{color:COLORS.asi}}>${parseFloat(p.totalJobPrice).toLocaleString()}</b></span>}
                    {p.program !== "ASI" && p.assessmentDate && <span style={{ fontSize:11, color:t.textMuted }}>🔍 Assessed: <b style={{color:t.text}}>{fmt(p.assessmentDate)}</b></span>}
                    {p.program !== "ASI" && p.lastInstallDate && <span style={{ fontSize:11, color:t.textMuted }}>🔧 Last Install: <b style={{color:t.text}}>{fmt(p.lastInstallDate)}</b></span>}
                    {p.program !== "ASI" && p.nextInstallDate && p.nextInstallDate >= today() && <span style={{ fontSize:11, color: tabColor }}>📅 Next Install: <b>{fmt(p.nextInstallDate)}</b></span>}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ── DETAIL VIEW ── */}
        {view === "detail" && form && (
          <div>
            <div style={{ display:"flex", gap:10, marginBottom:16, alignItems:"center" }}>
              <button onClick={()=>{setView("list");setConfirmDeleteId(null);}} style={{ padding:"6px 14px", background:t.cardBg, border:`1px solid ${t.cardBorder}`, borderRadius:8, cursor:"pointer", fontSize:13, color:t.text }}>← Back</button>
              <h2 style={{ margin:0, fontWeight:800, fontSize:18, flex:1, color:t.text }}>{form.customerName||"Unnamed"}</h2>
              <button onClick={()=>openEdit(form)} style={{ padding:"6px 16px", background:"linear-gradient(135deg, #991b1b, #dc2626)", color:"#fff", border:"2px solid #000", borderRadius:8, cursor:"pointer", fontWeight:800, fontSize:13, textTransform:"uppercase", boxShadow:"0 4px 12px rgba(153,27,27,0.5)" }}>Edit</button>
              {confirmDeleteId === form.id ? (
                <div style={{ display:"flex", gap:6, alignItems:"center", background:t.alertBg, border:`1px solid ${COLORS.danger}`, borderRadius:8, padding:"4px 10px" }}>
                  <span style={{ fontSize:12, color:COLORS.danger, fontWeight:700 }}>Delete?</span>
                  <button onClick={()=>deleteProject(form.id)} style={{ padding:"4px 12px", background:COLORS.danger, color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontSize:12, fontWeight:700 }}>Yes</button>
                  <button onClick={()=>setConfirmDeleteId(null)} style={{ padding:"4px 12px", background:t.cardBg, color:t.textSecondary, border:`1px solid ${t.cardBorder}`, borderRadius:6, cursor:"pointer", fontSize:12, fontWeight:600 }}>No</button>
                </div>
              ) : (
                <button onClick={()=>setConfirmDeleteId(form.id)} style={{ padding:"6px 14px", background:t.cardBg, color:COLORS.danger, border:`1px solid ${t.cardBorder}`, borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:700 }}>Delete</button>
              )}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
              <div style={{ background:t.cardBg, borderRadius:12, padding:"16px", boxShadow:t.cardShadow, border:`1px solid ${t.cardBorder}` }}>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:10, color: tabColor }}>Project Info</div>
                <Row t={t} k="Program" v={<>{form.program}{form.program === "ASI" && <span style={{color:t.textMuted, fontStyle:"italic"}}> — RISE Private Pay</span>}</>} />
                {form.program !== "ASI" && <Row t={t} k="Type" v={<Badge label={form.type} color={form.type==="Deferred"?COLORS.warn:COLORS.ok} small />} />}
                {form.program !== "ASI" && <Row t={t} k="Stage" v={<Badge label={form.stage} color={tabColor} small />} />}
                <Row t={t} k="Address" v={form.address||"—"} />
                {form.program === "ASI" && <Row t={t} k="Install Date" v={form.installDate ? <b style={{color:COLORS.ok}}>{fmt(form.installDate)}</b> : <span style={{color:COLORS.warn}}>Not scheduled</span>} />}
                {form.program === "ASI" && <Row t={t} k="Invoice Submitted" v={form.invoiceSubmittedDate ? <b style={{color:COLORS.purple}}>{fmt(form.invoiceSubmittedDate)}</b> : <span style={{color:COLORS.warn}}>Not invoiced</span>} />}
                {form.program === "ASI" && form.installDate && form.invoiceSubmittedDate && <Row t={t} k="Install → Invoice" v={<b style={{color:COLORS.asi}}>{diffDays(form.installDate, form.invoiceSubmittedDate)} days</b>} />}
                {form.program === "ASI" && <Row t={t} k="Total Job Price" v={form.totalJobPrice ? <b style={{color:COLORS.asi,fontSize:14}}>${parseFloat(form.totalJobPrice).toLocaleString()}</b> : "—"} />}
                {form.program !== "ASI" && <Row t={t} k="Total Job Price" v={form.totalJobPrice ? <b style={{color:COLORS.whe,fontSize:14}}>${parseFloat(form.totalJobPrice).toLocaleString()}</b> : "—"} />}
                {form.program !== "ASI" && form.invoiceable && form.lastInstallDate && form.lastInstallDate <= today() && (
                  <div style={{background:COLORS.purple+"22",border:`1px solid ${COLORS.purple}`,borderRadius:8,padding:"8px 10px",marginTop:6}}>
                    <div style={{fontWeight:700,fontSize:12,color:COLORS.purple}}>✓ READY TO INVOICE</div>
                    <div style={{fontSize:11,color:t.textMuted,marginTop:2}}>Last install date passed • All criteria met</div>
                  </div>
                )}
                <Row t={t} k="Notes" v={form.notes||"—"} />
              </div>

              {/* ── HOLD STATUS CARD (detail) ── */}
              {form.onHold && (
                <div style={{ background:t.cardBg, borderRadius:12, padding:"16px", boxShadow:t.cardShadow, border:`1px solid ${COLORS.hold}66`, borderTop:`3px solid ${COLORS.hold}`, gridColumn: "1 / -1" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                    <span style={{ fontSize:20 }}>⏸</span>
                    <span style={{ fontWeight:800, fontSize:15, color:COLORS.hold, textTransform:"uppercase", letterSpacing:.5 }}>Project On Hold</span>
                    {form.holdParty && <Badge label={`Waiting on: ${form.holdParty}`} color={form.holdParty==="Customer"?COLORS.warn:form.holdParty==="Us"?COLORS.ok:COLORS.gray} />}
                  </div>
                  {form.holdReason && <Row t={t} k="Reason" v={form.holdReason} />}
                  <Row t={t} k="Hold Since" v={fmt(form.holdDate)} />
                  {form.holdDate && <Row t={t} k="Days On Hold" v={<b style={{color:COLORS.hold}}>{daysSince(form.holdDate)} days</b>} />}
                </div>
              )}

              {/* ── NEXT EXPECTED ACTION CARD (detail) ── */}
              {(form.nextAction || form.nextActionDate) && (
                <div style={{ background:t.cardBg, borderRadius:12, padding:"16px", boxShadow:t.cardShadow, border:`1px solid ${COLORS.whe}44`, borderTop:`3px solid ${COLORS.whe}`, gridColumn: "1 / -1" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                    <span style={{ fontSize:20 }}>➡️</span>
                    <span style={{ fontWeight:800, fontSize:15, color:COLORS.whe }}>Next Expected Action</span>
                    {form.nextActionOwner && (
                      <Badge label={`Ball in: ${form.nextActionOwner}'s court`} color={form.nextActionOwner==="Customer"?COLORS.warn:form.nextActionOwner==="Us"?COLORS.ok:COLORS.gray} />
                    )}
                  </div>
                  <Row t={t} k="Action" v={form.nextAction||"—"} />
                  <Row t={t} k="Target Date" v={form.nextActionDate ? <b style={{color: parseLocal(form.nextActionDate) < parseLocal(today()) ? COLORS.danger : COLORS.whe}}>{fmt(form.nextActionDate)}</b> : "—"} />
                  {form.nextActionDate && parseLocal(form.nextActionDate) >= parseLocal(today()) && (
                    <Row t={t} k="Days Until" v={<b style={{color:COLORS.whe}}>{diffDays(today(), form.nextActionDate)} days</b>} />
                  )}
                  {form.nextActionDate && parseLocal(form.nextActionDate) < parseLocal(today()) && (
                    <Row t={t} k="Overdue By" v={<b style={{color:COLORS.danger}}>{daysSince(form.nextActionDate)} days</b>} />
                  )}
                  {form.nextActionOwner === "Customer" && (
                    <div style={{ background:COLORS.warn+"18", border:`1px solid ${COLORS.warn}44`, borderRadius:8, padding:"8px 10px", marginTop:8, fontSize:12 }}>
                      <strong style={{color:COLORS.warn}}>⚠ Customer action required</strong>
                      <span style={{color:t.textSecondary}}> — delay is not on your team</span>
                    </div>
                  )}
                </div>
              )}
              {form.program !== "ASI" && (<>
              <div style={{ background:t.cardBg, borderRadius:12, padding:"16px", boxShadow:t.cardShadow, border:`1px solid ${t.cardBorder}` }}>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:10, color: tabColor }}>Key Dates & Turnarounds</div>
                <Row t={t} k="Lead Date" v={fmt(form.leadDate)} />
                <Row t={t} k="Assessment Date" v={fmt(form.assessmentDate)} />
                {form.leadDate && form.assessmentDate && (
                  <Row t={t} k="Lead → Assess TAT" v={<b style={{color:diffDays(form.leadDate,form.assessmentDate)<=(form.program==="HES IE"?10:999)?COLORS.ok:COLORS.warn}}>{diffDays(form.leadDate, form.assessmentDate)} days</b>} />
                )}
                <Row t={t} k="RISE Submitted" v={fmt(form.riseSubmitDate)} />
                {form.assessmentDate && form.riseSubmitDate && (
                  <Row t={t} k="Assessment → RISE TAT" v={<b style={{color:diffBizDays(form.assessmentDate,form.riseSubmitDate)<=2?COLORS.ok:COLORS.danger}}>{diffBizDays(form.assessmentDate, form.riseSubmitDate)} biz days</b>} />
                )}
                <Row t={t} k="RI Approved" v={fmt(form.riApprovedDate)} />
                {form.riseSubmitDate && form.riApprovedDate && (
                  <Row t={t} k="RISE → Approval" v={<span style={{color:COLORS.gray}}>{diffDays(form.riseSubmitDate, form.riApprovedDate)} days (tracking)</span>} />
                )}
                <Row t={t} k="Install Date" v={fmt(form.installDate)} />
                <Row t={t} k="Last Install Date" v={fmt(form.lastInstallDate)} />
                {form.riApprovedDate && form.lastInstallDate && (
                  <Row t={t} k="Approval → Install TAT" v={<b style={{color:diffDays(form.riApprovedDate,form.lastInstallDate)<=(form.program==="HES IE"?5:999)?COLORS.ok:COLORS.warn}}>{diffDays(form.riApprovedDate, form.lastInstallDate)} days</b>} />
                )}
                <Row t={t} k="Next Install Date" v={form.nextInstallDate ? <b style={{color:tabColor}}>{fmt(form.nextInstallDate)}</b> : "—"} />
                <Row t={t} k="Invoice Submitted" v={fmt(form.invoiceSubmittedDate)} />
                {form.lastInstallDate && form.invoiceSubmittedDate && (
                  <Row t={t} k="Install → Invoice TAT" v={<b style={{color:diffDays(form.lastInstallDate,form.invoiceSubmittedDate)<=(form.program==="HES IE"?1:999)?COLORS.ok:COLORS.warn}}>{diffDays(form.lastInstallDate, form.invoiceSubmittedDate)} days</b>} />
                )}
                {form.leadDate && form.invoiceSubmittedDate && (
                  <Row t={t} k="Full Cycle (Lead→Close)" v={<b style={{color:COLORS.purple}}>{diffDays(form.leadDate, form.invoiceSubmittedDate)} days</b>} />
                )}
                {form.assessmentDate && form.invoiceSubmittedDate && (
                  <Row t={t} k="Project Time (Assess→Close)" v={<b style={{color:COLORS.purple}}>{diffDays(form.assessmentDate, form.invoiceSubmittedDate)} days</b>} />
                )}
              </div>

              {/* ── POLISHED PERMIT TRACKING DETAIL ── */}
              <div style={{ background:t.cardBg, borderRadius:12, padding:"16px", boxShadow:t.cardShadow, border:`1px solid ${t.cardBorder}`, borderTop: `3px solid ${permitStatusColor(form.permitStatus)}` }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 12 }}>
                  <div style={{ fontWeight:700, fontSize:13, color: COLORS.purple, display:"flex", alignItems:"center", gap:6 }}>
                    <span>🏛</span> Permit Tracking
                  </div>
                  <Badge label={form.permitStatus} color={permitStatusColor(form.permitStatus)} />
                </div>

                {form.permitStatus === "N/A" ? (
                  <div style={{ textAlign:"center", padding:"20px 10px", color: t.textMuted, fontSize: 13 }}>
                    No permit required for this project.
                  </div>
                ) : (
                  <>
                    {/* Progress bar */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:t.textMuted, marginBottom:4 }}>
                        <span>Progress</span>
                        <span>{permitProgressPct(form.permitStatus)}%</span>
                      </div>
                      <div style={{ height:6, background: t.inputBg, borderRadius:3, overflow:"hidden", border:`1px solid ${t.inputBorder}` }}>
                        <div style={{
                          height:"100%", borderRadius:3, transition:"width .3s",
                          width: `${permitProgressPct(form.permitStatus)}%`,
                          background: form.permitStatus === "Closed"
                            ? `linear-gradient(90deg, ${COLORS.ok}, ${COLORS.ok})`
                            : `linear-gradient(90deg, ${COLORS.purple}, ${COLORS.whe})`
                        }} />
                      </div>
                      {/* Stage dots */}
                      <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
                        {["Not Applied","Applied","Approved","Issued","Final Inspection","Closed"].map((stage, i) => {
                          const current = permitStageIndex(form.permitStatus);
                          const isActive = i <= current;
                          const isCurrent = i === current;
                          return (
                            <div key={stage} style={{ display:"flex", flexDirection:"column", alignItems:"center", flex:1 }}>
                              <div style={{
                                width: isCurrent ? 10 : 7, height: isCurrent ? 10 : 7,
                                borderRadius: "50%",
                                background: isActive ? permitStatusColor(form.permitStatus) : t.inputBorder,
                                border: isCurrent ? `2px solid ${permitStatusColor(form.permitStatus)}` : "none",
                                boxShadow: isCurrent ? `0 0 6px ${permitStatusColor(form.permitStatus)}66` : "none",
                                transition: "all .2s"
                              }} />
                              <span style={{ fontSize:8, color: isActive ? t.textSecondary : t.textMuted, marginTop:3, textAlign:"center", lineHeight:1.1 }}>
                                {stage === "Final Inspection" ? "Final Insp." : stage === "Not Applied" ? "Not App." : stage}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Permit details */}
                    {form.permitJurisdiction && <Row t={t} k="Jurisdiction" v={form.permitJurisdiction} />}
                    <Row t={t} k="Permit #" v={form.permitNumber || "—"} />
                    <Row t={t} k="Applied" v={fmt(form.permitAppliedDate)} />
                    <Row t={t} k="Issued" v={fmt(form.permitIssuedDate)} />
                    {form.permitInspectionDate && <Row t={t} k="Inspection" v={fmt(form.permitInspectionDate)} />}
                    {form.permitClosedDate && <Row t={t} k="Closed" v={fmt(form.permitClosedDate)} />}

                    {/* TATs */}
                    {form.permitAppliedDate && form.permitIssuedDate && (
                      <Row t={t} k="Applied → Issued" v={
                        <b style={{ color: diffDays(form.permitAppliedDate, form.permitIssuedDate) <= 14 ? COLORS.ok : diffDays(form.permitAppliedDate, form.permitIssuedDate) <= 30 ? COLORS.warn : COLORS.danger }}>
                          {diffDays(form.permitAppliedDate, form.permitIssuedDate)} days
                        </b>
                      } />
                    )}
                    {form.permitIssuedDate && form.permitInspectionDate && (
                      <Row t={t} k="Issued → Inspection" v={
                        <b style={{ color: COLORS.whe }}>{diffDays(form.permitIssuedDate, form.permitInspectionDate)} days</b>
                      } />
                    )}
                    {form.permitAppliedDate && form.permitClosedDate && (
                      <Row t={t} k="Full Permit Cycle" v={
                        <b style={{ color: COLORS.purple }}>{diffDays(form.permitAppliedDate, form.permitClosedDate)} days</b>
                      } />
                    )}

                    {/* Aging alerts */}
                    {form.permitAppliedDate && !form.permitIssuedDate && daysSince(form.permitAppliedDate) > 14 && (
                      <div style={{ background: t.warnBg, border:`1px solid ${t.warnBorder}`, borderRadius:8, padding:"8px 10px", marginTop:8, fontSize:12 }}>
                        <strong style={{ color: COLORS.warn }}>⏳ Aging:</strong>{" "}
                        <span style={{ color: t.text }}>{daysSince(form.permitAppliedDate)} days since applied — not yet issued</span>
                      </div>
                    )}
                    {form.permitIssuedDate && !form.permitInspectionDate && form.permitStatus !== "Closed" && daysSince(form.permitIssuedDate) > 30 && (
                      <div style={{ background: t.warnBg, border:`1px solid ${t.warnBorder}`, borderRadius:8, padding:"8px 10px", marginTop:8, fontSize:12 }}>
                        <strong style={{ color: COLORS.warn }}>⏳ Aging:</strong>{" "}
                        <span style={{ color: t.text }}>{daysSince(form.permitIssuedDate)} days since issued — inspection pending</span>
                      </div>
                    )}

                    {/* Permit notes */}
                    {form.permitNotes && (
                      <div style={{ marginTop:8, padding:"8px 10px", background:t.inputBg, borderRadius:8, border:`1px solid ${t.inputBorder}` }}>
                        <div style={{ fontSize:10, color:t.textMuted, textTransform:"uppercase", letterSpacing:.3, marginBottom:3 }}>Permit Notes</div>
                        <div style={{ fontSize:12, color:t.text, whiteSpace:"pre-wrap" }}>{form.permitNotes}</div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div style={{ background:t.cardBg, borderRadius:12, padding:"16px", boxShadow:t.cardShadow, border:`1px solid ${t.cardBorder}` }}>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:10, color: tabColor }}>Documents</div>
                {(form.program === "WHE SF" ? DOCS_WHE : DOCS_HES).map(d => (
                  <div key={d} style={{ display:"flex", alignItems:"center", gap:6, padding:"3px 0", borderBottom:`1px solid ${t.rowBorder}` }}>
                    <span style={{ fontSize:14 }}>{form.docs?.[d] ? "✅" : "⬜"}</span>
                    <span style={{ fontSize:12, color: form.docs?.[d] ? t.text : t.textMuted }}>{d}</span>
                  </div>
                ))}
              </div>
              </>)}
              {form.stageHistory?.length > 0 && form.program !== "ASI" && (
                <div style={{ background:t.cardBg, borderRadius:12, padding:"16px", boxShadow:t.cardShadow, border:`1px solid ${t.cardBorder}` }}>
                  <div style={{ fontWeight:700, fontSize:13, marginBottom:10, color: tabColor }}>Stage History</div>
                  {form.stageHistory.map((h,i) => (
                    <div key={i} style={{ display:"flex", gap:8, padding:"3px 0", fontSize:12 }}>
                      <span style={{ color:t.textMuted, minWidth:80 }}>{fmt(h.date)}</span>
                      <span style={{ color:t.text }}>→ {h.stage}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── FORM VIEW ── */}
        {view === "form" && form && (
          <div>
            <div style={{ display:"flex", gap:10, marginBottom:16, alignItems:"center" }}>
              <button onClick={()=>setView("list")} style={{ padding:"6px 14px", background:t.cardBg, border:`1px solid ${t.cardBorder}`, borderRadius:8, cursor:"pointer", fontSize:13, color:t.text }}>← Cancel</button>
              <h2 style={{ margin:0, fontWeight:800, fontSize:18, flex:1, color:t.text }}>{editId ? "Edit Project" : "New Project"}</h2>
              <button onClick={saveForm} disabled={saving} style={{ padding:"8px 24px", background: saving ? COLORS.gray : "linear-gradient(135deg, #991b1b, #dc2626)", color:"#fff", border:"2px solid #000", borderRadius:8, cursor: saving ? "wait" : "pointer", fontWeight:800, fontSize:14, textTransform:"uppercase", letterSpacing:0.5, boxShadow: saving ? "none" : "0 4px 12px rgba(153,27,27,0.5)", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : editId ? "Save Changes" : "Create Project"}
              </button>
            </div>
            <div style={{ background:t.cardBg, borderRadius:12, padding:"20px", boxShadow:t.cardShadow, border:`1px solid ${t.cardBorder}` }}>
              <Section t={t} title="Basic Information">
                <Field t={t} label="Program">
                  <select value={form.program} onChange={e=>setForm({...form,program:e.target.value})} style={inputStyle}>
                    <option value="WHE SF">WHE SF</option>
                    <option value="HES IE">HES IE</option>
                    <option value="ASI">ASI (Private Pay)</option>
                  </select>
                </Field>
                <Field t={t} label="Customer Name">
                  <input value={form.customerName} onChange={e=>setForm({...form,customerName:e.target.value})} style={inputStyle} placeholder="Enter customer name" />
                </Field>
                <Field t={t} label="Address">
                  <input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} style={inputStyle} placeholder="Enter address" />
                </Field>
                {form.program !== "ASI" && (
                  <>
                    <Field t={t} label="Type">
                      <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={inputStyle}>
                        <option value="Comprehensive">Comprehensive</option>
                        <option value="Deferred">Deferred</option>
                      </select>
                    </Field>
                    <Field t={t} label="Stage">
                      <input value={form.stage} readOnly style={{...inputStyle, background:theme==="dark"?"#3f3f46":"#e4e4e7", cursor:"not-allowed", color:t.textMuted}} />
                      <div style={{fontSize:10,color:t.textMuted,marginTop:2}}>Stage auto-updates based on dates entered below</div>
                    </Field>
                    <Field t={t} label="Total Job Price ($)">
                      <input type="number" step="0.01" value={form.totalJobPrice} onChange={e=>setForm({...form,totalJobPrice:e.target.value})} style={inputStyle} placeholder="e.g., 15750.00" />
                    </Field>
                  </>
                )}
                {form.program === "ASI" && (
                  <>
                    <Field t={t} label="Install Date">
                      <input type="date" value={form.installDate||""} onChange={e=>setForm({...form,installDate:e.target.value})} style={inputStyle} />
                    </Field>
                    <Field t={t} label="Invoice Submitted Date">
                      <input type="date" value={form.invoiceSubmittedDate||""} onChange={e=>setForm({...form,invoiceSubmittedDate:e.target.value})} style={inputStyle} />
                    </Field>
                    <Field t={t} label="Total Job Price ($)">
                      <input type="number" step="0.01" value={form.totalJobPrice} onChange={e=>setForm({...form,totalJobPrice:e.target.value})} style={inputStyle} placeholder="e.g., 5000.00" />
                    </Field>
                  </>
                )}
              </Section>

              {/* ── HOLD STATUS FORM ── */}
              <Section t={t} title="⏸ Hold Status">
                <div style={{gridColumn:"1/-1"}}>
                  <label style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", background:form.onHold?(COLORS.hold+"18"):t.checkboxLabelBg, border:`1px solid ${form.onHold?COLORS.hold:t.cardBorder}`, borderRadius:8, cursor:"pointer" }}>
                    <input type="checkbox" checked={form.onHold||false} onChange={e=>setForm({...form,onHold:e.target.checked, holdDate:e.target.checked && !form.holdDate ? today() : form.holdDate})} />
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:form.onHold?COLORS.hold:t.text }}>Project is On Hold</div>
                      <div style={{ fontSize:11, color:t.textMuted, marginTop:2 }}>Pauses the project — tracks who's responsible for the delay</div>
                    </div>
                  </label>
                </div>
                {form.onHold && (
                  <>
                    <Field t={t} label="Who's Holding This Up?">
                      <select value={form.holdParty||""} onChange={e=>setForm({...form,holdParty:e.target.value})} style={inputStyle}>
                        <option value="">Select...</option>
                        {HOLD_PARTIES.map(p=><option key={p} value={p}>{p}</option>)}
                      </select>
                    </Field>
                    <Field t={t} label="Hold Date">
                      <input type="date" value={form.holdDate||""} onChange={e=>setForm({...form,holdDate:e.target.value})} style={inputStyle} />
                    </Field>
                    <div style={{gridColumn:"1/-1"}}>
                      <Field t={t} label="Hold Reason">
                        <input value={form.holdReason||""} onChange={e=>setForm({...form,holdReason:e.target.value})} style={inputStyle} placeholder="e.g., Customer can't schedule until May, waiting on permit approval..." />
                      </Field>
                    </div>
                    {form.holdDate && (
                      <div style={{gridColumn:"1/-1", background:COLORS.hold+"12", borderRadius:8, padding:"8px 14px", border:`1px solid ${COLORS.hold}33`, fontSize:12}}>
                        <span style={{color:t.textSecondary}}>On hold for </span>
                        <b style={{color:COLORS.hold}}>{daysSince(form.holdDate)} days</b>
                        {form.holdParty && <span style={{color:t.textSecondary}}> — waiting on <b style={{color:form.holdParty==="Customer"?COLORS.warn:form.holdParty==="Us"?COLORS.ok:t.text}}>{form.holdParty}</b></span>}
                      </div>
                    )}
                  </>
                )}
              </Section>

              {/* ── NEXT EXPECTED ACTION FORM ── */}
              <Section t={t} title="➡️ Next Expected Action">
                <div style={{gridColumn:"1/-1"}}>
                  <Field t={t} label="What needs to happen next?">
                    <input value={form.nextAction||""} onChange={e=>setForm({...form,nextAction:e.target.value})} style={inputStyle} placeholder="e.g., Schedule assessment, Customer to confirm install date, Waiting on permit..." />
                  </Field>
                </div>
                <Field t={t} label="Target Date">
                  <input type="date" value={form.nextActionDate||""} onChange={e=>setForm({...form,nextActionDate:e.target.value})} style={inputStyle} />
                  <div style={{fontSize:10,color:t.textMuted,marginTop:2}}>When this should happen by</div>
                </Field>
                <Field t={t} label="Ball Is In Whose Court?">
                  <select value={form.nextActionOwner||""} onChange={e=>setForm({...form,nextActionOwner:e.target.value})} style={inputStyle}>
                    <option value="">Select...</option>
                    {ACTION_OWNERS.map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                  <div style={{fontSize:10,color:t.textMuted,marginTop:2}}>Who's responsible for the next step</div>
                </Field>
                {form.nextAction && form.nextActionOwner === "Customer" && (
                  <div style={{gridColumn:"1/-1", background:COLORS.warn+"15", borderRadius:8, padding:"8px 14px", border:`1px solid ${COLORS.warn}44`, fontSize:12}}>
                    <strong style={{color:COLORS.warn}}>⚠ Customer action needed</strong>
                    <span style={{color:t.textSecondary}}> — this delay is on them, not your team</span>
                  </div>
                )}
              </Section>

              {form.program !== "ASI" && (<>
              <Section t={t} title="Dates & Timeline">
                <Field t={t} label="Lead Date">
                  <input type="date" value={form.leadDate} onChange={e=>setForm({...form,leadDate:e.target.value})} style={inputStyle} />
                  <div style={{fontSize:10,color:t.textMuted,marginTop:2}}>When the lead was first identified</div>
                </Field>
                <Field t={t} label="Assessment Date">
                  <input type="date" value={form.assessmentDate} onChange={e=>setForm({...form,assessmentDate:e.target.value})} style={inputStyle} />
                </Field>
                <Field t={t} label="RISE Submitted Date">
                  <input type="date" value={form.riseSubmitDate} onChange={e=>setForm({...form,riseSubmitDate:e.target.value})} style={inputStyle} />
                </Field>
                <Field t={t} label="RI Approved Date">
                  <input type="date" value={form.riApprovedDate} onChange={e=>setForm({...form,riApprovedDate:e.target.value})} style={inputStyle} />
                  <div style={{fontSize:10,color:t.textMuted,marginTop:2}}>When RI approved the project to proceed</div>
                </Field>
                <Field t={t} label="Install Date">
                  <input type="date" value={form.installDate} onChange={e=>setForm({...form,installDate:e.target.value})} style={inputStyle} />
                </Field>
                <Field t={t} label="Last Install Date">
                  <input type="date" value={form.lastInstallDate} onChange={e=>setForm({...form,lastInstallDate:e.target.value})} style={inputStyle} />
                </Field>
                <Field t={t} label="Next Expected Install Date">
                  <input type="date" value={form.nextInstallDate} onChange={e=>setForm({...form,nextInstallDate:e.target.value})} style={inputStyle} />
                </Field>
                <Field t={t} label="Invoice Submitted Date">
                  <input type="date" value={form.invoiceSubmittedDate} onChange={e=>setForm({...form,invoiceSubmittedDate:e.target.value})} style={inputStyle} />
                </Field>
                <div style={{gridColumn:"1/-1"}}>
                  <label style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", background:form.invoiceable?t.activeCheckboxBg:t.checkboxLabelBg, border:`1px solid ${form.invoiceable?COLORS.purple:t.cardBorder}`, borderRadius:8, cursor:"pointer" }}>
                    <input type="checkbox" checked={form.invoiceable} onChange={e=>setForm({...form,invoiceable:e.target.checked})} />
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:form.invoiceable?COLORS.purple:t.text }}>Mark as Ready to Invoice</div>
                      <div style={{ fontSize:11, color:t.textMuted, marginTop:2 }}>Check when project is complete and ready for invoicing</div>
                    </div>
                  </label>
                </div>
              </Section>

              {/* ── POLISHED PERMIT FORM SECTION ── */}
              <Section t={t} title="🏛 Permit Tracking">
                <Field t={t} label="Permit Status">
                  <select value={form.permitStatus} onChange={e=>setForm({...form,permitStatus:e.target.value})} style={inputStyle}>
                    {PERMIT_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                {form.permitStatus !== "N/A" && (
                  <>
                    <Field t={t} label="Jurisdiction / Municipality">
                      <input value={form.permitJurisdiction||""} onChange={e=>setForm({...form,permitJurisdiction:e.target.value})} style={inputStyle} placeholder="e.g., City of Denver" />
                    </Field>
                    <Field t={t} label="Permit Number">
                      <input value={form.permitNumber} onChange={e=>setForm({...form,permitNumber:e.target.value})} style={inputStyle} placeholder="Enter permit number" />
                    </Field>
                    <Field t={t} label="Permit Applied Date">
                      <input type="date" value={form.permitAppliedDate} onChange={e=>setForm({...form,permitAppliedDate:e.target.value})} style={inputStyle} />
                    </Field>
                    <Field t={t} label="Permit Issued Date">
                      <input type="date" value={form.permitIssuedDate} onChange={e=>setForm({...form,permitIssuedDate:e.target.value})} style={inputStyle} />
                    </Field>
                    <Field t={t} label="Inspection Date">
                      <input type="date" value={form.permitInspectionDate||""} onChange={e=>setForm({...form,permitInspectionDate:e.target.value})} style={inputStyle} />
                    </Field>
                    <Field t={t} label="Permit Closed Date">
                      <input type="date" value={form.permitClosedDate||""} onChange={e=>setForm({...form,permitClosedDate:e.target.value})} style={inputStyle} />
                    </Field>
                    <div style={{gridColumn:"1/-1"}}>
                      <Field t={t} label="Permit Notes">
                        <textarea value={form.permitNotes||""} onChange={e=>setForm({...form,permitNotes:e.target.value})} rows={2}
                          style={{...inputStyle, resize:"vertical", fontFamily:"inherit"}} placeholder="Permit-specific notes (inspector name, conditions, etc.)" />
                      </Field>
                    </div>
                    {/* Inline TAT preview while editing */}
                    {(form.permitAppliedDate || form.permitIssuedDate) && (
                      <div style={{gridColumn:"1/-1", background:t.inputBg, borderRadius:8, padding:"10px 14px", border:`1px solid ${t.inputBorder}`, display:"flex", gap:16, flexWrap:"wrap", fontSize:12}}>
                        {form.permitAppliedDate && !form.permitIssuedDate && (
                          <span style={{color:t.textSecondary}}>⏳ <b style={{color: daysSince(form.permitAppliedDate) > 14 ? COLORS.warn : t.text}}>{daysSince(form.permitAppliedDate)}d</b> since applied</span>
                        )}
                        {form.permitAppliedDate && form.permitIssuedDate && (
                          <span style={{color:t.textSecondary}}>Applied → Issued: <b style={{color: diffDays(form.permitAppliedDate,form.permitIssuedDate) <= 14 ? COLORS.ok : COLORS.warn}}>{diffDays(form.permitAppliedDate,form.permitIssuedDate)}d</b></span>
                        )}
                        {form.permitIssuedDate && form.permitInspectionDate && (
                          <span style={{color:t.textSecondary}}>Issued → Inspection: <b style={{color:COLORS.whe}}>{diffDays(form.permitIssuedDate,form.permitInspectionDate)}d</b></span>
                        )}
                        {form.permitAppliedDate && form.permitClosedDate && (
                          <span style={{color:t.textSecondary}}>Full cycle: <b style={{color:COLORS.purple}}>{diffDays(form.permitAppliedDate,form.permitClosedDate)}d</b></span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </Section>

              <Section t={t} title="Required Documents">
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:8, gridColumn:"1/-1" }}>
                  {(form.program === "WHE SF" ? DOCS_WHE : DOCS_HES).map(d=>(
                    <label key={d} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", background:t.checkboxLabelBg, borderRadius:8, cursor:"pointer", border:`1px solid ${t.cardBorder}` }}>
                      <input type="checkbox" checked={!!form.docs?.[d]} onChange={e=>setDoc(d,e.target.checked)} />
                      <span style={{ fontSize:13, color:t.text }}>{d}</span>
                    </label>
                  ))}
                </div>
              </Section>

              </>)}

              <Section t={t} title="Notes">
                <div style={{gridColumn:"1/-1"}}>
                  <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={3}
                    style={{...inputStyle, resize:"vertical", fontFamily:"inherit"}} placeholder="Add project notes..." />
                </div>
              </Section>
            </div>
          </div>
        )}

        </>)}
      </div>
    </div>
  );
}
