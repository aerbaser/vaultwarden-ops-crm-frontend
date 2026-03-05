import { apiRequest } from "@/lib/api/client";

export type AccessPermission = "read" | "write" | "manage";

export type AccessRow = {
  subjectId: string;
  subjectName: string;
  current: AccessPermission;
  proposed: AccessPermission;
};

export type AccessSnapshot = {
  projectId: string;
  folderId: string;
  rows: AccessRow[];
};

export type ApplyAccessResponse = {
  ok: boolean;
  warnings: Array<{ subjectId: string; message: string }>;
};

export const fetchAccessSnapshot = (projectId: string, folderId: string) =>
  apiRequest<AccessSnapshot>(`/api/access/${projectId}/${folderId}`, {
    method: "GET"
  });

export const applyAccessDraft = (
  projectId: string,
  folderId: string,
  rows: AccessRow[],
  csrfToken?: string
) =>
  apiRequest<ApplyAccessResponse, { rows: AccessRow[] }>(`/api/access/${projectId}/${folderId}`, {
    method: "POST",
    body: { rows },
    csrfToken
  });
