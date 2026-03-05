import { create } from "zustand";

export type ToastLevel = "info" | "success" | "warning" | "error";

export type ToastMessage = {
  id: string;
  level: ToastLevel;
  text: string;
};

type UiState = {
  toasts: ToastMessage[];
  pushToast: (level: ToastLevel, text: string) => void;
  dismissToast: (id: string) => void;
  resetForTest: () => void;
};

const initialState: Pick<UiState, "toasts"> = {
  toasts: []
};

export const useUiStore = create<UiState>((set) => ({
  ...initialState,
  pushToast: (level, text) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    set((state) => ({
      toasts: [...state.toasts, { id, level, text }]
    }));
  },
  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id)
    }));
  },
  resetForTest: () => {
    set(initialState);
  }
}));
