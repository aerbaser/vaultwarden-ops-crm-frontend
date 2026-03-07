import { apiRequest } from "@/lib/api/client";
import { Folder, Project, VaultRecord, VaultSyncResponse } from "@/lib/api/types";

export type VaultSummary = {
  projects: Project[];
  folders: Folder[];
};

export type CreateProjectInput = {
  name: string;
};

export type CreateFolderInput = {
  projectId: string;
  name: string;
};

export type CreateRecordInput = {
  folderId: string;
  kind: "login" | "card";
  title: string;
  encryptedPayload: string;
};

export const fetchVaultSummary = async (): Promise<VaultSummary> => {
  const [projects, folders] = await Promise.all([
    apiRequest<Project[]>("/api/projects", { method: "GET" }),
    apiRequest<Folder[]>("/api/folders", { method: "GET" }),
  ]);
  return { projects, folders };
};

export const syncFolderRecords = (folderId: string, requestId: string, vaultToken?: string) =>
  apiRequest<VaultSyncResponse>(`/api/vault/folders/${folderId}/sync?requestId=${encodeURIComponent(requestId)}`, {
    method: "GET",
    headers: vaultToken ? { authorization: `Bearer ${vaultToken}` } : undefined,
  });

export const createProject = (payload: CreateProjectInput, csrfToken?: string) =>
  apiRequest<Project, CreateProjectInput>("/api/vault/projects", {
    method: "POST",
    body: payload,
    csrfToken
  });

export const createFolder = (payload: CreateFolderInput, csrfToken?: string) =>
  apiRequest<Folder, CreateFolderInput>("/api/vault/folders", {
    method: "POST",
    body: payload,
    csrfToken
  });

export const createRecord = (payload: CreateRecordInput, csrfToken?: string) =>
  apiRequest<VaultRecord, CreateRecordInput>("/api/vault/records", {
    method: "POST",
    body: payload,
    csrfToken
  });
