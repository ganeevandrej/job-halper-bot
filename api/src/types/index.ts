export interface VacancyFitAnalysis {
  match_percent: number;
  decision: "yes" | "no";
  reason: string;
  salary_estimate: string;
}

export interface VacancyCoverLetter {
  cover_letter: string;
}
