import { InlineKeyboard } from "grammy";
import {
  API_SEARCH_CONFIGS,
  buildHhSearchUrlFromApiConfig,
} from "../config/apiSearchConfigs";
import { SEARCH_URLS } from "../config/searchUrls";
import { analyzeVacancy } from "../llm/groqClient";
import { fetchVacanciesFromApi } from "../parser/hhApiClient";
import { parseHhVacancy } from "../parser/hhParser";
import { parseHhSearchResults } from "../parser/hhSearchParser";
import {
  ProcessedVacancyRecord,
  VacancyAnalysis,
  VacancyPreview,
  VacancyStatus,
} from "../types";
import { ApiSearchConfig } from "../config/apiSearchConfigs";
import { NormalizedVacancy } from "../types/vacancy";
import { logger } from "../utils/logger";
import { formatVacancyAnalysis } from "../bot/formatters";
import { passesCheapVacancyFilter } from "./prefilter";
import {
  getFirstQueuedVacancy,
  getQueuedVacancyCount,
  hasProcessedVacancy,
  saveProcessedVacancy,
} from "../storage/vacancyStore";

const MATCH_THRESHOLD = 70;
export const ANALYZE_FIRST_CALLBACK = "analyze_first_vacancy";
export type SearchSource = "playwright" | "api";

const mapNormalizedVacancyToPreview = (
  vacancy: NormalizedVacancy,
  searchUrl: string,
): VacancyPreview => ({
  id: vacancy.id,
  title: vacancy.title,
  company: vacancy.company,
  salary: vacancy.salary ?? "Не указано",
  url: vacancy.url,
  searchUrl,
});

const loadVacanciesFromApi = async (
  config: ApiSearchConfig,
): Promise<VacancyPreview[]> => {
  const searchUrl = buildHhSearchUrlFromApiConfig(config);

  logger.info("Using HH API", {
    text: config.text,
    area: config.area,
  });

  const vacancies = await fetchVacanciesFromApi({
    ...config,
    per_page: 50,
    page: 0,
  });

  return vacancies.map((vacancy) =>
    mapNormalizedVacancyToPreview(vacancy, searchUrl),
  );
};

const loadVacanciesFromPlaywright = async (
  searchUrl: string,
): Promise<VacancyPreview[]> => {
  const vacancies = await parseHhSearchResults(searchUrl);
  logger.info("Search URL parsed vacancies", {
    searchUrl,
    count: vacancies.length,
  });

  return vacancies;
};

const collectApiBackedVacancies = async (): Promise<VacancyPreview[]> => {
  const vacancies: VacancyPreview[] = [];

  for (const config of API_SEARCH_CONFIGS) {
    const fallbackSearchUrl = buildHhSearchUrlFromApiConfig(config);

    try {
      const apiVacancies = await loadVacanciesFromApi(config);
      vacancies.push(...apiVacancies);
      logger.info("HH API parsed vacancies", {
        searchUrl: fallbackSearchUrl,
        count: apiVacancies.length,
      });
    } catch (error) {
      logger.info("Fallback to Playwright", {
        text: config.text,
        area: config.area,
      });
      logger.error("HH API source failed, using Playwright fallback", {
        text: config.text,
        area: config.area,
        error,
      });

      const fallbackVacancies =
        await loadVacanciesFromPlaywright(fallbackSearchUrl);
      vacancies.push(...fallbackVacancies);
    }
  }

  return vacancies;
};

const collectPlaywrightVacancies = async (): Promise<VacancyPreview[]> => {
  const vacancies: VacancyPreview[] = [];

  for (const searchUrl of SEARCH_URLS) {
    const parsedVacancies = await loadVacanciesFromPlaywright(searchUrl);
    vacancies.push(...parsedVacancies);
  }

  return vacancies;
};

const buildRecord = (
  preview: VacancyPreview,
  status: VacancyStatus,
  analysis?: VacancyAnalysis,
): ProcessedVacancyRecord => ({
  id: preview.id,
  title: preview.title,
  company: preview.company,
  salary: preview.salary,
  url: preview.url,
  searchUrl: preview.searchUrl,
  status,
  matchPercent: analysis?.match_percent ?? null,
  reason: analysis?.reason ?? null,
  decision: analysis?.decision ?? null,
  processedAt: new Date().toISOString(),
  sentAt: null,
});

