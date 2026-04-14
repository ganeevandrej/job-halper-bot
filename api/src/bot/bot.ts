import { getRandomId, Keyboard, MessageContext, VK } from "vk-io";
import {
  isSearchSchedulerRunning,
  startSearchScheduler,
  stopSearchScheduler,
} from "../services/searchScheduler";
import { env } from "../utils/env";
import { logger } from "../utils/logger";

const START_SEARCH_LABEL = "Начать поиск";
const LEGACY_START_SEARCH_LABEL = "Запустить поиск";
const STOP_SEARCH_LABEL = "Остановить поиск";

const START_MESSAGE = [
  "Привет. Я буду присылать новые вакансии из поиска.",
  "",
  "Управление:",
  `- ${START_SEARCH_LABEL}: искать новые вакансии сразу и дальше по расписанию`,
  `- ${STOP_SEARCH_LABEL}: не запускать поиск до следующего включения`,
  "",
  `SPA: ${env.webAppUrl}`,
].join("\n");

type SearchCommand = "start_search" | "stop_search";

const buildControlKeyboard = () => {
  const builder = Keyboard.builder();

  if (isSearchSchedulerRunning()) {
    return builder
      .textButton({
        label: STOP_SEARCH_LABEL,
        payload: { command: "stop_search" satisfies SearchCommand },
        color: Keyboard.NEGATIVE_COLOR,
      })
      .oneTime(false);
  }

  return builder
    .textButton({
      label: START_SEARCH_LABEL,
      payload: { command: "start_search" satisfies SearchCommand },
      color: Keyboard.POSITIVE_COLOR,
    })
    .oneTime(false);
};

const getCommand = (ctx: MessageContext): SearchCommand | undefined => {
  const payloadCommand = ctx.messagePayload?.command;

  if (payloadCommand === "start_search" || payloadCommand === "stop_search") {
    return payloadCommand;
  }

  const text = ctx.text?.trim().toLowerCase();

  if (text === START_SEARCH_LABEL.toLowerCase() || text === "/start_search") {
    return "start_search";
  }

  if (text === LEGACY_START_SEARCH_LABEL.toLowerCase()) {
    return "start_search";
  }

  if (text === STOP_SEARCH_LABEL.toLowerCase() || text === "/stop_search") {
    return "stop_search";
  }

  return undefined;
};

const handleCommand = async (
  ctx: MessageContext,
  command: SearchCommand,
): Promise<void> => {
  if (command === "start_search") {
    const started = startSearchScheduler();
    await ctx.send(
      started
        ? `Поиск запущен. Первый запуск выполняется сейчас, дальше каждые ${Math.max(1, env.searchIntervalMinutes)} минут.`
        : "Поиск уже запущен.",
      { keyboard: buildControlKeyboard() },
    );
    return;
  }

  const stopped = stopSearchScheduler();
  await ctx.send(
    stopped
      ? "Поиск остановлен. Новых запусков не будет до следующего включения."
      : "Поиск уже остановлен.",
    { keyboard: buildControlKeyboard() },
  );
};

export const createVkBot = (): VK | null => {
  if (!env.vkGroupToken || !env.vkGroupId) {
    logger.info("VK bot is disabled because VK_GROUP_TOKEN or VK_GROUP_ID is empty");
    return null;
  }

  const vk = new VK({
    token: env.vkGroupToken,
    pollingGroupId: env.vkGroupId,
  });

  vk.updates.on("message_new", async (ctx) => {
    if (ctx.isOutbox) {
      return;
    }

    const text = ctx.text?.trim().toLowerCase();

    if (text === "/start" || text === "start" || text === "начать") {
      await ctx.send(START_MESSAGE, { keyboard: buildControlKeyboard() });
      return;
    }

    const command = getCommand(ctx);

    if (command) {
      await handleCommand(ctx, command);
      return;
    }

    await ctx.send(START_MESSAGE, { keyboard: buildControlKeyboard() });
  });

  return vk;
};

export const sendVkStartupMessage = async (vk: VK): Promise<void> => {
  if (!env.vkDigestPeerId) {
    return;
  }

  await vk.api.messages.send({
    peer_id: env.vkDigestPeerId,
    random_id: getRandomId(),
    message: "Давай начнем откликаться! Нажми кнопку, чтобы начать поиск.",
    keyboard: buildControlKeyboard().toString(),
  });
};
