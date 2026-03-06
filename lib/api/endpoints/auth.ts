// Use relative URL so requests go through Next.js proxy → localhost:3001
const BASE = "";

export type PreloginResponse = {
  Kdf: number;
  KdfIterations: number;
  KdfMemory: number | null;
  KdfParallelism: number | null;
};

export type VaultTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  Key?: string;
  ErrorModel?: { Message: string };
};

export type SessionResponse = {
  csrfToken: string;
  userId?: string;
};

export async function prelogin(email: string): Promise<PreloginResponse> {
  const r = await fetch(`${BASE}/api/vault/token/prelogin`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!r.ok) throw new Error(`Prelogin failed: ${r.status}`);
  return r.json();
}

export async function vaultLogin(
  email: string,
  passwordHash: string
): Promise<VaultTokenResponse> {
  let deviceId =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("vw_device_id")
      : null;
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("vw_device_id", deviceId);
    }
  }

  const form = new URLSearchParams({
    grant_type: "password",
    username: email,
    password: passwordHash,
    scope: "api offline_access",
    client_id: "web",
    device_identifier: deviceId,
    device_name: "vault-ops-crm",
    device_type: "10",
  });

  const r = await fetch(`${BASE}/api/vault/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const data = await r.json();
  if (!data.access_token) {
    throw new Error(data.ErrorModel?.Message ?? `Vault auth failed: ${r.status}`);
  }
  return data;
}

export async function bootstrapCrmSession(
  email: string,
  vaultToken: string
): Promise<SessionResponse> {
  const r = await fetch(`${BASE}/api/auth/session`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: email, email, role: "owner" }),
  });
  if (!r.ok) throw new Error(`Session bootstrap failed: ${r.status}`);
  const data = await r.json();

  // Store tokens in sessionStorage for use by other API calls
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem("crm_csrf", data.csrfToken ?? "");
    sessionStorage.setItem("vault_token", vaultToken);
  }

  return data;
}

export async function vaultSync(vaultToken: string): Promise<unknown> {
  const BASE_URL = "";
  const r = await fetch(`${BASE_URL}/api/vault/sync`, {
    headers: { authorization: `Bearer ${vaultToken}` },
  });
  if (!r.ok) throw new Error(`Vault sync failed: ${r.status}`);
  return r.json();
}

export async function logout(): Promise<void> {
  const csrf =
    typeof sessionStorage !== "undefined"
      ? (sessionStorage.getItem("crm_csrf") ?? "")
      : "";
  await fetch(`${BASE}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: { "x-csrf-token": csrf },
  }).catch(() => {});
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem("crm_csrf");
    sessionStorage.removeItem("vault_token");
  }
}
