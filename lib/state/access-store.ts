import { create } from "zustand";
import {
  AccessPermission,
  AccessRow,
  applyAccessDraft,
  fetchAccessSnapshot
} from "@/lib/api/endpoints/access";

type AccessProfile = "viewer" | "editor" | "manager";

type AccessState = {
  currentRows: AccessRow[];
  stagedRows: AccessRow[];
  loading: boolean;
  error: string | null;
  selectedProfile: AccessProfile;
  destructiveConfirmed: boolean;
  rowWarnings: Record<string, string>;
  load: (projectId: string, folderId: string) => Promise<void>;
  applyProfile: (profile: AccessProfile) => void;
  updateRow: (subjectId: string, permission: AccessPermission) => void;
  setDestructiveConfirmed: (confirmed: boolean) => void;
  getDiffPreview: () => {
    currentManage: number;
    proposedManage: number;
    currentWrite: number;
    proposedWrite: number;
  };
  apply: (projectId: string, folderId: string, csrfToken?: string) => Promise<boolean>;
  resetForTest: () => void;
};

const permissionRank: Record<AccessPermission, number> = {
  read: 1,
  write: 2,
  manage: 3
};

const profilePermission: Record<AccessProfile, AccessPermission> = {
  viewer: "read",
  editor: "write",
  manager: "manage"
};

const initialState: Pick<
  AccessState,
  | "currentRows"
  | "stagedRows"
  | "loading"
  | "error"
  | "selectedProfile"
  | "destructiveConfirmed"
  | "rowWarnings"
> = {
  currentRows: [],
  stagedRows: [],
  loading: false,
  error: null,
  selectedProfile: "viewer",
  destructiveConfirmed: false,
  rowWarnings: {}
};

const hasDestructiveChanges = (rows: AccessRow[]): boolean => {
  return rows.some((row) => permissionRank[row.proposed] < permissionRank[row.current]);
};

export const useAccessStore = create<AccessState>((set, get) => ({
  ...initialState,

  load: async (projectId, folderId) => {
    set({ loading: true, error: null, rowWarnings: {} });
    try {
      const snapshot = await fetchAccessSnapshot(projectId, folderId);
      set({
        currentRows: snapshot.rows,
        stagedRows: snapshot.rows,
        loading: false,
        destructiveConfirmed: false
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load access snapshot"
      });
    }
  },

  applyProfile: (profile) => {
    const permission = profilePermission[profile];
    set((state) => ({
      selectedProfile: profile,
      stagedRows: state.stagedRows.map((row) => ({
        ...row,
        proposed: permission
      }))
    }));
  },

  updateRow: (subjectId, permission) => {
    set((state) => ({
      stagedRows: state.stagedRows.map((row) =>
        row.subjectId === subjectId
          ? {
              ...row,
              proposed: permission
            }
          : row
      )
    }));
  },

  setDestructiveConfirmed: (confirmed) => {
    set({ destructiveConfirmed: confirmed });
  },

  getDiffPreview: () => {
    const { currentRows, stagedRows } = get();

    const currentManage = currentRows.filter((row) => row.current === "manage").length;
    const proposedManage = stagedRows.filter((row) => row.proposed === "manage").length;
    const currentWrite = currentRows.filter((row) => row.current === "write").length;
    const proposedWrite = stagedRows.filter((row) => row.proposed === "write").length;

    return {
      currentManage,
      proposedManage,
      currentWrite,
      proposedWrite
    };
  },

  apply: async (projectId, folderId, csrfToken) => {
    const { stagedRows, destructiveConfirmed } = get();

    if (hasDestructiveChanges(stagedRows) && !destructiveConfirmed) {
      set({ error: "Confirm destructive permission changes before apply." });
      return false;
    }

    set({ loading: true, error: null, rowWarnings: {} });

    try {
      const response = await applyAccessDraft(projectId, folderId, stagedRows, csrfToken);
      const rowWarnings = response.warnings.reduce<Record<string, string>>((acc, warning) => {
        acc[warning.subjectId] = warning.message;
        return acc;
      }, {});

      set({
        loading: false,
        currentRows: stagedRows,
        rowWarnings
      });

      return true;
    } catch (error) {
      // Keep staged draft intact so users can retry without rebuilding intent.
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to apply permissions"
      });
      return false;
    }
  },

  resetForTest: () => {
    set({ ...initialState });
  }
}));
