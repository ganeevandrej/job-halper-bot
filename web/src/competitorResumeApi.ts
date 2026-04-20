import {
  CompetitorResume,
  CompetitorResumeListResponse,
  CompetitorResumeStats,
  CreateCompetitorResumeRequest,
} from "./competitorResumeTypes";
import { fetchJson } from "./fetchJson";

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
