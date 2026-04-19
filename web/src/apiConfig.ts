const configuredApiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "";

export const API_BASE_URL = configuredApiBaseUrl ||
  (import.meta.env.DEV ? "http://localhost:3001" : "");

export const buildApiUrl = (path: string): string => {
  if (!API_BASE_URL) {
    throw new Error(
      "Не задан VITE_API_BASE_URL для production-сборки. Укажи публичный адрес backend API в переменных GitHub Actions.",
    );
  }

  return `${API_BASE_URL}${path}`;
};
