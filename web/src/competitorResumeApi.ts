import {
  CompetitorResume,
  CompetitorResumeListResponse,
  CompetitorResumeStats,
  CreateCompetitorResumeRequest,
} from "./competitorResumeTypes";

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

    throw new Error(
      payload?.error || `Не удалось выполнить запрос. Код ответа: ${response.status}`,
    );
  }

  return (await response.json()) as T;
};

export const createCompetitorResume = async (
  request: CreateCompetitorResumeRequest,
): Promise<CompetitorResume> =>
  fetchJson<CompetitorResume>("/competitor-resumes", {
    method: "POST",
    body: JSON.stringify(request),
  });

export const getCompetitorResumes = async (
  page: number,
  pageSize: number,
): Promise<CompetitorResumeListResponse> => {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  return fetchJson<CompetitorResumeListResponse>(
    `/competitor-resumes?${params.toString()}`,
  );
};

export const getCompetitorResume = async (
  id: string,
): Promise<CompetitorResume> =>
  fetchJson<CompetitorResume>(`/competitor-resumes/${id}`);

export const getCompetitorResumeStats =
  async (): Promise<CompetitorResumeStats> =>
    fetchJson<CompetitorResumeStats>("/competitor-resumes/stats");
