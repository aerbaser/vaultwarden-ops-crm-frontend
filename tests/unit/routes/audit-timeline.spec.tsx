import { beforeEach, describe, expect, it, vi } from "vitest";
import * as auditApi from "@/lib/api/endpoints/audit";
import { useAuditStore } from "@/lib/state/audit-store";

describe("audit timeline domain", () => {
  beforeEach(() => {
    useAuditStore.getState().resetForTest();
    vi.restoreAllMocks();
  });

  it("applies actor/type/date filters", async () => {
    const fetchSpy = vi.spyOn(auditApi, "fetchAuditEvents").mockResolvedValue({
      items: [],
      nextCursor: null
    });

    useAuditStore
      .getState()
      .setFilters({ actor: "alice", type: "share.created", dateFrom: "2026-03-01", dateTo: "2026-03-05" });

    await useAuditStore.getState().load();

    expect(fetchSpy).toHaveBeenCalledWith({
      actor: "alice",
      type: "share.created",
      dateFrom: "2026-03-01",
      dateTo: "2026-03-05"
    });
  });

  it("appends cursor pages", async () => {
    const fetchSpy = vi.spyOn(auditApi, "fetchAuditEvents");
    fetchSpy.mockResolvedValueOnce({
      items: [
        {
          id: "event-1",
          actor: "alice",
          type: "share.created",
          createdAt: "2026-03-05T10:00:00.000Z",
          summary: "Created share"
        }
      ],
      nextCursor: "cursor-2"
    });
    fetchSpy.mockResolvedValueOnce({
      items: [
        {
          id: "event-2",
          actor: "bob",
          type: "vault.updated",
          createdAt: "2026-03-05T09:00:00.000Z",
          summary: "Updated vault"
        }
      ],
      nextCursor: null
    });

    await useAuditStore.getState().load();
    await useAuditStore.getState().loadMore();

    expect(useAuditStore.getState().items.map((item) => item.id)).toEqual(["event-1", "event-2"]);
  });

  it("keeps newest-first ordering", async () => {
    vi.spyOn(auditApi, "fetchAuditEvents").mockResolvedValue({
      items: [
        {
          id: "event-1",
          actor: "alice",
          type: "share.created",
          createdAt: "2026-03-05T08:00:00.000Z",
          summary: "Older"
        },
        {
          id: "event-2",
          actor: "alice",
          type: "share.created",
          createdAt: "2026-03-05T10:00:00.000Z",
          summary: "Newer"
        }
      ],
      nextCursor: null
    });

    await useAuditStore.getState().load();

    expect(useAuditStore.getState().items.map((item) => item.id)).toEqual(["event-2", "event-1"]);
  });
});
