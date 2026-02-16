import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabaseClient";

// ── camelCase ↔ snake_case mapping ──────────────────────────────────────────
const fieldMap = {
  customerName: "customer_name",
  assessmentDate: "assessment_date",
  riseSubmitDate: "rise_submit_date",
  riApprovedDate: "ri_approved_date",
  installDate: "install_date",
  lastInstallDate: "last_install_date",
  nextInstallDate: "next_install_date",
  totalJobPrice: "total_job_price",
  invoiceSubmittedDate: "invoice_submitted_date",
  permitStatus: "permit_status",
  permitNumber: "permit_number",
  permitAppliedDate: "permit_applied_date",
  permitIssuedDate: "permit_issued_date",
  permitJurisdiction: "permit_jurisdiction",
  permitInspectionDate: "permit_inspection_date",
  permitClosedDate: "permit_closed_date",
  permitNotes: "permit_notes",
  stageHistory: "stage_history",
  leadDate: "lead_date",
  createdAt: "created_at",
  updatedAt: "updated_at",
};

const reverseMap = Object.fromEntries(
  Object.entries(fieldMap).map(([k, v]) => [v, k])
);

/** Convert a DB row (snake_case) → app object (camelCase) */
function dbToApp(row) {
  const obj = {};
  for (const [dbKey, value] of Object.entries(row)) {
    const appKey = reverseMap[dbKey] || dbKey;
    // Convert null dates to empty strings for the UI
    if (appKey.endsWith("Date") && value === null) {
      obj[appKey] = "";
    } else if (appKey === "totalJobPrice") {
      obj[appKey] = value !== null && value !== undefined ? String(value) : "";
    } else if (value === null) {
      obj[appKey] = "";
    } else {
      obj[appKey] = value;
    }
  }
  // Ensure docs and stageHistory are always proper types
  if (!obj.docs || typeof obj.docs !== "object") obj.docs = {};
  if (!Array.isArray(obj.stageHistory)) obj.stageHistory = [];
  return obj;
}

/** Convert an app object (camelCase) → DB row (snake_case) */
function appToDb(project) {
  const row = {};
  for (const [appKey, value] of Object.entries(project)) {
    if (appKey === "updatedAt") continue; // managed by DB trigger
    const dbKey = fieldMap[appKey] || appKey;
    // Convert empty date strings to null
    if (appKey.endsWith("Date") && value === "") {
      row[dbKey] = null;
    } else if (appKey === "totalJobPrice") {
      row[dbKey] = value !== "" ? parseFloat(value) || null : null;
    } else {
      row[dbKey] = value;
    }
  }
  return row;
}

// ── hook ─────────────────────────────────────────────────────────────────────
export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);

  // Initial fetch
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const { data, error: err } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: true });

      if (err) {
        console.error("Supabase fetch error:", err);
        setError(err.message);
      } else {
        setProjects(data.map(dbToApp));
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("projects-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;

          if (eventType === "INSERT") {
            const newProject = dbToApp(newRow);
            setProjects((ps) => {
              // Avoid duplicates (we may have already added it optimistically)
              if (ps.some((p) => p.id === newProject.id)) return ps;
              return [...ps, newProject];
            });
          } else if (eventType === "UPDATE") {
            const updated = dbToApp(newRow);
            setProjects((ps) =>
              ps.map((p) => (p.id === updated.id ? updated : p))
            );
          } else if (eventType === "DELETE") {
            setProjects((ps) => ps.filter((p) => p.id !== oldRow.id));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // CRUD operations
  const addProject = useCallback(async (project) => {
    // Optimistic update
    setProjects((ps) => [...ps, project]);

    const row = appToDb(project);
    const { error: err } = await supabase.from("projects").insert(row);
    if (err) {
      console.error("Insert error:", err);
      setError(err.message);
      // Rollback optimistic update
      setProjects((ps) => ps.filter((p) => p.id !== project.id));
    }
  }, []);

  const updateProject = useCallback(async (project) => {
    // Optimistic update
    setProjects((ps) => ps.map((p) => (p.id === project.id ? project : p)));

    const row = appToDb(project);
    const { error: err } = await supabase
      .from("projects")
      .update(row)
      .eq("id", project.id);
    if (err) {
      console.error("Update error:", err);
      setError(err.message);
    }
  }, []);

  const deleteProject = useCallback(async (id) => {
    // Optimistic update
    const backup = projects;
    setProjects((ps) => ps.filter((p) => p.id !== id));

    const { error: err } = await supabase
      .from("projects")
      .delete()
      .eq("id", id);
    if (err) {
      console.error("Delete error:", err);
      setError(err.message);
      setProjects(backup); // rollback
    }
  }, [projects]);

  const clearError = () => setError(null);

  return {
    projects,
    setProjects,
    loading,
    error,
    clearError,
    addProject,
    updateProject,
    deleteProject,
  };
}
