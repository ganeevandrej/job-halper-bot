export type ManualVacancyStatus =
  | "new"
  | "viewed"
  | "rejected"
  | "applied"
  | "hidden";

export interface ManualVacancy {
  id: string;
  rawText: string;
  status: ManualVacancyStatus;
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
  matchPercent: number | null;
  decision: "yes" | "no" | null;
  reason: string | null;
  salaryEstimate: string | null;
  coverLetter: string | null;
  createdAt: string;
  updatedAt: string;
  analyzedAt: string | null;
}

export interface ManualVacancyListResponse {
  items: ManualVacancy[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateManualVacancyRequest {
  rawText: string;
  salaryOverride?: string;
}

export type UpdateManualVacancyRequest = Partial<{
  rawText: string;
  status: ManualVacancyStatus;
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
}>;
