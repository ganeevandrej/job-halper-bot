import { buildApiUrl } from "./apiConfig";

export const fetchJson = async <T>(
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const headers = new Headers(init?.headers);
  headers.set("ngrok-skip-browser-warning", "true");

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    throw new Error(
      payload?.error || `Не удалось выполнить запрос. Код ответа: ${response.status}`,
    );
  }

  return (await response.json()) as T;
};
