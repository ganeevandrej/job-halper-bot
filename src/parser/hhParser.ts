import { chromium, Page } from "playwright";
import { env } from "../utils/env";
import { logger } from "../utils/logger";
import { randomDelay } from "../utils/sleep";
import { VacancyDetails } from "../types";

const sanitizeText = (value: string | null | undefined): string =>
  value?.replace(/\s+/g, " ").trim() || "Не указано";

const getOptionalText = async (
  
  page: Page,
  selector: string,
  mode: "textContent" | "innerText" = "textContent",
): Promise<string> => {
  const locator = page.locator(selector).first();
  const count = await locator.count();

  if (count === 0) {
    return "Не указано";
  }

  try {
    const value =
      mode === "innerText"
        ? await locator.innerText({ timeout: 2_000 })
        : await locator.textContent({ timeout: 2_000 });

    return sanitizeText(value);
  } catch {
    return "Не указано";
  }
};

export const parseHhVacancy = async (url: string): Promise<VacancyDetails> => {
  const browser = await chromium.launch({
    headless: env.parserHeadless,
    slowMo: 120,
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
    logger.info("Opening hh vacancy", { url });
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await randomDelay();
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {
      logger.info("networkidle was not reached, continuing with current DOM");
    });
    await randomDelay(900, 1800);

    const title = await getOptionalText(
      page,
      "h1[data-qa='vacancy-title'], h1",
    );

    const company = await getOptionalText(
      page,
      "[data-qa='vacancy-company-name'], [data-qa='vacancy-company-name'] span, .vacancy-company-name",
    );

    const salary = await getOptionalText(
      page,
      "[data-qa='vacancy-salary'], [data-qa='vacancy-compensation']",
    );

    const description = await getOptionalText(
      page,
      "[data-qa='vacancy-description'], .vacancy-description, .bloko-gap_top",
      "innerText",
    );

    if (title === "Не указано" || description === "Не указано") {
      throw new Error("Не удалось извлечь основные данные вакансии");
    }

    return {
      title,
      company,
      salary,
      description,
      url,
    };
  } catch (error) {
    logger.error("Failed to parse vacancy", error);
    throw new Error("Не удалось распарсить вакансию hh.ru");
  } finally {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
};
