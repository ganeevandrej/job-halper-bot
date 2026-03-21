import { VacancyPreview } from "../types";

const EXCLUDE_KEYWORDS = [
  "1c",
];

export const passesCheapVacancyFilter = (vacancy: VacancyPreview): boolean => {
  const haystack = `${vacancy.title} ${vacancy.company}`.toLowerCase();
  const hasExcludedKeyword = EXCLUDE_KEYWORDS.some((keyword) =>
    haystack.includes(keyword),
  );

  return !hasExcludedKeyword;
};
