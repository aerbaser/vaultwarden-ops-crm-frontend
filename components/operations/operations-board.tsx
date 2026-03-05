"use client";

import { useEffect } from "react";
import { useOperationsStore } from "@/lib/state/operations-store";

const sections: Array<{ key: "open" | "due_soon" | "overdue" | "paid"; label: string }> = [
  { key: "open", label: "Open" },
  { key: "due_soon", label: "Due Soon" },
  { key: "overdue", label: "Overdue" },
  { key: "paid", label: "Paid" }
];

export function OperationsBoard() {
  const load = useOperationsStore((state) => state.load);
  const loading = useOperationsStore((state) => state.loading);
  const error = useOperationsStore((state) => state.error);
  const filter = useOperationsStore((state) => state.filter);
  const setFilter = useOperationsStore((state) => state.setFilter);
  const groupByStatus = useOperationsStore((state) => state.groupByStatus);
  const select = useOperationsStore((state) => state.select);
  const selectedDetail = useOperationsStore((state) => state.selectedDetail());

  const grouped = groupByStatus();
  const totalRows = Object.values(grouped).reduce((count, list) => count + list.length, 0);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section data-testid="operations-board">
      <div className="route-card" style={{ marginBottom: "0.75rem" }}>
        <h2>Obligations</h2>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button type="button" disabled>
            Create obligation (Coming soon)
          </button>
          <button type="button" disabled>
            Edit obligation (Coming soon)
          </button>
          <label htmlFor="operations-filter">Filter</label>
          <select
            id="operations-filter"
            value={filter}
            onChange={(event) =>
              setFilter(
                event.target.value as "all" | "open" | "due_soon" | "overdue" | "paid"
              )
            }
            data-testid="operations-filter"
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="due_soon">Due Soon</option>
            <option value="overdue">Overdue</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        {loading ? <p data-testid="operations-loading">Loading obligations...</p> : null}
        {error ? (
          <p role="alert" style={{ color: "var(--danger)" }} data-testid="operations-error">
            {error}
          </p>
        ) : null}
        {!loading && !error && totalRows === 0 ? (
          <p data-testid="operations-empty">No obligations match current filters.</p>
        ) : null}
      </div>

      <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        {sections.map((section) => (
          <section key={section.key} className="route-card">
            <h3>{section.label}</h3>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {grouped[section.key].map((item) => (
                <li key={item.id} style={{ marginBottom: "0.45rem" }}>
                  <button
                    type="button"
                    onClick={() => select(item.id)}
                    data-testid={`operation-row-${item.id}`}
                  >
                    {item.title}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="route-card" data-testid="operations-detail-panel">
          <h3>Detail Panel</h3>
          {selectedDetail ? (
            <>
              <p>{selectedDetail.title}</p>
              <p>Amount: ${(selectedDetail.amountCents / 100).toFixed(2)}</p>
              <p>Contact: {selectedDetail.contactName ?? "-"}</p>
              <p>Email: {selectedDetail.contactEmail ?? "-"}</p>
            </>
          ) : (
            <p>Select a row to inspect payment/contact context.</p>
          )}
        </section>
      </div>
    </section>
  );
}
