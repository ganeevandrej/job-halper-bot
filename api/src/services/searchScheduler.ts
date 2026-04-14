import { collectSearchQueue } from "./searchService";
import { env } from "../utils/env";
import { logger } from "../utils/logger";

let timer: NodeJS.Timeout | null = null;

export const isSearchSchedulerRunning = (): boolean => timer !== null;

export const startSearchScheduler = (): boolean => {
  if (timer) {
    logger.info("Search scheduler start skipped because it is already running");
    return false;
  }

  const intervalMinutes = Math.max(1, env.searchIntervalMinutes);
  const intervalMs = intervalMinutes * 60 * 1000;

  logger.info("Search scheduler started", {
    intervalMinutes,
  });

  collectSearchQueue("scheduled").catch((error) => {
    logger.error("Scheduled search failed", error);
  });

  timer = setInterval(() => {
    collectSearchQueue("scheduled").catch((error) => {
      logger.error("Scheduled search failed", error);
    });
  }, intervalMs);

  return true;
};

export const stopSearchScheduler = (): boolean => {
  if (!timer) {
    logger.info("Search scheduler stop skipped because it is not running");
    return false;
  }

  clearInterval(timer);
  timer = null;
  logger.info("Search scheduler stopped");

  return true;
};
