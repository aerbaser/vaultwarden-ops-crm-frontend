import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vaultApi from "@/lib/api/endpoints/vault";
import { useVaultStore } from "@/lib/state/vault-store";

describe("vault workspace domain", () => {
  beforeEach(() => {
    useVaultStore.getState().resetForTest();
    vi.restoreAllMocks();
  });

  it("supports project and folder creation workflow", async () => {
    vi.spyOn(vaultApi, "createProject").mockResolvedValue({
      id: "project-1",
      name: "Alpha",
      createdAt: "2026-03-05T00:00:00.000Z"
    });
    vi.spyOn(vaultApi, "createFolder").mockResolvedValue({
      id: "folder-1",
      projectId: "project-1",
      name: "Credentials",
      createdAt: "2026-03-05T00:00:00.000Z"
    });

    await useVaultStore.getState().createProjectAction("Alpha", "csrf");
    await useVaultStore.getState().createFolderAction("project-1", "Credentials", "csrf");

    expect(useVaultStore.getState().projects).toHaveLength(1);
    expect(useVaultStore.getState().folders).toHaveLength(1);
  });

  it("runs sync and decrypt with per-record error isolation", async () => {
    vi.spyOn(vaultApi, "syncFolderRecords").mockResolvedValue({
      requestId: "request-1",
      records: [
        {
          id: "record-1",
          folderId: "folder-1",
          revision: 2,
          title: "CRM Login",
          kind: "login",
          encryptedPayload: btoa(JSON.stringify({ username: "alice", secret: "pw" })),
          createdAt: "2026-03-05T00:00:00.000Z",
          updatedAt: "2026-03-05T00:00:00.000Z"
        },
        {
          id: "record-2",
          folderId: "folder-1",
          revision: 1,
          title: "Bad",
          kind: "card",
          encryptedPayload: "bad-value",
          createdAt: "2026-03-05T00:00:00.000Z",
          updatedAt: "2026-03-05T00:00:00.000Z"
        }
      ]
    });

    await useVaultStore.getState().syncFolder("folder-1", "memory-only-key");

    expect(Object.keys(useVaultStore.getState().decryptedCache)).toContain("record-1:2");
    expect(useVaultStore.getState().decryptErrors["record-2"]).toBe("Unable to decrypt record");
  });

  it("creates minimal records and returns deterministic share payload", async () => {
    vi.spyOn(vaultApi, "createRecord").mockResolvedValue({
      id: "record-9",
      folderId: "folder-1",
      revision: 1,
      title: "CRM Login",
      kind: "login",
      encryptedPayload: btoa(JSON.stringify({ username: "alice", secret: "pw" })),
      createdAt: "2026-03-05T00:00:00.000Z",
      updatedAt: "2026-03-05T00:00:00.000Z"
    });

    await useVaultStore.getState().createMinimalRecord(
      {
        folderId: "folder-1",
        kind: "login",
        title: "CRM Login",
        username: "alice",
        secret: "pw"
      },
      "csrf"
    );

    const payload = useVaultStore.getState().buildSharePayload("record-9");

    expect(payload).toEqual({
      recordId: "record-9",
      ttlSeconds: 3600,
      maxViews: 5
    });
  });
});
