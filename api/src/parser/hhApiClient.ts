import { VacancyDetails } from "../types";
import { SearchParams, NormalizedVacancy } from "../types/vacancy";

interface HhApiEmployer {
  name?: string;
}

interface HhApiSalary {
  from?: number | null;
  to?: number | null;
  currency?: string | null;
}

interface HhApiSnippet {
  requirement?: string | null;
}

interface HhApiVacancy {
  id: string;
  name?: string;
  employer?: HhApiEmployer | null;
  alternate_url?: string;
  salary?: HhApiSalary | null;
  snippet?: HhApiSnippet | null;
}

interface HhApiResponse {
  items?: HhApiVacancy[];
  page?: number;
  pages?: number;
  found?: number;
  per_page?: number;
}

interface HhApiVacancyDetailsResponse {
  name?: string;
  employer?: HhApiEmployer | null;
  salary?: HhApiSalary | null;
  description?: string | null;
  alternate_url?: string;
}

const HH_API_URL = "https://api.hh.ru/vacancies";
const HH_API_USER_AGENT = "job-helper-api/1.0 (local-dev)";
const FALLBACK_LABEL = "Not specified";

const formatSalary = (salary?: HhApiSalary | null): string | undefined => {
  if (!salary) {
    return undefined;
  }

  const parts: string[] = [];

  if (typeof salary.from === "number") {
    parts.push(`from ${salary.from}`);
  }

  if (typeof salary.to === "number") {
    parts.push(`to ${salary.to}`);
  }

  if (salary.currency) {
    parts.push(salary.currency);
  }

  return parts.length > 0 ? parts.join(" ") : undefined;
};

const extractVacancyId = (vacancyUrl: string): string | null => {
  try {
    const url = new URL(vacancyUrl);
    const match = url.pathname.match(/\/vacancy\/(\d+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
};

const decodeHtmlEntities = (value: string): string =>
  value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const stripHtml = (value: string | null | undefined): string =>
  decodeHtmlEntities(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

export const mapApiVacancy = (item: HhApiVacancy): NormalizedVacancy => ({
  id: item.id,
  title: item.name?.trim() || FALLBACK_LABEL,
  company: item.employer?.name?.trim() || FALLBACK_LABEL,
  url: item.alternate_url?.trim() || "",
  salary: formatSalary(item.salary),
  snippet: item.snippet?.requirement?.trim() || undefined,
});

export const fetchVacanciesFromApi = async (
  params: SearchParams,
): Promise<NormalizedVacancy[]> => {
  const url = new URL(HH_API_URL);

  url.searchParams.set("text", params.text);
  url.searchParams.set("area", params.area);
  url.searchParams.set("per_page", String(params.per_page ?? 50));
  url.searchParams.set("page", String(params.page ?? 0));

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": HH_API_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`HH API request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as HhApiResponse;
  const items = Array.isArray(payload.items) ? payload.items : [];

  return items.map(mapApiVacancy).filter((vacancy) => vacancy.id && vacancy.url);
};

export const fetchVacanciesFromSearchUrl = async (
  searchUrl: string,
): Promise<NormalizedVacancy[]> => {
  const sourceUrl = new URL(searchUrl);
  const buildApiUrl = (page: number): URL => {
    const apiUrl = new URL(HH_API_URL);

    sourceUrl.searchParams.forEach((value, key) => {
      if (
        key === "saved_search_id" ||
        key === "enable_snippets" ||
        key === "no_magic"
      ) {
        return;
      }

      apiUrl.searchParams.append(key, value);
    });

    apiUrl.searchParams.set("per_page", "50");
    apiUrl.searchParams.set("page", String(page));

    return apiUrl;
  };

  const requestPage = async (page: number): Promise<HhApiResponse> => {
    const response = await fetch(buildApiUrl(page).toString(), {
      headers: {
        "User-Agent": HH_API_USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(`HH API request failed with status ${response.status}`);
    }

    return (await response.json()) as HhApiResponse;
  };

  const firstPage = await requestPage(0);
  const allItems = Array.isArray(firstPage.items) ? [...firstPage.items] : [];
  const pages = typeof firstPage.pages === "number" ? firstPage.pages : 1;

  for (let page = 1; page < pages; page += 1) {
    const payload = await requestPage(page);
    const pageItems = Array.isArray(payload.items) ? payload.items : [];
    allItems.push(...pageItems);
  }

  return allItems
    .map(mapApiVacancy)
    .filter((vacancy) => vacancy.id && vacancy.url);
};

export const fetchVacancyDetailsFromApi = async (
  vacancyUrl: string,
): Promise<VacancyDetails> => {
  const vacancyId = extractVacancyId(vacancyUrl);

  if (!vacancyId) {
    throw new Error("Could not extract vacancy id from url");
  }

  const response = await fetch(`${HH_API_URL}/${vacancyId}`, {
    headers: {
      "User-Agent": HH_API_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`HH API vacancy request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as HhApiVacancyDetailsResponse;
  const description = stripHtml(payload.description);

  if (!payload.name?.trim() || !description) {
    throw new Error("HH API returned incomplete vacancy details");
  }

  return {
    title: payload.name.trim(),
    company: payload.employer?.name?.trim() || FALLBACK_LABEL,
    salary: formatSalary(payload.salary) || FALLBACK_LABEL,
    description,
    url: payload.alternate_url?.trim() || vacancyUrl,
  };
};
