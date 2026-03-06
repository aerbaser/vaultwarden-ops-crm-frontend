import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="route-shell">
      <h1>Sign In to Vault Ops CRM</h1>
      <p style={{ fontSize: "0.7rem", color: "#888", marginBottom: "1rem" }}>v2025-03-05-b</p>
      <LoginForm />
    </main>
  );
}
