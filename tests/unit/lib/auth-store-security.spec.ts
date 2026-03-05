import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/lib/state/auth-store";
import * as authApi from "@/lib/api/endpoints/auth";

describe("auth store security", () => {
  beforeEach(() => {
    useAuthStore.getState().resetForTest();
    vi.restoreAllMocks();
  });

  it("tracks login phases in order", async () => {
    vi.spyOn(authApi, "prelogin").mockResolvedValue({
      kdf: "pbkdf2",
      iterations: 600000,
      salt: "salt"
    });
    vi.spyOn(authApi, "exchangeToken").mockResolvedValue({
      accessToken: "token",
      csrfToken: "csrf"
    });
    vi.spyOn(authApi, "bootstrapSession").mockResolvedValue({
      session: { id: "u1", email: "user@example.com" },
      csrfToken: "csrf"
    });

    const phases: string[] = [];
    const unsubscribe = useAuthStore.subscribe((state) => {
      phases.push(state.phase);
    });

    await useAuthStore.getState().login("user@example.com", "password123");
    unsubscribe();

    expect(phases).toContain("preloginLoading");
    expect(phases).toContain("derivingKey");
    expect(phases).toContain("tokenExchanging");
    expect(phases).toContain("sessionBootstrapping");
    expect(useAuthStore.getState().phase).toBe("success");
  });

  it("handles unsupported KDF variants", async () => {
    vi.spyOn(authApi, "prelogin").mockResolvedValue({
      kdf: "argon2",
      iterations: 4,
      salt: "salt"
    });

    const result = await useAuthStore.getState().login("user@example.com", "password123");

    expect(result).toBe(false);
    expect(useAuthStore.getState().phase).toBe("error");
    expect(useAuthStore.getState().error?.code).toBe("unsupported_kdf_variant");
    expect(useAuthStore.getState().derivedKey).toBeNull();
  });

  it("clears sensitive memory after failed login and logout", async () => {
    vi.spyOn(authApi, "prelogin").mockResolvedValue({
      kdf: "pbkdf2",
      iterations: 600000,
      salt: "salt"
    });
    vi.spyOn(authApi, "exchangeToken").mockRejectedValue({
      status: 401,
      code: "invalid_credentials",
      message: "Invalid credentials",
      recoverable: true
    });

    await useAuthStore.getState().login("user@example.com", "bad-password");

    expect(useAuthStore.getState().derivedKey).toBeNull();
    expect(useAuthStore.getState().phase).toBe("error");

    useAuthStore.setState({
      session: { id: "u2", email: "user2@example.com" },
      csrfToken: "csrf",
      phase: "success"
    });

    vi.spyOn(authApi, "logout").mockResolvedValue();

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().csrfToken).toBeNull();
    expect(useAuthStore.getState().derivedKey).toBeNull();
    expect(useAuthStore.getState().phase).toBe("idle");
  });
});
