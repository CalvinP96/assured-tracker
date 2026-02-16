import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

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

  // Still checking auth state
  if (session === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#18181b" }}>
        <div style={{ fontSize: 32, animation: "spin 1s linear infinite", color: "#fff" }}>⟳</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  // Not logged in — show login form
  if (!session) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#18181b", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ width: 380, background: "#27272a", borderRadius: 16, padding: "36px 32px", boxShadow: "0 12px 40px rgba(0,0,0,0.5)", border: "1px solid #3f3f46" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <div style={{
              width: 48, height: 48,
              background: "linear-gradient(135deg, #991b1b 0%, #dc2626 100%)",
              borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, fontSize: 26, color: "#fff",
              border: "2px solid #000", boxShadow: "0 4px 12px rgba(153,27,27,0.5)"
            }}>A</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16, color: "#f4f4f5", textTransform: "uppercase", letterSpacing: 1 }}>Assured Energy</div>
              <div style={{ fontSize: 10, color: "#71717a", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2 }}>Project Tracker</div>
            </div>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#a1a1aa", marginBottom: 4 }}>Email</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@assuredenergy.com"
                style={{ width: "100%", padding: "10px 14px", background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 14, color: "#f4f4f5", boxSizing: "border-box" }}
              />
            </div>

            {mode === "password" && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#a1a1aa", marginBottom: 4 }}>Password</label>
                <input
                  type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: "100%", padding: "10px 14px", background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 14, color: "#f4f4f5", boxSizing: "border-box" }}
                />
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "11px 0", fontWeight: 800, fontSize: 14,
              background: loading ? "#6b7280" : "linear-gradient(135deg, #991b1b, #dc2626)",
              color: "#fff", border: "2px solid #000", borderRadius: 8, cursor: loading ? "wait" : "pointer",
              textTransform: "uppercase", letterSpacing: .5,
              boxShadow: loading ? "none" : "0 4px 12px rgba(153,27,27,0.5)"
            }}>
              {loading ? "Signing in…" : mode === "magic" ? "Send Magic Link" : "Sign In"}
            </button>
          </form>

          {error && <div style={{ marginTop: 12, padding: "8px 12px", background: "#7c2d12", border: "1px solid #dc2626", borderRadius: 8, fontSize: 12, color: "#fca5a5" }}>{error}</div>}
          {message && <div style={{ marginTop: 12, padding: "8px 12px", background: "#14532d", border: "1px solid #22c55e", borderRadius: 8, fontSize: 12, color: "#86efac" }}>{message}</div>}

          <div style={{ textAlign: "center", marginTop: 16 }}>
            <button onClick={() => { setMode(mode === "password" ? "magic" : "password"); setError(""); setMessage(""); }}
              style={{ background: "none", border: "none", color: "#a1a1aa", cursor: "pointer", fontSize: 12, textDecoration: "underline" }}>
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

// Context so App.jsx can access logout and user info
import { createContext, useContext } from "react";
export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
