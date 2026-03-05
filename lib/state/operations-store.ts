import { create } from "zustand";
import { fetchOperations } from "@/lib/api/endpoints/operations";
import { OperationItem } from "@/lib/api/types";

export type OperationFilter = "all" | OperationItem["status"];

type OperationsState = {
  items: OperationItem[];
  filter: OperationFilter;
  selectedId: string | null;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  setFilter: (filter: OperationFilter) => void;
  select: (id: string) => void;
  filteredItems: () => OperationItem[];
  groupByStatus: () => Record<OperationItem["status"], OperationItem[]>;
  selectedDetail: () => OperationItem | null;
  resetForTest: () => void;
};

const initialState: Pick<
  OperationsState,
  "items" | "filter" | "selectedId" | "loading" | "error"
> = {
  items: [],
  filter: "all",
  selectedId: null,
  loading: false,
  error: null
};

const statuses: OperationItem["status"][] = ["open", "due_soon", "overdue", "paid"];

export const useOperationsStore = create<OperationsState>((set, get) => ({
  ...initialState,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetchOperations();
      set({ items: response.items, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load operations"
      });
    }
  },

  setFilter: (filter) => {
    set({ filter });
  },

  select: (id) => {
    set({ selectedId: id });
  },

  filteredItems: () => {
    const { items, filter } = get();
    if (filter === "all") {
      return items;
    }
    return items.filter((item) => item.status === filter);
  },

  groupByStatus: () => {
    const grouped: Record<OperationItem["status"], OperationItem[]> = {
      open: [],
      due_soon: [],
      overdue: [],
      paid: []
    };

    for (const item of get().filteredItems()) {
      grouped[item.status].push(item);
    }

    for (const status of statuses) {
      grouped[status] = grouped[status].sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    }

    return grouped;
  },

  selectedDetail: () => {
    const { items, selectedId } = get();
    if (!selectedId) {
      return null;
    }
    return items.find((item) => item.id === selectedId) ?? null;
  },

  resetForTest: () => {
    set({ ...initialState });
  }
}));
