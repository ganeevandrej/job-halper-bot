export type ResumeProcessingStatus = "idle" | "processing" | "completed" | "failed";

export interface CandidateResumeStructuredSummary {
  title: string;
  level: string | null;
  summary: string;
  skills: string[];
  experienceYears: number | null;
  domains: string[];
  strengths: string[];
  education: string | null;
  languages: string[];
}

export interface CandidateProfile {
  id: string;
  title: string;
  salaryExpectation: string | null;
  formats: string[];
  location: string | null;
  hasPhoto: boolean;
  about: string;
  skills: string[];
  experienceText: string;
  educationText: string;
  coverLetterInstructions: string;
  resumeSummaryText: string | null;
  resumeStructured: CandidateResumeStructuredSummary | null;
  resumeProcessingStatus: ResumeProcessingStatus;
  resumeProcessingError: string | null;
  resumeSummaryUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UpdateCandidateProfileRequest = Omit<
  CandidateProfile,
  | "id"
  | "resumeSummaryText"
  | "resumeStructured"
  | "resumeProcessingStatus"
  | "resumeProcessingError"
  | "resumeSummaryUpdatedAt"
  | "createdAt"
  | "updatedAt"
>;
