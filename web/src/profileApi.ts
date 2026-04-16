import {
  CandidateProfile,
  UpdateCandidateProfileRequest,
} from "./profileTypes";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  "http://localhost:3001";

const fetchJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
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

    throw new Error(payload?.error || `Request failed with status ${response.status}`);
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
