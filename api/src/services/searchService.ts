import {
  API_SEARCH_CONFIGS,
  ApiSearchConfig,
  buildHhSearchUrlFromApiConfig,
} from "../config/apiSearchConfigs";
import { fetchVacanciesFromApi } from "../parser/hhApiClient";
import {
  ProcessedVacancyRecord,
  VacancyPreview,
  VacancyStatus,
} from "../types";
import { NormalizedVacancy } from "../types/vacancy";
import { logger } from "../utils/logger";
import {
  hasProcessedVacancy,
  saveProcessedVacancy,
} from "../storage/vacancyRepository";
import { passesCheapVacancyFilter } from "./prefilter";

const FALLBACK_SALARY = "Not specified";

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
): ProcessedVacancyRecord => ({
  id: preview.id,
  title: preview.title,
  company: preview.company,
  salary: preview.salary,
  url: preview.url,
  searchUrl: preview.searchUrl,
  status,
  matchPercent: null,
  reason: null,
  decision: null,
  processedAt: new Date().toISOString(),
  sentAt: null,
});

const loadVacanciesFromApi = async (
  config: ApiSearchConfig,
): Promise<VacancyPreview[]> => {
  const searchUrl = buildHhSearchUrlFromApiConfig(config);
  const vacancies = await fetchVacanciesFromApi({
    ...config,
    per_page: 50,
    page: 0,
  });

  logger.info("HH API vacancies fetched", {
    text: config.text,
    area: config.area,
    count: vacancies.length,
  });

  return vacancies.map((vacancy) =>
    mapNormalizedVacancyToPreview(vacancy, searchUrl),
  );
};

export const collectSearchQueue = async (): Promise<{
  savedCount: number;
  queuedCount: number;
}> => {
  const uniqueVacancies = new Map<string, VacancyPreview>();
  let totalParsed = 0;

  for (const config of API_SEARCH_CONFIGS) {
    const vacancies = await loadVacanciesFromApi(config);

    for (const vacancy of vacancies) {
      totalParsed += 1;

      if (!uniqueVacancies.has(vacancy.id)) {
        uniqueVacancies.set(vacancy.id, vacancy);
      }
    }
  }

  let savedCount = 0;
  let queuedCount = 0;
  let alreadyProcessedCount = 0;
  let prefilterRejectedCount = 0;

  for (const vacancy of uniqueVacancies.values()) {
    if (await hasProcessedVacancy(vacancy.id)) {
      alreadyProcessedCount += 1;
      continue;
    }

    if (!passesCheapVacancyFilter(vacancy)) {
      await saveProcessedVacancy(buildRecord(vacancy, "prefilter_rejected"));
      prefilterRejectedCount += 1;
      continue;
    }

    await saveProcessedVacancy(buildRecord(vacancy, "queued"));
    savedCount += 1;
    queuedCount += 1;
  }

  logger.info("Search queue collection summary", {
    totalParsed,
    uniqueCount: uniqueVacancies.size,
    savedCount,
    queuedCount,
    alreadyProcessedCount,
    prefilterRejectedCount,
  });

  return { savedCount, queuedCount };
};
