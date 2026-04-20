import {
  CreateManualVacancyRequest,
  ManualVacancy,
  ManualVacancyListResponse,
  ManualVacancyStats,
  ManualVacancyStatus,
  UpdateManualVacancyRequest,
} from "./manualVacancyTypes";
import { fetchJson } from "./fetchJson";

export const createManualVacancy = async (
  request: CreateManualVacancyRequest,
): Promise<ManualVacancy> =>
  fetchJson<ManualVacancy>("/manual-vacancies", {
    method: "POST",
    body: JSON.stringify(request),
  });

export const createAndAnalyzeManualVacancy = async (
  request: CreateManualVacancyRequest,
): Promise<ManualVacancy> =>
  fetchJson<ManualVacancy>("/manual-vacancies/analyze", {
    method: "POST",
    body: JSON.stringify(request),
  });

export const getManualVacancies = async (
  page: number,
  pageSize: number,
  hhId?: string,
  status?: ManualVacancyStatus | "",
): Promise<ManualVacancyListResponse> => {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  if (hhId?.trim()) {
    params.set("hhId", hhId.trim());
  }

  if (status) {
    params.set("status", status);
  }

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

export const generateManualVacancyCoverLetter = async (
  id: string,
): Promise<ManualVacancy> =>
  fetchJson<ManualVacancy>(`/manual-vacancies/${id}/cover-letter`, {
    method: "POST",
  });

export const getManualVacancyStats = async (): Promise<ManualVacancyStats> =>
  fetchJson<ManualVacancyStats>("/manual-vacancies/stats");
