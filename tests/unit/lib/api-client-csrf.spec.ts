import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, isMutatingMethod } from "@/lib/api/client";

describe("api client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("always sends cookie credentials", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    await apiRequest<{ ok: boolean }>("/api/health", { method: "GET" });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0];
    expect(init?.credentials).toBe("include");
  });

  it("adds csrf token to mutating requests", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    await apiRequest<{ ok: boolean }>("/api/auth/session", {
      method: "POST",
      csrfToken: "csrf-token-value",
      body: { id: "abc" }
    });

    const [, init] = fetchSpy.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.get("x-csrf-token")).toBe("csrf-token-value");
  });

  it("normalizes API failures", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "invalid_payload",
          message: "Payload validation failed",
          recoverable: true,
          actionHint: "Fix and retry"
        }),
        {
          status: 422,
          headers: { "content-type": "application/json" }
        }
      )
    );

    await expect(apiRequest("/api/test", { method: "PATCH" })).rejects.toMatchObject({
      status: 422,
      code: "invalid_payload",
      message: "Payload validation failed",
      recoverable: true,
      actionHint: "Fix and retry"
    });
  });

  it("knows mutating methods", () => {
    expect(isMutatingMethod("POST")).toBe(true);
    expect(isMutatingMethod("PUT")).toBe(true);
    expect(isMutatingMethod("PATCH")).toBe(true);
    expect(isMutatingMethod("DELETE")).toBe(true);
    expect(isMutatingMethod("GET")).toBe(false);
  });
});
