import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "./supabaseClient";

// Context so App.jsx can access logout and user info
export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

/**
 * Auth wrapper — shows a login screen until the user is authenticated.
 * Supports both magic link (email-only) and email+password login.
 * 
 * To invite employees:
 *   Supabase Dashboard → Authentication → Users → Invite User
 *   They'll get an email to set their password.
 */
export default function Auth({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("password"); // "password" or "magic"
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => setSession(s)
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (mode === "magic") {
      const { error: err } = await supabase.auth.signInWithOtp({ email });
      if (err) setError(err.message);
      else setMessage("Check your email for the login link!");
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError(err.message);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const authCSS = <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');@keyframes spin { to { transform: rotate(360deg) } }body{margin:0;background:#f4f5f7}input:focus{outline:none;border-color:#4f46e5!important;box-shadow:0 0 0 3px rgba(79,70,229,.12)}button{transition:background-color .12s ease,box-shadow .12s ease}button:hover{filter:brightness(.97)}`}</style>;

  // Still checking auth state
  if (session === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f5f7" }}>
        <div style={{ fontSize: 32, animation: "spin 1s linear infinite", color: "#6b7280" }}>⟳</div>
        {authCSS}
      </div>
    );
  }

  // Not logged in — show login form
  if (!session) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f5f7", fontFamily: "'Inter', system-ui, sans-serif", padding: 16 }}>
        {authCSS}
        <div style={{ width: 380, maxWidth: "100%", background: "#ffffff", borderRadius: 10, padding: "36px 32px", boxShadow: "0 1px 3px rgba(16,24,40,.08), 0 8px 24px rgba(16,24,40,.06)", border: "1px solid #e5e7eb" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 28 }}>
            <div style={{
              width: 46, height: 46,
              background: "#b91c1c",
              borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 21, color: "#fff"
            }}>A</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#111827", letterSpacing: "-.01em" }}>Assured Energy</div>
              <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Project Tracker</div>
            </div>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 5 }}>Email</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@assuredenergy.com"
                style={{ width: "100%", padding: "10px 12px", background: "#ffffff", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, color: "#1f2937", boxSizing: "border-box", fontFamily: "inherit" }}
              />
            </div>

            {mode === "password" && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 5 }}>Password</label>
                <input
                  type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: "100%", padding: "10px 12px", background: "#ffffff", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, color: "#1f2937", boxSizing: "border-box", fontFamily: "inherit" }}
                />
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "11px 0", fontWeight: 600, fontSize: 14,
              background: loading ? "#9ca3af" : "#4f46e5",
              color: "#fff", border: "none", borderRadius: 6, cursor: loading ? "wait" : "pointer",
              fontFamily: "inherit",
              boxShadow: "0 1px 2px rgba(16,24,40,.08)"
            }}>
              {loading ? "Signing in…" : mode === "magic" ? "Send Magic Link" : "Sign In"}
            </button>
          </form>

          {error && <div style={{ marginTop: 12, padding: "9px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, fontSize: 12, color: "#b91c1c" }}>{error}</div>}
          {message && <div style={{ marginTop: 12, padding: "9px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, fontSize: 12, color: "#15803d" }}>{message}</div>}

          <div style={{ textAlign: "center", marginTop: 18 }}>
            <button onClick={() => { setMode(mode === "password" ? "magic" : "password"); setError(""); setMessage(""); }}
              style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 12, textDecoration: "underline", fontFamily: "inherit" }}>
              {mode === "password" ? "Use magic link instead" : "Use password instead"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Logged in — render the app with logout available via context
  return (
    <AuthContext.Provider value={{ session, handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}