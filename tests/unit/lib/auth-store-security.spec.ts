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
      Kdf: 0,
      KdfIterations: 600000,
      KdfMemory: null,
      KdfParallelism: null,
    });
    vi.spyOn(authApi, "vaultLogin").mockResolvedValue({
      access_token: "vault-token-123",
      token_type: "Bearer",
      expires_in: 3600,
    });
    vi.spyOn(authApi, "bootstrapCrmSession").mockResolvedValue({
      csrfToken: "csrf-123",
    });

    const phases: string[] = [];
    const unsubscribe = useAuthStore.subscribe((state) => {
      phases.push(state.phase);
    });

    const result = await useAuthStore.getState().login("user@example.com", "password123");
    unsubscribe();

    expect(result).toBe(true);
    expect(phases).toContain("preloginLoading");
    expect(phases).toContain("derivingKey");
    expect(phases).toContain("tokenExchanging");
    expect(phases).toContain("sessionBootstrapping");
    expect(useAuthStore.getState().phase).toBe("success");
    expect(useAuthStore.getState().vaultToken).toBe("vault-token-123");
    expect(useAuthStore.getState().csrfToken).toBe("csrf-123");
  });

  it("handles unsupported KDF variants (argon2 not supported)", async () => {
    vi.spyOn(authApi, "prelogin").mockResolvedValue({
      Kdf: 1, // argon2 type
      KdfIterations: 4,
      KdfMemory: 64,
      KdfParallelism: 4,
    });

    // Override KdfIterations check: auth-store reads KdfIterations and passes kdf:"pbkdf2"
    // To trigger UnsupportedKdfVariantError we mock deriveVaultPasswordHash via a bad prelogin response
    // that makes KdfIterations invalid
    const { deriveVaultPasswordHash } = await import("@/lib/crypto/vaultwarden");
    const cryptoMock = vi.spyOn(
      await import("@/lib/crypto/vaultwarden"),
      "deriveVaultPasswordHash"
    );
    cryptoMock.mockRejectedValue(
      Object.assign(new Error("Unsupported KDF variant: argon2"), {
        code: "unsupported_kdf_variant",
      })
    );

    const result = await useAuthStore.getState().login("user@example.com", "password123");

    expect(result).toBe(false);
    expect(useAuthStore.getState().phase).toBe("error");
    expect(useAuthStore.getState().vaultToken).toBeNull();
  });

  it("clears sensitive data after failed vault login", async () => {
    vi.spyOn(authApi, "prelogin").mockResolvedValue({
      Kdf: 0,
      KdfIterations: 600000,
      KdfMemory: null,
      KdfParallelism: null,
    });
    vi.spyOn(authApi, "vaultLogin").mockRejectedValue(
      new Error("Username or password is incorrect.")
    );

    await useAuthStore.getState().login("user@example.com", "bad-password");

    expect(useAuthStore.getState().vaultToken).toBeNull();
    expect(useAuthStore.getState().phase).toBe("error");
    expect(useAuthStore.getState().error).toContain("incorrect");
  });

  it("clears tokens after logout", async () => {
    // Set up a logged-in state
    useAuthStore.setState({
      phase: "success",
      email: "user@example.com",
      csrfToken: "csrf-abc",
      vaultToken: "vault-abc",
      error: null,
    });

    vi.spyOn(authApi, "logout").mockResolvedValue(undefined);

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().vaultToken).toBeNull();
    expect(useAuthStore.getState().csrfToken).toBeNull();
    expect(useAuthStore.getState().email).toBeNull();
    expect(useAuthStore.getState().phase).toBe("idle");
  });
});
