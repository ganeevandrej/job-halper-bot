export interface VacancyPreview {
  id: string;
  title: string;
  company: string;
  salary: string;
  url: string;
  searchUrl: string;
}

export type VacancyStatus =
  | "queued"
  | "manual_skipped"
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

export interface VacancyListFilters {
  limit: number;
  offset: number;
  status?: VacancyStatus;
}

export interface VacancyStats {
  total: number;
  queued: number;
  analyzedFit: number;
  analyzedSkip: number;
  prefilterRejected: number;
  manualSkipped: number;
}
