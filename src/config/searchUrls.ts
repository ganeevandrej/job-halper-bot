const SEARCH_QUERY =
  '(NAME:Frontend OR NAME:React OR NAME:"Frontend Developer") AND (DESCRIPTION:React OR DESCRIPTION:Next)';

interface SearchConfig {
  area: string;
  label?: string;
  workFormats?: string[];
}

const SEARCH_CONFIGS: SearchConfig[] = [
  {
    area: "113",
    workFormats: ["REMOTE"],
  },
  {
    area: "2",
    label: "not_from_agency",
    workFormats: ["REMOTE", "HYBRID", "ON_SITE"],
  },
  {
    area: "1",
    label: "not_from_agency",
    workFormats: ["REMOTE", "HYBRID", "ON_SITE"],
  },
];

const buildSearchUrl = (config: SearchConfig): string => {
  const url = new URL("https://hh.ru/search/vacancy");

  url.searchParams.set("text", SEARCH_QUERY);
  url.searchParams.set("excluded_text", "Senior,1C");
  url.searchParams.set("area", config.area);
  url.searchParams.set("professional_role", "96");
  url.searchParams.set("per_page", "50");

  if (config.label) {
    url.searchParams.set("label", config.label);
  }

  for (const workFormat of config.workFormats ?? []) {
    url.searchParams.append("work_format", workFormat);
  }

  return url.toString();
};

export const SEARCH_URLS: string[] = SEARCH_CONFIGS.map(buildSearchUrl);
