export type ApiResult = { ok: true } | { ok: false; message: string; code?: string };

/** Sends a JSON request and reports failures (HTTP or network) as a user-facing message. */
export async function sendJson(
  url: string,
  method: "POST" | "PUT",
  body: unknown,
  fallbackMessage: string,
): Promise<ApiResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return { ok: true };
    }

    const error = (await response.json().catch(() => ({}))) as { error?: string; code?: string };
    return { ok: false, message: error.error ?? fallbackMessage, code: error.code };
  } catch {
    return { ok: false, message: "The server could not be reached. Please try again." };
  }
}
