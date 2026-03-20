import { createBot } from "./bot/bot";
import { logger } from "./utils/logger";

const bootstrap = async (): Promise<void> => {
  const bot = createBot();
  await bot.start({
    onStart: () => logger.info("Telegram bot started"),
  });
};

bootstrap().catch((error) => {
  logger.error("Application failed to start", error);
  process.exit(1);
});
