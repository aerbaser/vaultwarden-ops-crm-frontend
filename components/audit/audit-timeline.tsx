"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuditStore } from "@/lib/state/audit-store";

export function AuditTimeline() {
  const items = useAuditStore((state) => state.items);
  const filters = useAuditStore((state) => state.filters);
  const loading = useAuditStore((state) => state.loading);
  const error = useAuditStore((state) => state.error);
  const nextCursor = useAuditStore((state) => state.nextCursor);

  const setFilters = useAuditStore((state) => state.setFilters);
  const load = useAuditStore((state) => state.load);
  const loadMore = useAuditStore((state) => state.loadMore);
  const refresh = useAuditStore((state) => state.refresh);

  const [actor, setActor] = useState(filters.actor ?? "");
  const [type, setType] = useState(filters.type ?? "");
  const [dateFrom, setDateFrom] = useState(filters.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(filters.dateTo ?? "");

  useEffect(() => {
    void load();
  }, [load]);

  const applyFilters = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters({
      actor: actor || undefined,
      type: type || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined
    });
    await load();
  };

  return (
    <section data-testid="audit-timeline">
      <form className="route-card" onSubmit={applyFilters} style={{ marginBottom: "0.75rem" }}>
        <h2>Filters</h2>
        <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <input
            aria-label="Actor filter"
            placeholder="Actor"
            value={actor}
            onChange={(event) => setActor(event.target.value)}
            data-testid="audit-filter-actor"
          />
          <input
            aria-label="Type filter"
            placeholder="Event type"
            value={type}
            onChange={(event) => setType(event.target.value)}
            data-testid="audit-filter-type"
          />
          <input
            aria-label="Date from filter"
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            data-testid="audit-filter-date-from"
          />
          <input
            aria-label="Date to filter"
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            data-testid="audit-filter-date-to"
          />
        </div>
        <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
          <button type="submit" data-testid="audit-apply-filters">
            Apply filters
          </button>
          <button
            type="button"
            onClick={() => {
              void refresh();
            }}
            data-testid="audit-refresh"
          >
            Refresh
          </button>
        </div>
      </form>

      <section className="route-card">
        <h2>Event Timeline</h2>
        {loading ? <p data-testid="audit-loading">Loading events...</p> : null}
        {error ? (
          <p role="alert" style={{ color: "var(--danger)" }} data-testid="audit-error">
            {error}
          </p>
        ) : null}
        {!loading && !error && items.length === 0 ? <p>No events found.</p> : null}

        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {items.map((event) => (
            <li key={event.id} style={{ borderTop: "1px solid var(--border-soft)", padding: "0.75rem 0" }}>
              <p style={{ margin: 0, fontWeight: 600 }}>
                {event.type} · {event.actor}
              </p>
              <p style={{ margin: "0.25rem 0" }}>{event.summary}</p>
              <p style={{ margin: 0, color: "var(--text-muted)" }}>{event.createdAt}</p>
              <details>
                <summary>Affected metadata</summary>
                <pre style={{ whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(event.metadata ?? {}, null, 2)}
                </pre>
              </details>
            </li>
          ))}
        </ul>

        {nextCursor ? (
          <button
            type="button"
            onClick={() => {
              void loadMore();
            }}
            data-testid="audit-load-more"
          >
            Load more
          </button>
        ) : null}
      </section>
    </section>
  );
}
