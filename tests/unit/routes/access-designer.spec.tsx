import { beforeEach, describe, expect, it, vi } from "vitest";
import * as accessApi from "@/lib/api/endpoints/access";
import { useAccessStore } from "@/lib/state/access-store";

describe("access designer domain", () => {
  beforeEach(() => {
    useAccessStore.getState().resetForTest();
    vi.restoreAllMocks();
  });

  it("applies permission profiles and computes diff preview", async () => {
    vi.spyOn(accessApi, "fetchAccessSnapshot").mockResolvedValue({
      projectId: "project-1",
      folderId: "folder-1",
      rows: [
        {
          subjectId: "member-1",
          subjectName: "Alice",
          current: "manage",
          proposed: "manage"
        },
        {
          subjectId: "member-2",
          subjectName: "Bob",
          current: "write",
          proposed: "write"
        }
      ]
    });

    await useAccessStore.getState().load("project-1", "folder-1");
    useAccessStore.getState().applyProfile("viewer");

    const preview = useAccessStore.getState().getDiffPreview();

    expect(preview.currentManage).toBe(1);
    expect(preview.proposedManage).toBe(0);
    expect(useAccessStore.getState().stagedRows.every((row) => row.proposed === "read")).toBe(true);
  });

  it("requires destructive confirmation before apply", async () => {
    vi.spyOn(accessApi, "fetchAccessSnapshot").mockResolvedValue({
      projectId: "project-1",
      folderId: "folder-1",
      rows: [
        {
          subjectId: "member-1",
          subjectName: "Alice",
          current: "manage",
          proposed: "manage"
        }
      ]
    });

    await useAccessStore.getState().load("project-1", "folder-1");
    useAccessStore.getState().updateRow("member-1", "read");

    const result = await useAccessStore
      .getState()
      .apply("project-1", "folder-1", "csrf-token");

    expect(result).toBe(false);
    expect(useAccessStore.getState().error).toContain("Confirm destructive");
  });

  it("maps partial apply warnings to row-level messages", async () => {
    vi.spyOn(accessApi, "fetchAccessSnapshot").mockResolvedValue({
      projectId: "project-1",
      folderId: "folder-1",
      rows: [
        {
          subjectId: "member-1",
          subjectName: "Alice",
          current: "write",
          proposed: "write"
        }
      ]
    });

    vi.spyOn(accessApi, "applyAccessDraft").mockResolvedValue({
      ok: true,
      warnings: [{ subjectId: "member-1", message: "Pending invite not accepted" }]
    });

    await useAccessStore.getState().load("project-1", "folder-1");
    useAccessStore.getState().setDestructiveConfirmed(true);
    useAccessStore.getState().updateRow("member-1", "manage");

    const applied = await useAccessStore
      .getState()
      .apply("project-1", "folder-1", "csrf-token");

    expect(applied).toBe(true);
    expect(useAccessStore.getState().rowWarnings["member-1"]).toBe("Pending invite not accepted");
  });
});
