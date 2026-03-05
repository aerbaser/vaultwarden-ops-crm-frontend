import { create } from "zustand";
import { fetchShareToken } from "@/lib/api/endpoints/share";
import { ShareMetadata, ShareStatus } from "@/lib/api/types";

type ShareState = {
  metadata: ShareMetadata | null;
  status: ShareStatus;
  loading: boolean;
  error: string | null;
  load: (token: string) => Promise<void>;
  resetForTest: () => void;
};

const initialState: Pick<ShareState, "metadata" | "status" | "loading" | "error"> = {
  metadata: null,
  status: "loading",
  loading: false,
  error: null
};

export const useShareStore = create<ShareState>((set) => ({
  ...initialState,

  load: async (token) => {
    set({ loading: true, status: "loading", error: null });

    try {
      const metadata = await fetchShareToken(token);
      set({
        metadata,
        status: metadata.status,
        loading: false,
        error: null
      });
    } catch (error) {
      set({
        metadata: {
          token,
          status: "unavailable"
        },
        status: "unavailable",
        loading: false,
        error: error instanceof Error ? error.message : "Unable to load share"
      });
    }
  },

  resetForTest: () => {
    set({ ...initialState });
  }
}));
