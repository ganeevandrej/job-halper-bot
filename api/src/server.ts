import { createVkBot, sendVkStartupMessage } from "./bot/bot";
import { createApp } from "./app";
import { env } from "./utils/env";
import { logger } from "./utils/logger";

const app = createApp();
const bot = createVkBot();

app.listen(env.port, () => {
  logger.info("API server started", { port: env.port });

  if (bot) {
    bot.updates.start().then(() => {
      logger.info("VK bot started");
      return sendVkStartupMessage(bot);
    }).catch((error) => {
      logger.error("VK bot failed to start", error);
    });
  }
});
