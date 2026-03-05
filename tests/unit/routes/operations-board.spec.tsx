import { beforeEach, describe, expect, it, vi } from "vitest";
import * as operationsApi from "@/lib/api/endpoints/operations";
import { useOperationsStore } from "@/lib/state/operations-store";

describe("operations board domain", () => {
  beforeEach(() => {
    useOperationsStore.getState().resetForTest();
    vi.restoreAllMocks();
  });

  it("groups obligations by status windows", async () => {
    vi.spyOn(operationsApi, "fetchOperations").mockResolvedValue({
      items: [
        {
          id: "op-1",
          title: "Invoice A",
          status: "open",
          dueAt: "2026-03-10T00:00:00.000Z",
          amountCents: 10000,
          contactName: "Alice",
          contactEmail: "alice@example.com"
        },
        {
          id: "op-2",
          title: "Invoice B",
          status: "overdue",
          dueAt: "2026-03-01T00:00:00.000Z",
          amountCents: 15000,
          contactName: "Bob",
          contactEmail: "bob@example.com"
        }
      ]
    });

    await useOperationsStore.getState().load();

    const grouped = useOperationsStore.getState().groupByStatus();

    expect(grouped.open).toHaveLength(1);
    expect(grouped.overdue).toHaveLength(1);
  });

  it("keeps filter behavior consistent", async () => {
    vi.spyOn(operationsApi, "fetchOperations").mockResolvedValue({
      items: [
        {
          id: "op-1",
          title: "Invoice A",
          status: "open",
          dueAt: "2026-03-10T00:00:00.000Z",
          amountCents: 10000
        },
        {
          id: "op-2",
          title: "Invoice B",
          status: "paid",
          dueAt: "2026-03-11T00:00:00.000Z",
          amountCents: 15000
        }
      ]
    });

    await useOperationsStore.getState().load();
    useOperationsStore.getState().setFilter("paid");

    expect(useOperationsStore.getState().filteredItems()).toHaveLength(1);
    expect(useOperationsStore.getState().filteredItems()[0].id).toBe("op-2");
  });

  it("maps selected row to detail panel context", async () => {
    vi.spyOn(operationsApi, "fetchOperations").mockResolvedValue({
      items: [
        {
          id: "op-3",
          title: "Lease",
          status: "due_soon",
          dueAt: "2026-03-08T00:00:00.000Z",
          amountCents: 25000,
          contactName: "Casey",
          contactEmail: "casey@example.com"
        }
      ]
    });

    await useOperationsStore.getState().load();
    useOperationsStore.getState().select("op-3");

    const detail = useOperationsStore.getState().selectedDetail();

    expect(detail?.title).toBe("Lease");
    expect(detail?.amountCents).toBe(25000);
    expect(detail?.contactEmail).toBe("casey@example.com");
  });
});
