import { apiRequest } from "@/lib/api/client";
import { ShareMetadata } from "@/lib/api/types";

export type CreateSharePayload = {
  recordId: string;
  ttlSeconds: number;
  maxViews: number;
};

export type CreateShareResponse = {
  token: string;
  url: string;
};

export const createShareToken = (payload: CreateSharePayload, csrfToken?: string) =>
  apiRequest<CreateShareResponse, CreateSharePayload>("/api/share", {
    method: "POST",
    body: payload,
    csrfToken
  });

export const fetchShareToken = (token: string) =>
  apiRequest<ShareMetadata>(`/api/share/${token}`, {
    method: "GET"
  });
