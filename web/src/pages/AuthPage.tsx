import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, isSupabaseConfigured, supabaseConfig } from "../api";
import { useSession } from "../session";

/** Send the learner to Supabase's Google OAuth; Supabase returns here with a token. */
function googleAuthUrl(): string {
  const redirect = `${window.location.origin}/login`;
  return `${supabaseConfig.url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirect)}`;
}

export default function AuthPage() {
  const { login, signup, refresh } = useSession();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Supabase returns the Google session in the URL hash after the OAuth redirect.
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = params.get("access_token");
    if (!accessToken) return;
    window.history.replaceState(null, "", window.location.pathname);
    api
      .supabaseLogin(accessToken)
      .then(() => refresh())
      .then(() => navigate("/", { replace: true }))
      .catch((err: Error) => setError(err.message));
  }, [navigate, refresh]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      if (mode === "signup" && password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      try {
        if (mode === "login") {
          await login(email, password);
        } else {
          await signup(email, password);
        }
        navigate("/", { replace: true });
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [mode, email, password, confirmPassword, login, signup, navigate],
  );

  return (
    <div className="mx-auto max-w-sm px-4">
      <div className="flex flex-col gap-4 pt-6">
        <Link to="/" className="text-center text-sm font-semibold text-duo-muted">
          &larr; Back
        </Link>

        <h1 className="text-3xl font-extrabold tracking-tight text-duo-ink">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-sm text-duo-muted">
          {mode === "login"
              ? "Log in to keep your streak going."
              : "Pick up where you left off."}
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold uppercase tracking-wide ${
              mode === "login"
                  ? "bg-duo-green text-white"
                  : "bg-duo-surface text-duo-ink"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold uppercase tracking-wide ${
              mode === "signup"
                  ? "bg-duo-green text-white"
                  : "bg-duo-surface text-duo-ink"
            }`}
          >
            Sign up
          </button>
        </div>

        {isSupabaseConfigured() && (
          <a
            href={googleAuthUrl()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-duo-border bg-white py-2.5 text-sm font-bold text-duo-ink hover:bg-duo-surface"
          >
            Continue with Google
          </a>
        )}

        <form className="rounded-2xl border border-duo-border bg-white p-4" onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="mb-1.5 block text-sm font-semibold text-duo-ink" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete={mode === "login" ? "email" : "new-email"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-duo-border px-3 py-2 text-sm font-medium outline-none focus:border-duo-blue focus:ring-2 focus:ring-duo-blue/20"
              required
            />
          </div>

          <div className="mb-3">
            <label className="mb-1.5 block text-sm font-semibold text-duo-ink" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "login" ? "Your password" : "At least 8 characters"}
              className="w-full rounded-xl border border-duo-border px-3 py-2 text-sm font-medium outline-none focus:border-duo-blue focus:ring-2 focus:ring-duo-blue/20"
              required
              minLength={8}
            />
          </div>

          {mode === "signup" && (
            <div className="mb-3">
              <label className="mb-1.5 block text-sm font-semibold text-duo-ink" htmlFor="confirm">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                className="w-full rounded-xl border border-duo-border px-3 py-2 text-sm font-medium outline-none focus:border-duo-blue focus:ring-2 focus:ring-duo-blue/20"
                required
                minLength={8}
              />
            </div>
          )}

          {error && <p className="mb-3 text-sm font-semibold text-duo-red">{error}</p>}

          <button type="submit" className="w-full rounded-xl bg-duo-green py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:brightness-105">
            {mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <p className="mt-3 text-center text-sm text-duo-muted">
          {mode === "login" ? "New to Bolingo?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
            }}
            className="font-semibold text-duo-blue hover:text-duo-blue-dark"
          >
            {mode === "login" ? "Create one" : "Log in"}
          </button>
        </p>

        <p className="mt-3 text-center text-xs text-duo-muted">
          No credit card required — the offline lesson generator gets you started.
        </p>
      </div>
    </div>
  );
}
