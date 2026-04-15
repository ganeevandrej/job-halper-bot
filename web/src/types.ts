export type VacancyStatus =
  | "new"
  | "viewed"
  | "rejected"
  | "applied"
  | "hidden";

export type CoverLetterFocus =
  | "tasks"
  | "product"
  | "domain"
  | "stack"
  | "experience"
  | "short";

export interface Vacancy {
  id: string;
  title: string;
  company: string;
  salary: string;
  url: string;
  searchUrl: string;
  status: VacancyStatus;
  description: string | null;
  matchPercent: number | null;
  reason: string | null;
  decision: "yes" | "no" | null;
  salaryEstimate: string | null;
  coverLetter: string | null;
  createdAt: string;
  updatedAt: string;
  analyzedAt: string | null;
  notifiedAt: string | null;
}

export interface VacancyListResponse {
  items: Vacancy[];
  total: number;
  page: number;
  pageSize: number;
}

export interface VacancyStats {
  total: number;
  new: number;
  viewed: number;
  rejected: number;
  applied: number;
  hidden: number;
}
