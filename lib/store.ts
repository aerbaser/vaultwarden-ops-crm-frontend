import { create } from 'zustand';

interface AuthState {
  email: string; userId: string; csrfToken: string; vaultToken: string; locked: boolean;
  setAuth: (a: Partial<AuthState>) => void; lock: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  email: '', userId: '', csrfToken: '', vaultToken: '', locked: false,
  setAuth: (a) => set(a),
  lock: () => { sessionStorage.clear(); set({ email:'', userId:'', csrfToken:'', vaultToken:'', locked:true }); },
}));

interface VaultState {
  projects: any[]; folders: any[]; ciphers: any[];
  selectedProject: string | null; selectedFolder: string | null;
  setProjects: (p: any[]) => void; setFolders: (f: any[]) => void;
  setCiphers: (c: any[]) => void; select: (p: string|null, f: string|null) => void;
}

export const useVault = create<VaultState>((set) => ({
  projects: [], folders: [], ciphers: [], selectedProject: null, selectedFolder: null,
  setProjects: (p) => set({ projects: p }),
  setFolders: (f) => set({ folders: f }),
  setCiphers: (c) => set({ ciphers: c }),
  select: (p, f) => set({ selectedProject: p, selectedFolder: f }),
}));
