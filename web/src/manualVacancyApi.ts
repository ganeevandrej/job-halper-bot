import {
  CreateManualVacancyRequest,
  ManualVacancy,
  ManualVacancyListResponse,
  UpdateManualVacancyRequest,
} from "./manualVacancyTypes";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  "http://localhost:3001";

const fetchJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    throw new Error(payload?.error || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
};

export const createManualVacancy = async (
  request: CreateManualVacancyRequest,
): Promise<ManualVacancy> =>
  fetchJson<ManualVacancy>("/manual-vacancies", {
    method: "POST",
    body: JSON.stringify(request),
  });

export const getManualVacancies = async (
  page: number,
  pageSize: number,
): Promise<ManualVacancyListResponse> => {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  return fetchJson<ManualVacancyListResponse>(
    `/manual-vacancies?${params.toString()}`,
  );
};

export const getManualVacancy = async (id: string): Promise<ManualVacancy> =>
  fetchJson<ManualVacancy>(`/manual-vacancies/${id}`);

export const updateManualVacancy = async (
  id: string,
  request: UpdateManualVacancyRequest,
): Promise<ManualVacancy> =>
  fetchJson<ManualVacancy>(`/manual-vacancies/${id}`, {
    method: "PATCH",
    body: JSON.stringify(request),
  });

export const analyzeManualVacancy = async (
  id: string,
): Promise<ManualVacancy> =>
  fetchJson<ManualVacancy>(`/manual-vacancies/${id}/analyze`, {
    method: "POST",
  });
