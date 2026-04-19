export interface CompetitorResumeAnalysis {
  title: string;
  gender: "male" | "female" | "unknown";
  ageYears: number | null;
  totalExperienceMonths: number | null;
  relevantExperienceMonths: number | null;
  irrelevantExperienceMonths: number | null;
  relevantExperienceSummary: string;
  salaryExpectation: string | null;
  keySkills: string[];
  strengths: string[];
  weaknesses: string[];
  isBetterThanMine: boolean;
  comparisonScore: number;
  comparisonReason: string;
}

export interface CompetitorResumeRecord extends CompetitorResumeAnalysis {
  id: string;
  hhId: string | null;
  url: string | null;
  rawText: string;
  hasPhoto: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompetitorResumeInput {
  rawText: string;
  hhId?: string;
  hasPhoto: boolean;
}

export interface CompetitorResumeListFilters {
  limit: number;
  offset: number;
}

export interface CompetitorResumeListResult {
  items: CompetitorResumeRecord[];
  total: number;
}

export interface CompetitorResumeStatsBucket {
  label: string;
  count: number;
}

export interface CompetitorResumeStats {
  total: number;
  withPhoto: number;
  betterThanMine: number;
  averageComparisonScore: number | null;
  averageRelevantExperienceMonths: number | null;
  comparisonScoreBuckets: CompetitorResumeStatsBucket[];
  relevantExperienceBuckets: CompetitorResumeStatsBucket[];
  photoDistribution: CompetitorResumeStatsBucket[];
  betterDistribution: CompetitorResumeStatsBucket[];
}
