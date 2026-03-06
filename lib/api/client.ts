import { ApiError, ApiRequestOptions, HttpMethod } from "@/lib/api/types";

// Always use relative paths so that requests go through the Next.js proxy
// (rewrites in next.config.mjs forward /api/* → http://localhost:3001/api/*)
// This works both locally and when accessed via Tailscale / reverse-proxy.
const DEFAULT_API_BASE_URL = "";

let authFailureHandler: ((error: ApiError) => void) | undefined;

export const isMutatingMethod = (method: HttpMethod): boolean =>
  method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";

export const registerAuthFailureHandler = (handler: (error: ApiError) => void): void => {
  authFailureHandler = handler;
};

const getApiBaseUrl = (): string => {
  return DEFAULT_API_BASE_URL;
};

const normalizeApiError = (status: number, payload: unknown): ApiError => {
  const fallbackMessage = status >= 500 ? "Server error" : "Request failed";

  if (payload && typeof payload === "object") {
    const data = payload as Record<string, unknown>;
    return {
      status,
      code: typeof data.code === "string" ? data.code : `http_${status}`,
      message: typeof data.message === "string" ? data.message : fallbackMessage,
      recoverable: typeof data.recoverable === "boolean" ? data.recoverable : status < 500,
      actionHint: typeof data.actionHint === "string" ? data.actionHint : undefined
    };
  }

  return {
    status,
    code: `http_${status}`,
    message: fallbackMessage,
    recoverable: status < 500
  };
};

const parseResponseBody = async (response: Response): Promise<unknown> => {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text.length ? text : null;
};

export async function apiRequest<TResponse, TBody = unknown>(
  path: string,
  options: ApiRequestOptions<TBody> = {}
): Promise<TResponse> {
  const method = options.method ?? "GET";
  const headers = new Headers(options.headers ?? {});

  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }

  const hasBody = options.body !== undefined;
  if (hasBody && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  if (isMutatingMethod(method) && options.csrfToken) {
    headers.set("x-csrf-token", options.csrfToken);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    headers,
    credentials: "include",
    signal: options.signal,
    body: hasBody ? JSON.stringify(options.body) : undefined
  });

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    const error = normalizeApiError(response.status, payload);

    if ((error.status === 401 || error.status === 403) && authFailureHandler) {
      authFailureHandler(error);
    }

    throw error;
  }

  return payload as TResponse;
}
