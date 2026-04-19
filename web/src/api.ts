import {
  Vacancy,
  VacancyListResponse,
  VacancyStats,
  VacancyStatus,
} from "./types";

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

export const getVacancies = async (
  page: number,
  pageSize: number,
  statuses?: VacancyStatus[],
): Promise<VacancyListResponse> => {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  for (const status of statuses ?? []) {
    params.append("status", status);
  }

  return fetchJson<VacancyListResponse>(`/vacancies?${params.toString()}`);
};

export const getVacancy = async (id: string): Promise<Vacancy> =>
  fetchJson<Vacancy>(`/vacancies/${id}`);

export const analyzeVacancy = async (id: string): Promise<Vacancy> =>
  fetchJson<Vacancy>(`/vacancies/${id}/analyze`, {
    method: "POST",
  });

export const updateVacancyStatus = async (
  id: string,
  status: VacancyStatus,
): Promise<Vacancy> =>
  fetchJson<Vacancy>(`/vacancies/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export const runSearch = async (): Promise<{
  savedCount: number;
  totalCount: number;
  savedIds: string[];
}> =>
  fetchJson("/search/run", {
    method: "POST",
  });

export const getStats = async (): Promise<VacancyStats> =>
  fetchJson<VacancyStats>("/stats");
