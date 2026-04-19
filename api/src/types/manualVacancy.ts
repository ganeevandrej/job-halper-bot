export interface ManualVacancyParsedFields {
  title: string;
  company: string;
  salary: string | null;
  estimatedSalary: string | null;
  formats: string[];
  location: string;
  grade: string;
  stack: string[];
  tasks: string[];
  requirements: string[];
  niceToHave: string[];
  redFlags: string[];
  summary: string;
}

export type ManualVacancyStatus =
  | "new"
  | "analyzed"
  | "applied"
  | "not_fit"
  | "archived";

export interface ManualVacancyRecord extends ManualVacancyParsedFields {
  id: string;
  hhId: string | null;
  url: string | null;
  rawText: string;
  status: ManualVacancyStatus;
  matchPercent: number | null;
  decision: "yes" | "no" | null;
  reason: string | null;
  salaryEstimate: string | null;
  coverLetter: string | null;
  createdAt: string;
  updatedAt: string;
  analyzedAt: string | null;
}

export interface CreateManualVacancyRequest {
  rawText: string;
  salaryOverride?: string;
  hhId?: string;
  url?: string;
  company?: string;
}

export interface ManualVacancyListFilters {
  limit: number;
  offset: number;
}

export type UpdateManualVacancyInput = Partial<
  ManualVacancyParsedFields & {
    rawText: string;
    hhId: string | null;
    url: string | null;
    status: ManualVacancyStatus;
  }
>;
