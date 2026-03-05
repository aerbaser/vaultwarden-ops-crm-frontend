import { create } from "zustand";
import {
  bootstrapSession,
  exchangeToken,
  logout as logoutRequest,
  prelogin
} from "@/lib/api/endpoints/auth";
import { registerAuthFailureHandler } from "@/lib/api/client";
import type { ApiError, SessionUser } from "@/lib/api/types";
import {
  deriveVaultPasswordHash,
  UnsupportedKdfVariantError
} from "@/lib/crypto/vaultwarden";

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
  session: SessionUser | null;
  csrfToken: string | null;
  derivedKey: string | null;
  error: ApiError | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearSensitive: () => void;
  handleAuthFailure: (error: ApiError) => void;
  resetForTest: () => void;
};

const toApiError = (error: unknown): ApiError => {
  if (error instanceof UnsupportedKdfVariantError) {
    return {
      status: 400,
      code: error.code,
      message: error.message,
      recoverable: false,
      actionHint: "Use an account profile with a supported KDF."
    };
  }

  if (error && typeof error === "object") {
    const candidate = error as Partial<ApiError>;
    if (typeof candidate.code === "string" && typeof candidate.message === "string") {
      return {
        status: candidate.status ?? 500,
        code: candidate.code,
        message: candidate.message,
        recoverable: candidate.recoverable ?? false,
        actionHint: candidate.actionHint
      };
    }
  }

  return {
    status: 500,
    code: "unknown_error",
    message: "Authentication failed",
    recoverable: true,
    actionHint: "Retry in a moment."
  };
};

const initialState: Pick<
  AuthState,
  "phase" | "session" | "csrfToken" | "derivedKey" | "error"
> = {
  phase: "idle",
  session: null,
  csrfToken: null,
  derivedKey: null,
  error: null
};

export const useAuthStore = create<AuthState>((set, get) => ({
  ...initialState,

  login: async (email: string, password: string) => {
    try {
      set({ phase: "preloginLoading", error: null });
      const preloginData = await prelogin({ email });

      set({ phase: "derivingKey" });
      const passwordHash = await deriveVaultPasswordHash(password, preloginData);
      set({ derivedKey: passwordHash });

      set({ phase: "tokenExchanging" });
      const token = await exchangeToken({ email, passwordHash });

      set({ phase: "sessionBootstrapping", csrfToken: token.csrfToken });
      const session = await bootstrapSession({
        accessToken: token.accessToken,
        csrfToken: token.csrfToken
      });

      set({
        phase: "success",
        session: session.session,
        csrfToken: session.csrfToken,
        derivedKey: null,
        error: null
      });

      return true;
    } catch (error: unknown) {
      set({
        phase: "error",
        error: toApiError(error),
        derivedKey: null,
        session: null
      });
      return false;
    }
  },

  logout: async () => {
    const csrfToken = get().csrfToken ?? undefined;

    try {
      await logoutRequest(csrfToken);
    } finally {
      set({
        ...initialState
      });
    }
  },

  clearSensitive: () => {
    set({ derivedKey: null });
  },

  handleAuthFailure: (error: ApiError) => {
    set({
      ...initialState,
      phase: "error",
      error
    });
  },

  resetForTest: () => {
    set({
      ...initialState
    });
  }
}));

registerAuthFailureHandler((error) => {
  useAuthStore.getState().handleAuthFailure(error);
});
