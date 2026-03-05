import { create } from 'zustand';

interface AuthState {
  email: string;
  userId: string;
  csrfToken: string;
  vaultToken: string;
  locked: boolean;
  setAuth: (a: Partial<AuthState>) => void;
  lock: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  email: '', userId: '', csrfToken: '', vaultToken: '', locked: false,
  setAuth: (a) => set(a),
  lock: () => {
    sessionStorage.clear();
    set({ email: '', userId: '', csrfToken: '', vaultToken: '', locked: true });
  },
}));

interface VaultState {
  projects: unknown[];
  folders: unknown[];
  ciphers: unknown[];
  symKey: Uint8Array | null;
  selectedProject: string | null;
  selectedFolder: string | null;
  setProjects: (p: unknown[]) => void;
  setFolders: (f: unknown[]) => void;
  setCiphers: (c: unknown[]) => void;
  setSymKey: (k: Uint8Array) => void;
  select: (p: string | null, f: string | null) => void;
}

export const useVault = create<VaultState>((set) => ({
  projects: [], folders: [], ciphers: [], symKey: null,
  selectedProject: null, selectedFolder: null,
  setProjects: (p) => set({ projects: p }),
  setFolders: (f) => set({ folders: f }),
  setCiphers: (c) => set({ ciphers: c }),
  setSymKey: (k) => set({ symKey: k }),
  select: (p, f) => set({ selectedProject: p, selectedFolder: f }),
}));
