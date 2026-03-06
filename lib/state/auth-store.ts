"use client";
import { create } from "zustand";
import {
  prelogin,
  vaultLogin,
  bootstrapCrmSession,
  logout as logoutRequest,
} from "@/lib/api/endpoints/auth";
import { deriveVaultPasswordHash } from "@/lib/crypto/vaultwarden";

export type AuthPhase =
  | "idle"
  | "preloginLoading"
  | "derivingKey"
  | "tokenExchanging"
  | "sessionBootstrapping"
  | "success"
  | "error";

type AuthState = {
  phase: AuthPhase;
  email: string | null;
  csrfToken: string | null;
  vaultToken: string | null;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  resetForTest: () => void;
};

const initialState: Pick<
  AuthState,
  "phase" | "email" | "csrfToken" | "vaultToken" | "error"
> = {
  phase: "idle",
  email: null,
  csrfToken: null,
  vaultToken: null,
  error: null,
};

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,

  login: async (email: string, password: string) => {
    try {
      // Step 1: Prelogin — get KDF params
      set({ phase: "preloginLoading", error: null });
      const preloginData = await prelogin(email);

      // Step 2: Derive password hash
      // Vaultwarden returns Kdf/KdfIterations (capitalized)
      set({ phase: "derivingKey" });
      const passwordHash = await deriveVaultPasswordHash(password, {
        kdf: "pbkdf2",
        iterations: preloginData.KdfIterations ?? 600000,
        salt: email.toLowerCase(), // Vaultwarden uses lowercase email as PBKDF2 salt
      });

      // Step 3: Get vault access token
      set({ phase: "tokenExchanging" });
      const vaultData = await vaultLogin(email, passwordHash);

      // Step 4: Bootstrap CRM session
      set({ phase: "sessionBootstrapping" });
      const sessionData = await bootstrapCrmSession(email, vaultData.access_token);

      set({
        phase: "success",
        email,
        csrfToken: sessionData.csrfToken,
        vaultToken: vaultData.access_token,
        error: null,
      });

      return true;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Authentication failed";
      set({ phase: "error", error: message, vaultToken: null });
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
