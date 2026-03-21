export interface VacancyDetails {
  title: string;
  company: string;
  salary: string;
  description: string;
  url: string;
}

export interface VacancyPreview {
  id: string;
  title: string;
  company: string;
  salary: string;
  url: string;
  searchUrl: string;
}

export interface VacancyAnalysis {
  match_percent: number;
  decision: "yes" | "no";
  reason: string;
  salary_estimate: string;
  cover_letter: string;
}

export type VacancyStatus =
  | "queued"
  | "analyzed_fit"
  | "analyzed_skip"
  | "prefilter_rejected";

export interface ProcessedVacancyRecord {
  id: string;
  title: string;
  company: string;
  salary: string;
  url: string;
  searchUrl: string;
  status: VacancyStatus;
  matchPercent: number | null;
  reason: string | null;
  decision: "yes" | "no" | null;
  processedAt: string;
  sentAt: string | null;
}
