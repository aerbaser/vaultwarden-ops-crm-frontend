"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/state/auth-store";

const phaseMessages: Record<string, string> = {
  idle: "Enter your credentials to continue.",
  preloginLoading: "Fetching security profile...",
  derivingKey: "Deriving Vaultwarden key material...",
  tokenExchanging: "Exchanging credentials for a session token...",
  sessionBootstrapping: "Bootstrapping secure session...",
  success: "Authentication complete. Redirecting...",
  error: "Authentication failed. Review details and retry."
};

export function LoginForm() {
  const router = useRouter();
  const phase = useAuthStore((state) => state.phase);
  const error = useAuthStore((state) => state.error);
  const login = useAuthStore((state) => state.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isBusy =
    phase === "preloginLoading" ||
    phase === "derivingKey" ||
    phase === "tokenExchanging" ||
    phase === "sessionBootstrapping";

  const statusMessage = useMemo(() => phaseMessages[phase] ?? phaseMessages.idle, [phase]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const ok = await login(email.trim(), password);
    setPassword("");

    if (ok) {
      router.push("/vault");
    }
  };

  return (
    <form className="route-card" onSubmit={onSubmit} data-testid="login-form">
      <div style={{ display: "grid", gap: "0.75rem" }}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          autoComplete="username"
          onChange={(event) => setEmail(event.target.value)}
          required
          data-testid="login-email"
        />
      </div>

      <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.9rem" }}>
        <label htmlFor="password">Master Password</label>
        <input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          value={password}
          autoComplete="current-password"
          onChange={(event) => setPassword(event.target.value)}
          required
          data-testid="login-password"
        />
      </div>

      <label style={{ display: "inline-flex", gap: "0.5rem", marginTop: "0.9rem" }}>
        <input
          type="checkbox"
          checked={showPassword}
          onChange={(event) => setShowPassword(event.target.checked)}
        />
        Show password
      </label>

      <p style={{ marginTop: "0.9rem", color: "var(--text-muted)" }} data-testid="login-status">
        {statusMessage}
      </p>

      {error ? (
        <p role="alert" style={{ color: "var(--danger)", marginTop: "0.5rem" }} data-testid="login-error">
          {typeof error === "string" ? error : (error as { message?: string })?.message ?? "Login failed"}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isBusy}
        style={{ marginTop: "1rem" }}
        data-testid="login-submit"
      >
        {isBusy ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
