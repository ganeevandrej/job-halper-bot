export interface VacancyPreview {
  id: string;
  title: string;
  company: string;
  salary: string;
  url: string;
  searchUrl: string;
}

export interface VacancyDetails {
  title: string;
  company: string;
  salary: string;
  description: string;
  url: string;
}

export interface VacancyAnalysis {
  match_percent: number;
  decision: "yes" | "no";
  reason: string;
  salary_estimate: string;
  cover_letter: string;
}

export type VacancyStatus =
  | "new"
  | "viewed"
  | "rejected"
  | "applied"
  | "hidden";

export interface VacancyRecord {
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

export interface VacancyListFilters {
  limit: number;
  offset: number;
  statuses?: VacancyStatus[];
}

export interface VacancyStats {
  total: number;
  new: number;
  viewed: number;
  rejected: number;
  applied: number;
  hidden: number;
}
