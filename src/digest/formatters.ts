import { VacancyPreview } from "../types";

interface DigestItem {
  preview: VacancyPreview;
  matchPercent: number;
  reason: string;
}

const TELEGRAM_LIMIT = 4096;

const buildItemBlock = ({ preview, matchPercent, reason }: DigestItem): string => {
  const lines = [
    `${preview.title} - ${preview.company}`,
    `Match: ${matchPercent}%`,
    `Почему: ${reason}`,
  ];

  if (preview.salary !== "Не указано") {
    lines.push(`ЗП: ${preview.salary}`);
  }

  lines.push(`Ссылка: ${preview.url}`);

  return lines.join("\n");
};

export const formatDigestMessage = (items: DigestItem[]): string | null => {
  if (items.length === 0) {
    return null;
  }

  const header = "🔥 Новые подходящие вакансии";
  const parts: string[] = [header];
  let skippedCount = 0;

  for (const item of items) {
    const block = buildItemBlock(item);
    const candidate = [...parts, block].join("\n\n");

    if (candidate.length > TELEGRAM_LIMIT) {
      skippedCount += 1;
      continue;
    }

    parts.push(block);
  }

  if (skippedCount > 0) {
    const note = `И еще ${skippedCount} вакансий не поместились в одно сообщение.`;
    const candidate = [...parts, note].join("\n\n");

    if (candidate.length <= TELEGRAM_LIMIT) {
      parts.push(note);
    }
  }

  return parts.join("\n\n");
};
