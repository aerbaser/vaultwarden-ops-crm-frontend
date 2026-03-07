"use client";
import { create } from "zustand";
import {
  prelogin,
  vaultLogin,
  bootstrapCrmSession,
  logout as logoutRequest,
} from "@/lib/api/endpoints/auth";
import { deriveVaultPasswordHash } from "@/lib/crypto/vaultwarden";
import { deriveMasterKey, decryptProfileKey, decryptField } from "@/lib/crypto/vaultwarden-full";

export type AuthPhase =
  | "idle"
  | "preloginLoading"
  | "derivingKey"
  | "tokenExchanging"
  | "sessionBootstrapping"
  | "vaultSyncing"
  | "success"
  | "error";

export type VaultCipher = {
  Id: string;
  Name: string;
  Type: number;
  FolderId: string | null;
  Login?: { Username?: string; Password?: string; Uris?: { Uri: string }[] };
  Card?: { Brand?: string; Number?: string; ExpMonth?: string; ExpYear?: string };
  Notes?: string;
};

export type DecryptedCipher = {
  id: string;
  name: string;
  type: number;
  folderId: string | null;
  username: string;
  password: string;
  uri: string;
  notes: string;
};

type AuthState = {
  phase: AuthPhase;
  email: string | null;
  csrfToken: string | null;
  vaultToken: string | null;
  // In-memory only — never persisted
  symKey: Uint8Array | null;
  ciphers: DecryptedCipher[];
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  resetForTest: () => void;
};

const initialState: Pick<
  AuthState,
  "phase" | "email" | "csrfToken" | "vaultToken" | "symKey" | "ciphers" | "error"
> = {
  phase: "idle",
  email: null,
  csrfToken: null,
  vaultToken: null,
  symKey: null,
  ciphers: [],
  error: null,
};

async function decryptCiphers(
  rawCiphers: VaultCipher[],
  symKey: Uint8Array
): Promise<DecryptedCipher[]> {
  return Promise.all(
    rawCiphers.map(async (c) => ({
      id: c.Id,
      name: await decryptField(c.Name, symKey),
      type: c.Type,
      folderId: c.FolderId,
      username: await decryptField(c.Login?.Username ?? "", symKey),
      password: await decryptField(c.Login?.Password ?? "", symKey),
      uri: await decryptField(c.Login?.Uris?.[0]?.Uri ?? "", symKey),
      notes: await decryptField(c.Notes ?? "", symKey),
    }))
  );
}

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,

  login: async (email: string, password: string) => {
    try {
      // Step 1: Prelogin — get KDF params
      set({ phase: "preloginLoading", error: null });
      const preloginData = await prelogin(email);

      const iterations = preloginData.KdfIterations ?? 600000;

      // Step 2: Derive master key (stored in memory) + login hash (sent to server)
      set({ phase: "derivingKey" });
      const masterKey = await deriveMasterKey(email.toLowerCase(), password, iterations);
      const passwordHash = await deriveVaultPasswordHash(password, {
        kdf: "pbkdf2",
        iterations,
        salt: email.toLowerCase(),
      });

      // Step 3: Get vault access token
      set({ phase: "tokenExchanging" });
      const vaultData = await vaultLogin(email, passwordHash);

      // Step 4: Vault sync — decrypt profile key → user symmetric key → decrypt ciphers
      set({ phase: "vaultSyncing" });
      let ciphers: DecryptedCipher[] = [];
      let symKey: Uint8Array | null = null;
      try {
        const syncResp = await fetch("/api/vault/sync", {
          headers: { authorization: `Bearer ${vaultData.access_token}` },
        });
        if (syncResp.ok) {
          const sync = await syncResp.json() as {
            Profile?: { Key?: string };
            Ciphers?: VaultCipher[];
            Folders?: unknown[];
          };
          if (sync.Profile?.Key) {
            symKey = await decryptProfileKey(sync.Profile.Key, masterKey);
            ciphers = await decryptCiphers(sync.Ciphers ?? [], symKey);
          }
        }
      } catch {
        // Vault sync failure is non-fatal — continue to CRM session
      }

      // Step 5: Bootstrap CRM session
      set({ phase: "sessionBootstrapping" });
      const sessionData = await bootstrapCrmSession(email, vaultData.access_token);

      set({
        phase: "success",
        email,
        csrfToken: sessionData.csrfToken,
        vaultToken: vaultData.access_token,
        symKey,
        ciphers,
        error: null,
      });

      return true;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Authentication failed";
      set({ phase: "error", error: message, vaultToken: null, symKey: null, ciphers: [] });
      return false;
    }
  },

  logout: async () => {
    await logoutRequest();
    set({ ...initialState });
  },

  resetForTest: () => {
    set({ ...initialState });
  },
}));
