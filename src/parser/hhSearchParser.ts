import { chromium, Locator, Page } from "playwright";
import { VacancyPreview } from "../types";
import { env } from "../utils/env";
import { logger } from "../utils/logger";
import { extractHhVacancyId } from "../utils/validation";

const SEARCH_CARD_SELECTORS = [
  "[data-qa='serp-item']",
  "[data-qa='vacancy-serp__vacancy']",
  ".serp-item",
];

const SEARCH_TITLE_SELECTORS = [
  "[data-qa='serp-item__title']",
  "[data-qa='vacancy-serp__vacancy-title']",
  "a[data-qa*='title']",
  "a[href*='/vacancy/']",
];

const SEARCH_COMPANY_SELECTORS = [
  "[data-qa='vacancy-serp__vacancy-employer']",
  "[data-qa='vacancy-serp__vacancy-employer-text']",
  "[data-qa='vacancy-serp__company-name']",
  "[data-qa*='employer']",
];

const SEARCH_SALARY_SELECTORS = [
  "[data-qa='vacancy-serp__vacancy-compensation']",
  "[data-qa='vacancy-serp__salary']",
  "[data-qa*='compensation']",
  "[data-qa*='salary']",
];

const sanitizeText = (value: string | null | undefined): string =>
  value?.replace(/\s+/g, " ").trim() || "Не указано";

const normalizeVacancyUrl = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value, "https://hh.ru");
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
};

const validateSearchUrl = (value: string): string => {
  const normalized = value.trim();

  try {
    const url = new URL(normalized);
    const isHhHost = url.hostname === "hh.ru" || url.hostname.endsWith(".hh.ru");
    const isSearchPath = url.pathname.includes("/search/vacancy");

    if (!isHhHost || !isSearchPath) {
      throw new Error("URL must point to hh.ru vacancy search");
    }

    return url.toString();
  } catch {
    throw new Error(`Некорректный search URL: ${value}`);
  }
};

const findFirstWorkingSelector = async (
  page: Page,
  selectors: string[],
): Promise<string | null> => {
  for (const selector of selectors) {
    const count = await page.locator(selector).count().catch(() => 0);
    if (count > 0) {
      return selector;
    }
  }

  return null;
};

const getOptionalTextFromCard = async (
  card: Locator,
  selectors: string[],
): Promise<string> => {
  for (const selector of selectors) {
    const locator = card.locator(selector).first();
    const count = await locator.count().catch(() => 0);

    if (count === 0) {
      continue;
    }

    const value = await locator.textContent().catch(() => null);
    const text = sanitizeText(value);

    if (text !== "Не указано") {
      return text;
    }
  }

  return "Не указано";
};

const getTitleLinkFromCard = async (
  card: Locator,
): Promise<{ title: string; url: string | null }> => {
  for (const selector of SEARCH_TITLE_SELECTORS) {
    const locator = card.locator(selector).first();
    const count = await locator.count().catch(() => 0);

    if (count === 0) {
      continue;
    }

    const title = sanitizeText(await locator.textContent().catch(() => null));
    const rawUrl = await locator.getAttribute("href").catch(() => null);
    const url = normalizeVacancyUrl(rawUrl);

    if (title !== "Не указано" && url) {
      return { title, url };
    }
  }

  return {
    title: "Не указано",
    url: null,
  };
};

export const parseHhSearchResults = async (
  searchUrl: string,
): Promise<VacancyPreview[]> => {
  const normalizedSearchUrl = validateSearchUrl(searchUrl);
  const browser = await chromium.launch({
    headless: env.parserHeadless,
    slowMo: 80,
  });

  const context = await browser.newContext({
    locale: "ru-RU",
    timezoneId: "Europe/Moscow",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 960 },
  });

  const page = await context.newPage();

  try {
    logger.info("Opening hh search", { searchUrl: normalizedSearchUrl });
    await page.goto(normalizedSearchUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {
      logger.info("Search page networkidle was not reached, continuing");
    });

    const selectorCounts = await Promise.all(
      SEARCH_CARD_SELECTORS.map(async (selector) => ({
        selector,
        count: await page.locator(selector).count().catch(() => 0),
      })),
    );
    const activeCardSelector = await findFirstWorkingSelector(
      page,
      SEARCH_CARD_SELECTORS,
    );

    logger.info("Search selector diagnostics", {
      pageUrl: page.url(),
      title: await page.title().catch(() => ""),
      selectorCounts,
      activeCardSelector,
    });

    if (!activeCardSelector) {
      return [];
    }

    const cards = page.locator(activeCardSelector);
    const count = await cards.count();
    const vacancies: VacancyPreview[] = [];

    for (let index = 0; index < count; index += 1) {
      const card = cards.nth(index);
      const { title, url } = await getTitleLinkFromCard(card);

      if (!url || title === "Не указано") {
        continue;
      }

      const company = await getOptionalTextFromCard(card, SEARCH_COMPANY_SELECTORS);
      const salary = await getOptionalTextFromCard(card, SEARCH_SALARY_SELECTORS);
      const id = extractHhVacancyId(url) ?? url;

      vacancies.push({
        id,
        title,
        company,
        salary,
        url,
        searchUrl: normalizedSearchUrl,
      });
    }

    logger.info("Search parser extracted vacancies", {
      searchUrl: normalizedSearchUrl,
      count: vacancies.length,
      sample: vacancies.slice(0, 3).map((vacancy) => ({
        title: vacancy.title,
        company: vacancy.company,
        url: vacancy.url,
      })),
    });

    return vacancies;
  } catch (error) {
    logger.error("Failed to parse hh search results", {
      searchUrl: normalizedSearchUrl,
      error,
    });
    throw new Error(
      `Не удалось получить список вакансий из поиска hh.ru: ${normalizedSearchUrl}`,
    );
  } finally {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
};
