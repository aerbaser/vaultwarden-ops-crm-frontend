import { apiRequest } from "@/lib/api/client";
import { SessionUser } from "@/lib/api/types";

export type PreloginRequest = {
  email: string;
};

export type PreloginResponse = {
  kdf: "pbkdf2" | "argon2";
  iterations: number;
  salt: string;
};

export type TokenExchangeRequest = {
  email: string;
  passwordHash: string;
};

export type TokenExchangeResponse = {
  accessToken: string;
  csrfToken: string;
};

export type SessionBootstrapResponse = {
  session: SessionUser;
  csrfToken: string;
};

export const prelogin = (payload: PreloginRequest) =>
  apiRequest<PreloginResponse, PreloginRequest>("/api/vault/prelogin", {
    method: "POST",
    body: payload
  });

export const exchangeToken = (payload: TokenExchangeRequest) =>
  apiRequest<TokenExchangeResponse, TokenExchangeRequest>("/api/vault/token", {
    method: "POST",
    body: payload
  });

export const bootstrapSession = (payload: { accessToken: string; csrfToken: string }) =>
  apiRequest<SessionBootstrapResponse, { accessToken: string; csrfToken: string }>(
    "/api/auth/session",
    {
      method: "POST",
      body: payload,
      csrfToken: payload.csrfToken
    }
  );

export const getSession = () => apiRequest<{ session: SessionUser; csrfToken: string }>("/api/auth/session");

export const logout = (csrfToken?: string) =>
  apiRequest<void>("/api/auth/logout", {
    method: "POST",
    csrfToken
  });
