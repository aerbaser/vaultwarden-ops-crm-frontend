export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiError = {
  status: number;
  code: string;
  message: string;
  recoverable: boolean;
  actionHint?: string;
};

export type ApiRequestOptions<TBody = unknown> = {
  method?: HttpMethod;
  body?: TBody;
  headers?: Record<string, string>;
  csrfToken?: string;
  signal?: AbortSignal;
};

export type SessionUser = {
  id: string;
  email: string;
  displayName?: string;
};

export type Project = {
  id: string;
  name: string;
  createdAt: string;
};

export type Folder = {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
};

export type VaultRecord = {
  id: string;
  folderId: string;
  revision: number;
  title: string;
  kind: "login" | "card";
  encryptedPayload: string;
  createdAt: string;
  updatedAt: string;
};

export type VaultSyncResponse = {
  requestId: string;
  records: VaultRecord[];
};

export type ShareStatus =
  | "loading"
  | "active"
  | "expired"
  | "revoked"
  | "exhausted"
  | "unavailable";

export type ShareMetadata = {
  token: string;
  status: ShareStatus;
  title?: string;
  content?: string;
  ttlSeconds?: number;
  remainingViews?: number;
};

export type OperationItem = {
  id: string;
  title: string;
  status: "open" | "due_soon" | "overdue" | "paid";
  dueAt: string;
  amountCents: number;
  contactName?: string;
  contactEmail?: string;
};

export type AuditEvent = {
  id: string;
  actor: string;
  type: string;
  createdAt: string;
  summary: string;
  metadata?: Record<string, string>;
};

export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
};
