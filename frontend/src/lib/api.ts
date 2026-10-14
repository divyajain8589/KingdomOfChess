/** Mirrors the backend envelope: { success, data } | { success: false, error }. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly details?: string[],
  ) {
    super(message);
  }
}

type Envelope<T> =
  | { success: true; data: T }
  | { success: false; error: { statusCode: number; code: string; message: string; details?: string[] } };

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    // Same origin: next.config.ts proxies /api/v1 to the API, so the httpOnly cookie is first-party.
    res = await fetch(`/api/v1${path}`, {
      method: init.method ?? "GET",
      headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", "NETWORK_ERROR", 0);
  }

  let json: Envelope<T> | null = null;
  try {
    json = (await res.json()) as Envelope<T>;
  } catch {
    // Non-JSON (e.g. a proxy error page).
  }
  if (!json) throw new ApiError(`Unexpected response from server (${res.status})`, "BAD_RESPONSE", res.status);
  if (!json.success) {
    const { message, code, statusCode, details } = json.error;
    throw new ApiError(details?.length ? details.join(". ") : message, code, statusCode, details);
  }
  return json.data;
}

export const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : "Something went wrong";
