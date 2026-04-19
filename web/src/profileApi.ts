import {
  CandidateProfile,
  UpdateCandidateProfileRequest,
} from "./profileTypes";
import { buildApiUrl } from "./apiConfig";

const fetchJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(buildApiUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    throw new Error(
      payload?.error || `Не удалось выполнить запрос. Код ответа: ${response.status}`,
    );
  }

  return (await response.json()) as T;
};

export const getProfile = async (): Promise<CandidateProfile> =>
  fetchJson<CandidateProfile>("/profile");

export const updateProfile = async (
  request: UpdateCandidateProfileRequest,
): Promise<CandidateProfile> =>
  fetchJson<CandidateProfile>("/profile", {
    method: "PUT",
    body: JSON.stringify(request),
  });
