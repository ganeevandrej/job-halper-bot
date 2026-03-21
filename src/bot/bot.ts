import { Bot, Context, InlineKeyboard } from "grammy";
import {
  ANALYZE_FIRST_CALLBACK,
  analyzeFirstQueuedVacancy,
  buildSearchQueueMessage,
  collectSearchQueue,
} from "../digest/searchQueue";
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

const sendHtmlResponse = async (
  ctx: Context,
  text: string,
  replyMarkup?: InlineKeyboard,
) => {
  const chunks = splitTelegramMessage(text);

  for (let index = 0; index < chunks.length; index += 1) {
    await ctx.reply(chunks[index], {
      parse_mode: "HTML",
      reply_markup: index === chunks.length - 1 ? replyMarkup : undefined,
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

  bot.command("search", async (ctx) => {
    await ctx.reply("Ищу новые вакансии по сохраненным поискам...");

    try {
      const { savedCount, queuedCount } = await collectSearchQueue();
      const result = buildSearchQueueMessage(savedCount, queuedCount);
      await ctx.reply(result.text, {
        reply_markup: result.replyMarkup,
        link_preview_options: {
          is_disabled: true,
        },
      });
    } catch (error) {
      logger.error("Manual search failed", error);
      await ctx.reply("Не удалось собрать список вакансий.");
    }
  });

  bot.callbackQuery(ANALYZE_FIRST_CALLBACK, async (ctx) => {
    await ctx.answerCallbackQuery({
      text: "Анализирую первую вакансию...",
    });

    try {
      const result = await analyzeFirstQueuedVacancy();
      await sendHtmlResponse(ctx, result.text, result.replyMarkup);
    } catch (error) {
      logger.error("Analyze first vacancy callback failed", error);
      await ctx.reply("Не удалось проанализировать первую вакансию.");
    }
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
