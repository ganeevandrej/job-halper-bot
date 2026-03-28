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
