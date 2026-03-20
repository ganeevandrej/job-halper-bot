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
