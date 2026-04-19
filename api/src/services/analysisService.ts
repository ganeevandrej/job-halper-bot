import OpenAI from "openai";
import {
  formatCandidateProfileForPrompt,
  getCandidateProfile,
} from "../storage/profileRepository";
import {
  VacancyCoverLetter,
  VacancyFitAnalysis,
} from "../types";
import { env } from "../utils/env";
import { logger } from "../utils/logger";

const client = new OpenAI({
  apiKey: env.groqApiKey,
  baseURL: env.groqBaseUrl,
});

const buildFitPrompt = (
  rawVacancyText: string,
  candidateResume: string,
): string => `
Ты HR-ассистент и карьерный консультант для frontend-разработчика.

Контекст кандидата:
${candidateResume}

Полный текст вакансии:
${rawVacancyText}

Нужно:
1. Оценить соответствие кандидата вакансии в процентах от 0 до 100.
2. Принять решение, стоит ли откликаться.
3. Кратко объяснить решение: сильные совпадения, риски, пробелы.
4. Оценить реалистичную зарплатную вилку или ожидание кандидата для этой вакансии.

Шкала match_percent:
- 90-100: сильное совпадение, кандидат явно подходит; можно ставить даже если не совпадает 100% библиотек или второстепенных инструментов.
- 75-89: хорошее совпадение, стоит откликаться; есть отдельные риски или пробелы, но они не критичны.
- 60-74: частичное совпадение; отклик возможен, но есть заметные пробелы по опыту, стеку, грейду или формату.
- 40-59: слабое совпадение; отклик только если вакансия очень интересна.
- 0-39: кандидат в основном не подходит.

Оцени по смыслу полного текста вакансии. Не снижай оценку за отсутствие точного названия UI-библиотеки, CSS-фреймворка или вспомогательного инструмента, если в резюме есть близкий опыт с React, TypeScript, сложными интерфейсами, формами, таблицами, API или админками.
Не используй структурированные поля вакансии: источником истины является только полный текст вакансии выше.

Верни строго JSON без markdown.
{
  "match_percent": number,
  "decision": "yes" | "no",
  "reason": string,
  "salary_estimate": string
}
`.trim();

const buildCoverLetterPrompt = (
  rawVacancyText: string,
  candidateResume: string,
  coverLetterInstructions: string,
  fitAnalysis: VacancyFitAnalysis,
): string => `
Ты помогаешь frontend-разработчику написать короткое человеческое сопроводительное письмо для отклика.

Контекст кандидата:
${candidateResume}

Формат и личные правила письма:
${coverLetterInstructions}

Полный текст вакансии:
${rawVacancyText}

Уже рассчитанная совместимость:
${JSON.stringify(fitAnalysis, null, 2)}

Требования:
- Не используй заголовок "Отклик на вакансию" внутри письма.
- Не выдумывай опыт, которого нет в резюме.
- Не пересказывай вакансию.
- Не пересказывай резюме. Достаточно 1-2 самых релевантных совпадений.
- Пиши просто и коротко.
- Если технология из вакансии похожа на уже использованные инструменты кандидата, говори про близкий опыт, а не про отсутствие опыта.
- Для Ant Design, Tailwind CSS, React Admin, Material UI, Bootstrap, shadcn/ui и похожих UI/CSS-инструментов не пиши "не использовал", если у кандидата есть опыт React, TypeScript, Material UI, сложных интерфейсов, форм, таблиц или админок.
- В JSON-строке используй переносы строк как \\n.
- Между абзацами используй двойной перенос строки \\n\\n.
- Не возвращай письмо одной строкой.

Верни строго JSON без markdown.
{
  "cover_letter": string
}
`.trim();

const normalizeCoverLetter = (value: string): string =>
  value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const extractJsonObject = (content: string): string => {
  const match = content.match(/\{[\s\S]*\}/);

  if (!match) {
    throw new Error("Модель не вернула JSON в ожидаемом формате");
  }

  return match[0];
};

const parseFitAnalysis = (content: string): VacancyFitAnalysis => {
  const parsed = JSON.parse(extractJsonObject(content)) as VacancyFitAnalysis;

  if (
    typeof parsed.match_percent !== "number" ||
    (parsed.decision !== "yes" && parsed.decision !== "no") ||
    typeof parsed.reason !== "string" ||
    typeof parsed.salary_estimate !== "string"
  ) {
    throw new Error("Модель вернула неполный анализ совместимости вакансии");
  }

  return parsed;
};

const parseCoverLetter = (content: string): VacancyCoverLetter => {
  const parsed = JSON.parse(extractJsonObject(content)) as VacancyCoverLetter;

  if (typeof parsed.cover_letter !== "string") {
    throw new Error("Модель не вернула сопроводительное письмо");
  }

  return {
    cover_letter: normalizeCoverLetter(parsed.cover_letter),
  };
};

const ensureApiKey = (): void => {
  if (!env.groqApiKey) {
    throw new Error("Не задан GROQ_API_KEY. Без него нельзя выполнить запрос к нейросети");
  }
};

export const analyzeVacancyFit = async (
  rawVacancyText: string,
): Promise<VacancyFitAnalysis> => {
  ensureApiKey();

  try {
    const profile = await getCandidateProfile();
    const candidateResume = formatCandidateProfileForPrompt(profile);
    const completion = await client.chat.completions.create({
      model: env.groqModel,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "Return only valid JSON.",
        },
        {
          role: "user",
          content: buildFitPrompt(rawVacancyText, candidateResume),
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("Модель вернула пустой ответ при анализе совместимости вакансии");
    }

    return parseFitAnalysis(content);
  } catch (error) {
    logger.error("Vacancy fit analysis failed", error);
    throw error;
  }
};

export const generateVacancyCoverLetter = async (
  rawVacancyText: string,
  fitAnalysis: VacancyFitAnalysis,
): Promise<VacancyCoverLetter> => {
  ensureApiKey();

  try {
    const profile = await getCandidateProfile();
    const candidateResume = formatCandidateProfileForPrompt(profile);
    const completion = await client.chat.completions.create({
      model: env.groqModel,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: "Return only valid JSON.",
        },
        {
          role: "user",
          content: buildCoverLetterPrompt(
            rawVacancyText,
            candidateResume,
            profile.coverLetterInstructions,
            fitAnalysis,
          ),
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("Модель вернула пустой ответ при создании сопроводительного письма");
    }

    return parseCoverLetter(content);
  } catch (error) {
    logger.error("Vacancy cover letter generation failed", error);
    throw error;
  }
};
