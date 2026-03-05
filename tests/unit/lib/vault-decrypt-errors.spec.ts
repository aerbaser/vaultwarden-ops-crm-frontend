import { describe, expect, it } from "vitest";
import { createDecryptedCacheKey, decryptRecords } from "@/lib/vault/decrypt";

describe("vault decrypt", () => {
  it("isolates per-record decrypt errors", async () => {
    const records = [
      {
        id: "record-1",
        revision: 1,
        title: "Portal",
        kind: "login" as const,
        encryptedPayload: btoa(JSON.stringify({ username: "alice", secret: "pw" })),
        folderId: "folder-1",
        createdAt: "2026-03-05T00:00:00.000Z",
        updatedAt: "2026-03-05T00:00:00.000Z"
      },
      {
        id: "record-2",
        revision: 1,
        title: "Broken",
        kind: "login" as const,
        encryptedPayload: "not-base64-json",
        folderId: "folder-1",
        createdAt: "2026-03-05T00:00:00.000Z",
        updatedAt: "2026-03-05T00:00:00.000Z"
      }
    ];

    const result = await decryptRecords(records, "memory-only-key");

    expect(result.records).toHaveLength(1);
    expect(result.records[0].id).toBe("record-1");
    expect(result.errors).toEqual([
      {
        recordId: "record-2",
        message: "Unable to decrypt record"
      }
    ]);
  });

  it("generates stable cache keys by id and revision", () => {
    expect(createDecryptedCacheKey("record-9", 7)).toBe("record-9:7");
  });
});
