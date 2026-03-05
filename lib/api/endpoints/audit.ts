import { apiRequest } from "@/lib/api/client";
import { AuditEvent, CursorPage } from "@/lib/api/types";

export type AuditFilter = {
  actor?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  cursor?: string;
};

const toQuery = (filter: AuditFilter): string => {
  const params = new URLSearchParams();

  if (filter.actor) params.set("actor", filter.actor);
  if (filter.type) params.set("type", filter.type);
  if (filter.dateFrom) params.set("dateFrom", filter.dateFrom);
  if (filter.dateTo) params.set("dateTo", filter.dateTo);
  if (filter.cursor) params.set("cursor", filter.cursor);

  const query = params.toString();
  return query ? `?${query}` : "";
};

export const fetchAuditEvents = (filter: AuditFilter = {}) =>
  apiRequest<CursorPage<AuditEvent>>(`/api/audit/events${toQuery(filter)}`, {
    method: "GET"
  });
