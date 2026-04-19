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
  createdAt: string;
  updatedAt: string;
}

export type UpdateCandidateProfileRequest = Omit<
  CandidateProfile,
  "id" | "createdAt" | "updatedAt"
>;
