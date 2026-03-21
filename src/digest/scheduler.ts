import { Bot } from "grammy";
import cron from "node-cron";
import { buildSearchQueueMessage, collectSearchQueue } from "./searchQueue";
import { env } from "../utils/env";
import { logger } from "../utils/logger";

let isRunning = false;

export const startDailyDigestScheduler = (bot: Bot): void => {
  if (!env.telegramDigestChatId) {
    logger.info(
      "Daily digest scheduler is disabled because TELEGRAM_DIGEST_CHAT_ID is empty",
    );
    return;
  }

  cron.schedule(
    env.digestCron,
    async () => {
      if (isRunning) {
        logger.info("Daily digest skipped because previous run is still active");
        return;
      }

      isRunning = true;

      try {
        const { savedCount, queuedCount } = await collectSearchQueue();
        const result = buildSearchQueueMessage(savedCount, queuedCount);

        await bot.api.sendMessage(env.telegramDigestChatId, result.text, {
          reply_markup: result.replyMarkup,
          link_preview_options: {
            is_disabled: true,
          },
        });
      } catch (error) {
        logger.error("Daily digest job failed", error);
      } finally {
        isRunning = false;
      }
    },
    {
      timezone: env.digestTimezone,
    },
  );

  logger.info("Daily digest scheduler started", {
    cron: env.digestCron,
    timezone: env.digestTimezone,
  });
};
