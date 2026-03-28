import { SearchParams } from "../types/vacancy";

export type ApiSearchConfig = SearchParams;

export const API_SEARCH_CONFIGS: ApiSearchConfig[] = [
  {
    text: "frontend react",
    area: "113",
  },
  {
    text: "frontend react",
    area: "1",
  },
  {
    text: "frontend react",
    area: "2",
  },
];

export const buildHhSearchUrlFromApiConfig = (
  config: ApiSearchConfig,
): string => {
  const url = new URL("https://hh.ru/search/vacancy");

  url.searchParams.set("text", config.text);
  url.searchParams.set("area", config.area);
  url.searchParams.set("per_page", String(config.per_page ?? 50));
  url.searchParams.set("page", String(config.page ?? 0));

  return url.toString();
};
