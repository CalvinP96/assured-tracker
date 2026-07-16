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

  const authCSS = <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');@keyframes spin { to { transform: rotate(360deg) } }body{margin:0;background:#05070d}input:focus{outline:none;box-shadow:0 0 0 3px rgba(220,38,38,.25);border-color:rgba(220,38,38,.5)!important}button{transition:filter .15s ease,transform .06s ease}button:hover{filter:brightness(1.12)}button:active{transform:translateY(1px)}`}</style>;
  const pageBg = "radial-gradient(900px 400px at 50% -80px, rgba(220,38,38,.12), transparent 70%), #0a0f1c";

  // Still checking auth state
  if (session === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: pageBg }}>
        <div style={{ fontSize: 32, animation: "spin 1s linear infinite", color: "#fff" }}>⟳</div>
        {authCSS}
      </div>
    );
  }

  // Not logged in — show login form
  if (!session) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: pageBg, fontFamily: "'DM Sans', system-ui, sans-serif", padding: 16 }}>
        {authCSS}
        <div style={{ width: 380, maxWidth: "100%", background: "linear-gradient(180deg, rgba(148,163,184,.07), rgba(148,163,184,.03))", borderRadius: 20, padding: "36px 32px", boxShadow: "0 24px 60px rgba(0,0,0,0.55)", border: "1px solid rgba(148,163,184,.14)", backdropFilter: "blur(10px)" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
            <div style={{
              width: 52, height: 52,
              background: "linear-gradient(135deg, #991b1b 0%, #dc2626 100%)",
              borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 26, color: "#fff",
              boxShadow: "0 10px 28px rgba(220,38,38,0.4), inset 0 1px 0 rgba(255,255,255,.25)"
            }}>A</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#f8fafc", textTransform: "uppercase", letterSpacing: 1 }}>Assured Energy</div>
              <div style={{ fontSize: 10, color: "#8b96ad", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.4 }}>Project Tracker</div>
            </div>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8b96ad", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".06em" }}>Email</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@assuredenergy.com"
                style={{ width: "100%", padding: "11px 14px", background: "#131a2c", border: "1px solid rgba(148,163,184,.16)", borderRadius: 10, fontSize: 14, color: "#f4f4f5", boxSizing: "border-box", fontFamily: "inherit" }}
              />
            </div>

            {mode === "password" && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8b96ad", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".06em" }}>Password</label>
                <input
                  type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: "100%", padding: "11px 14px", background: "#131a2c", border: "1px solid rgba(148,163,184,.16)", borderRadius: 10, fontSize: 14, color: "#f4f4f5", boxSizing: "border-box", fontFamily: "inherit" }}
                />
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "12px 0", fontWeight: 800, fontSize: 14,
              background: loading ? "#3f4a61" : "linear-gradient(135deg, #b91c1c, #dc2626)",
              color: "#fff", border: "none", borderRadius: 12, cursor: loading ? "wait" : "pointer",
              textTransform: "uppercase", letterSpacing: .8, fontFamily: "inherit",
              boxShadow: loading ? "none" : "0 6px 20px rgba(220,38,38,0.4), inset 0 1px 0 rgba(255,255,255,.2)"
            }}>
              {loading ? "Signing in…" : mode === "magic" ? "Send Magic Link" : "Sign In"}
            </button>
          </form>

          {error && <div style={{ marginTop: 12, padding: "9px 12px", background: "rgba(220,38,38,.12)", border: "1px solid rgba(220,38,38,.35)", borderRadius: 10, fontSize: 12, color: "#fca5a5" }}>{error}</div>}
          {message && <div style={{ marginTop: 12, padding: "9px 12px", background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.35)", borderRadius: 10, fontSize: 12, color: "#86efac" }}>{message}</div>}

          <div style={{ textAlign: "center", marginTop: 18 }}>
            <button onClick={() => { setMode(mode === "password" ? "magic" : "password"); setError(""); setMessage(""); }}
              style={{ background: "none", border: "none", color: "#8b96ad", cursor: "pointer", fontSize: 12, textDecoration: "underline", fontFamily: "inherit" }}>
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