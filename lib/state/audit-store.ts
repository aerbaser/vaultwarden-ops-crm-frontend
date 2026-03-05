import { create } from "zustand";
import { AuditFilter, fetchAuditEvents } from "@/lib/api/endpoints/audit";
import { AuditEvent } from "@/lib/api/types";

type AuditState = {
  items: AuditEvent[];
  filters: Omit<AuditFilter, "cursor">;
  nextCursor: string | null;
  loading: boolean;
  error: string | null;
  setFilters: (filters: Omit<AuditFilter, "cursor">) => void;
  load: () => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  resetForTest: () => void;
};

const initialState: Pick<
  AuditState,
  "items" | "filters" | "nextCursor" | "loading" | "error"
> = {
  items: [],
  filters: {},
  nextCursor: null,
  loading: false,
  error: null
};

const sortNewestFirst = (items: AuditEvent[]): AuditEvent[] => {
  return [...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
};

const mergeUnique = (first: AuditEvent[], second: AuditEvent[]): AuditEvent[] => {
  const map = new Map<string, AuditEvent>();
  for (const event of [...first, ...second]) {
    map.set(event.id, event);
  }
  return sortNewestFirst(Array.from(map.values()));
};

export const useAuditStore = create<AuditState>((set, get) => ({
  ...initialState,

  setFilters: (filters) => {
    set({ filters });
  },

  load: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetchAuditEvents(get().filters);
      set({
        items: sortNewestFirst(response.items),
        nextCursor: response.nextCursor,
        loading: false
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load audit events"
      });
    }
  },

  loadMore: async () => {
    const { nextCursor, filters, items } = get();
    if (!nextCursor) {
      return;
    }

    set({ loading: true, error: null });

    try {
      const response = await fetchAuditEvents({
        ...filters,
        cursor: nextCursor
      });

      set({
        items: mergeUnique(items, response.items),
        nextCursor: response.nextCursor,
        loading: false
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load additional audit events"
      });
    }
  },

  refresh: async () => {
    await get().load();
  },

  resetForTest: () => {
    set({ ...initialState });
  }
}));
