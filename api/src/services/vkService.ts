import { getRandomId, Keyboard, VK } from "vk-io";
import { env } from "../utils/env";
import { logger } from "../utils/logger";
import { VacancyPreview } from "../types";

const canUseVkUrlButton = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname !== "localhost";
  } catch {
    return false;
  }
};

const buildMessage = (
  savedCount: number,
  vacancies: VacancyPreview[],
): string => {
  const previewLines = vacancies.slice(0, 5).map((vacancy, index) => {
    return `${index + 1}. ${vacancy.title} - ${vacancy.company}`;
  });

  return [
    `Новые вакансии: ${savedCount}`,
    `SPA: ${env.webAppUrl}`,
    "",
    ...previewLines,
  ].join("\n");
};

const buildOpenDashboardKeyboard = (): string | undefined => {
  if (!canUseVkUrlButton(env.webAppUrl)) {
    return undefined;
  }

  return Keyboard.builder()
    .urlButton({
      label: "Перейти в SPA",
      url: env.webAppUrl,
    })
    .inline()
    .toString();
};

export const notifyAboutNewVacancies = async (
  savedCount: number,
  vacancies: VacancyPreview[],
): Promise<boolean> => {
  if (!env.vkGroupToken || !env.vkDigestPeerId || savedCount <= 0) {
    logger.info("VK notification skipped", {
      hasToken: Boolean(env.vkGroupToken),
      hasPeerId: Boolean(env.vkDigestPeerId),
      savedCount,
    });
    return false;
  }

  const vk = new VK({ token: env.vkGroupToken });

  try {
    await vk.api.messages.send({
      peer_id: env.vkDigestPeerId,
      random_id: getRandomId(),
      message: buildMessage(savedCount, vacancies),
      keyboard: buildOpenDashboardKeyboard(),
    });

    logger.info("VK notification sent", {
      savedCount,
      peerId: env.vkDigestPeerId,
    });

    return true;
  } catch (error) {
    logger.error("VK notification failed", error);
    return false;
  }
};