const buildPreviewFromRecord = (
  record: ProcessedVacancyRecord,
): VacancyPreview => ({
  id: record.id,
  title: record.title,
  company: record.company,
  salary: record.salary,
  url: record.url,
  searchUrl: record.searchUrl,
});

const getAnalyzeKeyboard = (): InlineKeyboard =>
  new InlineKeyboard().text(
    "Анализировать первую вакансию",
    ANALYZE_FIRST_CALLBACK,
  );

export const collectSearchQueue = async (
  source: SearchSource = "api",
): Promise<{
  savedCount: number;
  queuedCount: number;
}> => {
  const uniqueVacancies = new Map<string, VacancyPreview>();
  const collectedVacancies =
    source === "api"
      ? await collectApiBackedVacancies()
      : await collectPlaywrightVacancies();
  let totalParsed = 0;

  for (const vacancy of collectedVacancies) {
    totalParsed += 1;

    if (!uniqueVacancies.has(vacancy.id)) {
      uniqueVacancies.set(vacancy.id, vacancy);
    }
  }

  let savedCount = 0;
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
  }

  const queuedCount = await getQueuedVacancyCount();
  logger.info("Search queue collection summary", {
    source,
    totalParsed,
    uniqueCount: uniqueVacancies.size,
    savedCount,
    alreadyProcessedCount,
    prefilterRejectedCount,
    queuedCount,
  });

  return { savedCount, queuedCount };
};

export const buildSearchQueueMessage = (
  savedCount: number,
  queuedCount: number,
): { text: string; replyMarkup?: InlineKeyboard } => {
  if (queuedCount === 0) {
    return {
      text: "Новых вакансий для разбора сейчас нет.",
    };
  }

  const text = [
    `Найдено новых вакансий: ${savedCount}.`,
    `Сейчас в очереди на разбор: ${queuedCount}.`,
    "",
    "Я сохранил их у себя.",
    "Если хочешь, могу проанализировать первую вакансию из очереди и подготовить сопроводительное письмо.",
  ].join("\n");

  return {
    text,
    replyMarkup: getAnalyzeKeyboard(),
  };
};

export const analyzeFirstQueuedVacancy = async (): Promise<{
  text: string;
  replyMarkup?: InlineKeyboard;
}> => {
  const record = await getFirstQueuedVacancy();

  if (!record) {
    return {
      text: "Очередь вакансий пуста. Сначала запусти /search.",
    };
  }

  const preview = buildPreviewFromRecord(record);
  logger.info("Analyzing first queued vacancy", {
    vacancyId: preview.id,
    title: preview.title,
    url: preview.url,
  });

  try {
    const vacancyDetails = await parseHhVacancy(preview.url);
    const analysis = await analyzeVacancy(vacancyDetails);
    const status: VacancyStatus =
      analysis.match_percent >= MATCH_THRESHOLD
        ? "analyzed_fit"
        : "analyzed_skip";

    await saveProcessedVacancy(buildRecord(preview, status, analysis));

    const queuedCount = await getQueuedVacancyCount();
    logger.info("Queued vacancy analyzed", {
      vacancyId: preview.id,
      matchPercent: analysis.match_percent,
      status,
      queuedCount,
    });
    const suffix =
      queuedCount > 0
        ? `\n\nОсталось в очереди: ${queuedCount}.`
        : "\n\nОчередь разобрана.";

    return {
      text: `${formatVacancyAnalysis(vacancyDetails, analysis)}${suffix}`,
      replyMarkup: queuedCount > 0 ? getAnalyzeKeyboard() : undefined,
    };
  } catch (error) {
    logger.error("Queued vacancy analysis failed", {
      vacancyUrl: preview.url,
      error,
    });

    return {
      text: `Не удалось проанализировать вакансию.\nСсылка: ${preview.url}`,
      replyMarkup: getAnalyzeKeyboard(),
    };
  }
};
