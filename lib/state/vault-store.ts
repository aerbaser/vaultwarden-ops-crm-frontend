import { create } from "zustand";
import {
  createFolder,
  createProject,
  createRecord,
  fetchVaultSummary,
  syncFolderRecords
} from "@/lib/api/endpoints/vault";
import { Folder, Project, VaultRecord } from "@/lib/api/types";
import {
  createDecryptedCacheKey,
  decryptRecords,
  DecryptedVaultRecord
} from "@/lib/vault/decrypt";

export type MinimalRecordDraft = {
  folderId: string;
  kind: "login" | "card";
  title: string;
  username: string;
  secret: string;
};

type VaultState = {
  loading: boolean;
  error: string | null;
  activeRequestId: string | null;
  projects: Project[];
  folders: Folder[];
  records: VaultRecord[];
  decryptedCache: Record<string, DecryptedVaultRecord>;
  decryptErrors: Record<string, string>;
  selectedProjectId: string | null;
  selectedFolderId: string | null;
  selectedRecordId: string | null;
  hydrateSummary: () => Promise<void>;
  createProjectAction: (name: string, csrfToken?: string) => Promise<void>;
  createFolderAction: (projectId: string, name: string, csrfToken?: string) => Promise<void>;
  selectProject: (projectId: string) => void;
  selectFolder: (folderId: string) => void;
  selectRecord: (recordId: string) => void;
  syncFolder: (folderId: string, memoryOnlyKey: string) => Promise<void>;
  createMinimalRecord: (draft: MinimalRecordDraft, csrfToken?: string) => Promise<VaultRecord>;
  buildSharePayload: (recordId: string) => { recordId: string; ttlSeconds: number; maxViews: number };
  resetForTest: () => void;
};

const initialState: Pick<
  VaultState,
  | "loading"
  | "error"
  | "activeRequestId"
  | "projects"
  | "folders"
  | "records"
  | "decryptedCache"
  | "decryptErrors"
  | "selectedProjectId"
  | "selectedFolderId"
  | "selectedRecordId"
> = {
  loading: false,
  error: null,
  activeRequestId: null,
  projects: [],
  folders: [],
  records: [],
  decryptedCache: {},
  decryptErrors: {},
  selectedProjectId: null,
  selectedFolderId: null,
  selectedRecordId: null
};

const toEncryptedPayload = (draft: MinimalRecordDraft): string => {
  return btoa(
    JSON.stringify({
      username: draft.username,
      secret: draft.secret
    })
  );
};

const makeRequestId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

export const useVaultStore = create<VaultState>((set, get) => ({
  ...initialState,

  hydrateSummary: async () => {
    set({ loading: true, error: null });
    try {
      const summary = await fetchVaultSummary();
      set({
        projects: summary.projects,
        folders: summary.folders,
        loading: false
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load vault summary"
      });
    }
  },

  createProjectAction: async (name, csrfToken) => {
    const project = await createProject({ name }, csrfToken);
    set((state) => ({
      projects: [...state.projects, project],
      selectedProjectId: project.id
    }));
  },

  createFolderAction: async (projectId, name, csrfToken) => {
    const folder = await createFolder({ projectId, name }, csrfToken);
    set((state) => ({
      folders: [...state.folders, folder],
      selectedFolderId: folder.id
    }));
  },

  selectProject: (projectId) => {
    set({ selectedProjectId: projectId });
  },

  selectFolder: (folderId) => {
    set({ selectedFolderId: folderId });
  },

  selectRecord: (recordId) => {
    set({ selectedRecordId: recordId });
  },

  syncFolder: async (folderId, memoryOnlyKey) => {
    const requestId = makeRequestId();
    set({ loading: true, error: null, activeRequestId: requestId });

    try {
      const response = await syncFolderRecords(folderId, requestId);

      // Ignore stale responses when the user changes folders quickly.
      if (get().activeRequestId !== requestId) {
        return;
      }

      const result = await decryptRecords(response.records, memoryOnlyKey);
      const decryptedCache: Record<string, DecryptedVaultRecord> = {};
      for (const record of result.records) {
        decryptedCache[createDecryptedCacheKey(record.id, record.revision)] = record;
      }

      const decryptErrors = result.errors.reduce<Record<string, string>>((acc, issue) => {
        acc[issue.recordId] = issue.message;
        return acc;
      }, {});

      set((state) => ({
        records: response.records,
        decryptedCache: {
          ...state.decryptedCache,
          ...decryptedCache
        },
        decryptErrors,
        loading: false,
        activeRequestId: null
      }));
    } catch (error) {
      set({
        loading: false,
        activeRequestId: null,
        error: error instanceof Error ? error.message : "Failed to sync folder"
      });
    }
  },

  createMinimalRecord: async (draft, csrfToken) => {
    const created = await createRecord(
      {
        folderId: draft.folderId,
        kind: draft.kind,
        title: draft.title,
        encryptedPayload: toEncryptedPayload(draft)
      },
      csrfToken
    );

    const decrypted = await decryptRecords([created], "local");

    set((state) => ({
      records: [...state.records, created],
      selectedRecordId: created.id,
      decryptedCache:
        decrypted.records.length > 0
          ? {
              ...state.decryptedCache,
              [createDecryptedCacheKey(created.id, created.revision)]: decrypted.records[0]
            }
          : state.decryptedCache,
      decryptErrors:
        decrypted.errors.length > 0
          ? {
              ...state.decryptErrors,
              [created.id]: decrypted.errors[0].message
            }
          : state.decryptErrors
    }));

    return created;
  },

  buildSharePayload: (recordId) => {
    return {
      recordId,
      ttlSeconds: 3600,
      maxViews: 5
    };
  },

  resetForTest: () => {
    set({
      ...initialState
    });
  }
}));
