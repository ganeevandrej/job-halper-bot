import { SEARCH_CONFIGS, SearchConfig } from "../config/apiSearchConfigs";
import { fetchVacanciesFromSearchUrl } from "../parser/hhApiClient";
import { VacancyPreview, VacancyRecord, VacancyStatus } from "../types";
import { NormalizedVacancy } from "../types/vacancy";
import { logger } from "../utils/logger";
import {
  createVacancy,
  hasVacancy,
  markVacanciesNotified,
} from "../storage/vacancyRepository";
import { passesCheapVacancyFilter } from "./prefilter";
import { notifyAboutNewVacancies } from "./vkService";

const FALLBACK_SALARY = "Not specified";
let isSearchRunning = false;

const mapNormalizedVacancyToPreview = (
  vacancy: NormalizedVacancy,
  searchUrl: string,
): VacancyPreview => ({
  id: vacancy.id,
  title: vacancy.title,
  company: vacancy.company,
  salary: vacancy.salary ?? FALLBACK_SALARY,
  url: vacancy.url,
  searchUrl,
});

const buildRecord = (
  preview: VacancyPreview,
  status: VacancyStatus,
): Omit<
  VacancyRecord,
  | "description"
  | "matchPercent"
  | "reason"
  | "decision"
  | "salaryEstimate"
  | "coverLetter"
  | "analyzedAt"
  | "notifiedAt"
> => {
  const now = new Date().toISOString();

  return {
    id: preview.id,
    title: preview.title,
    company: preview.company,
    salary: preview.salary,
    url: preview.url,
    searchUrl: preview.searchUrl,
    status,
    createdAt: now,
    updatedAt: now,
  };
};

const loadVacanciesFromSearchUrl = async (
  config: SearchConfig,
): Promise<VacancyPreview[]> => {
  const vacancies = await fetchVacanciesFromSearchUrl(config.url);

  logger.info("HH vacancies fetched from search url", {
    label: config.label,
    searchUrl: config.url,
    count: vacancies.length,
  });

  return vacancies.map((vacancy) =>
    mapNormalizedVacancyToPreview(vacancy, config.url),
  );
};

export const collectSearchQueue = async (
  trigger: "manual" | "scheduled" = "manual",
): Promise<{
  savedCount: number;
  totalCount: number;
  savedIds: string[];
  savedVacancies: VacancyPreview[];
  skipped: boolean;
}> => {
  if (isSearchRunning) {
    logger.info("Search run skipped because previous run is still active", {
      trigger,
    });

    return {
      savedCount: 0,
      totalCount: 0,
      savedIds: [],
      savedVacancies: [],
      skipped: true,
    };
  }

  isSearchRunning = true;

  const uniqueVacancies = new Map<string, VacancyPreview>();
  const savedIds: string[] = [];
  const savedVacancies: VacancyPreview[] = [];

  try {
    let totalParsed = 0;

    for (const searchConfig of SEARCH_CONFIGS) {
      const vacancies = await loadVacanciesFromSearchUrl(searchConfig);

      for (const vacancy of vacancies) {
        totalParsed += 1;

        if (!uniqueVacancies.has(vacancy.id)) {
          uniqueVacancies.set(vacancy.id, vacancy);
        }
      }
    }

    let savedCount = 0;
    let alreadyExistingCount = 0;
    let rejectedCount = 0;

    for (const vacancy of uniqueVacancies.values()) {
      if (await hasVacancy(vacancy.id)) {
        alreadyExistingCount += 1;
        continue;
      }

      if (!passesCheapVacancyFilter(vacancy)) {
        rejectedCount += 1;
        continue;
      }

      await createVacancy(buildRecord(vacancy, "new"));
      savedCount += 1;
      savedIds.push(vacancy.id);
      savedVacancies.push(vacancy);
    }

    logger.info("Search run finished", {
      trigger,
      totalParsed,
      uniqueCount: uniqueVacancies.size,
      savedCount,
      alreadyExistingCount,
      rejectedCount,
    });

    if (savedIds.length > 0) {
      const wasSent = await notifyAboutNewVacancies(savedCount, savedVacancies);

      if (wasSent) {
        await markVacanciesNotified(savedIds);
      }
    }

    return {
      savedCount,
      totalCount: uniqueVacancies.size,
      savedIds,
      savedVacancies,
      skipped: false,
    };
  } finally {
    isSearchRunning = false;
  }
};
