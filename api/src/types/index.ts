export interface VacancyFitAnalysis {
  match_percent: number;
  decision: "yes" | "no";
  reason: string;
  salary_estimate: string;
}

export interface VacancyCoverLetter {
  cover_letter: string;
}

export interface CompanyProfileAnalysis {
  name: string;
  domain: string | null;
  product_type: string | null;
  short_pitch: string | null;
  highlights: string[];
  tech_level: string | null;
  summary: string | null;
}
