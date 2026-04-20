import {
  CandidateProfile,
  UpdateCandidateProfileRequest,
} from "./profileTypes";
import { fetchJson } from "./fetchJson";

export const getProfile = async (): Promise<CandidateProfile> =>
  fetchJson<CandidateProfile>("/profile");

export const updateProfile = async (
  request: UpdateCandidateProfileRequest,
): Promise<CandidateProfile> =>
  fetchJson<CandidateProfile>("/profile", {
    method: "PUT",
    body: JSON.stringify(request),
  });
