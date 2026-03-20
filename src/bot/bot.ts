import { Bot, Context } from "grammy";
import { analyzeVacancy } from "../llm/groqClient";
import { parseHhVacancy } from "../parser/hhParser";
import { VacancyAnalysis, VacancyDetails } from "../types";
import { env } from "../utils/env";
import { logger } from "../utils/logger";
import { splitTelegramMessage } from "../utils/telegram";
import { isHhVacancyUrl } from "../utils/validation";
import { formatVacancyAnalysis } from "./formatters";

const START_MESSAGE = [
  "Привет! Я анализирую вакансии с hh.ru.",
  "",
  "Что умею:",
  "- принять ссылку на вакансию",
  "- распарсить title, company, salary и description",
  "- оценить match через LLM",
  "- сказать, стоит ли откликаться",
  "- сгенерировать сопроводительное письмо",
  "",
  "Отправь ссылку на вакансию hh.ru одним сообщением.",
].join("\n");

const sendFormattedResponse = async (ctx: Context, text: string) => {
  const chunks = splitTelegramMessage(text);

  for (const chunk of chunks) {
    await ctx.reply(chunk, {
      parse_mode: "HTML",
      link_preview_options: {
        is_disabled: true,
      },
    });
  }
};

const processVacancy = async (
  ctx: Context,
  url: string,
): Promise<{ vacancy: VacancyDetails; analysis: VacancyAnalysis }> => {
  await ctx.reply("Анализирую вакансию...");
  await ctx.api.sendChatAction(ctx.chat!.id, "typing");

  const vacancy = await parseHhVacancy(url);
  await ctx.api.sendChatAction(ctx.chat!.id, "typing");

  const analysis = await analyzeVacancy(vacancy);
  return { vacancy, analysis };
};

export const createBot = (): Bot => {
  const bot = new Bot(env.telegramBotToken);

  bot.command("start", async (ctx) => {
    await ctx.reply(START_MESSAGE, {
      link_preview_options: {
        is_disabled: true,
      },
    });
  });

  bot.on("message:text", async (ctx) => {
    const input = ctx.message.text.trim();

    if (input.startsWith("/")) {
      return;
    }

    if (!isHhVacancyUrl(input)) {
      await ctx.reply("Нужна корректная ссылка на вакансию hh.ru, например: https://hh.ru/vacancy/123456789");
      return;
    }

    try {
      const { vacancy, analysis } = await processVacancy(ctx, input);
      await sendFormattedResponse(ctx, formatVacancyAnalysis(vacancy, analysis));
    } catch (error) {
      logger.error("Vacancy processing failed", error);
      await ctx.reply(
        "Не удалось обработать вакансию. Проверь ссылку и попробуй еще раз позже.",
      );
    }
  });

  bot.catch((error) => {
    logger.error("Unhandled bot error", error.error);
  });

  return bot;
};
