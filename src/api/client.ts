import { TEXT } from "@/config/text";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly valid: Record<string, string> = {},
  ) {
    super(message);
  }
  get hasFieldErrors() {
    return Object.values(this.valid).some(Boolean);
  }
}
interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  timeoutMs?: number;
}
let refreshRequest: Promise<void> | null = null;
let refreshAllowed = true;
export function allowSessionRefresh(allowed: boolean) {
  refreshAllowed = allowed;
}
export const isUnauthorized = (error: unknown) =>
  error instanceof ApiError && error.status === 401;

async function send(
  path: string,
  options: RequestOptions = {},
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 20000,
  );
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (options.body instanceof FormData) body = options.body;
  else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  try {
    return await fetch(path, {
      method: options.method ?? "GET",
      headers,
      body,
      credentials: "include",
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(
      0,
      "network_error",
      controller.signal.aborted
        ? "Batas waktu permintaan tercapai. Silakan coba lagi."
        : TEXT.networkError,
    );
  } finally {
    clearTimeout(timer);
  }
}
async function failure(response: Response): Promise<ApiError> {
  const payload = await response.json().catch(() => null);
  return new ApiError(
    response.status,
    String(payload?.code ?? "request_error"),
    payload?.message ?? "Permintaan gagal. Silakan coba lagi.",
    payload?.valid ?? {},
  );
}
async function refreshSession() {
  const response = await send("/api/v1/admin/auth/refresh", { method: "POST" });
  if (!response.ok) throw await failure(response);
}
async function authenticated(
  path: string,
  options: RequestOptions = {},
): Promise<Response> {
  let response = await send(path, options);
  const authAction = /\/auth\/(login|refresh|logout)$/.test(path);
  if (response.status === 401 && !authAction && refreshAllowed) {
    try {
      if (!refreshRequest)
        refreshRequest = refreshSession().finally(() => {
          refreshRequest = null;
        });
      await refreshRequest;
      if (!refreshAllowed)
        throw new ApiError(401, "session_ended", "Sesi sudah berakhir.");
      response = await send(path, options);
    } catch (error) {
      if (isUnauthorized(error))
        window.dispatchEvent(new Event("auth:expired"));
      throw error;
    }
  }
  if (!response.ok) {
    if (response.status === 401 && !authAction)
      window.dispatchEvent(new Event("auth:expired"));
    throw await failure(response);
  }
  return response;
}
export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await authenticated(path, options);
  const payload = await response.json();
  if (payload.error)
    throw new ApiError(
      response.status,
      String(payload.code),
      payload.message,
      payload.valid,
    );
  return payload.data as T;
}
export async function requestBlob(
  path: string,
  timeoutMs?: number,
): Promise<Blob> {
  return (await authenticated(path, { timeoutMs })).blob();
}
export async function download(path: string, filename: string) {
  const blob = await requestBlob(path);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
