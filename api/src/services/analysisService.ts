import OpenAI from "openai";
import {
  formatCandidateProfileForPrompt,
  getCandidateProfile,
} from "../storage/profileRepository";
import {
  CompanyProfileAnalysis,
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
  companyContext: string,
): string => `
Ты помогаешь frontend-разработчику написать короткое человеческое сопроводительное письмо для отклика.

Контекст кандидата:
${candidateResume}

Формат и личные правила письма:
${coverLetterInstructions}

Контекст компании:
${companyContext}

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
- Основная причина отклика должна быть связана с компанией и тем, чем она зацепила.
- Второй акцент должен быть на задачах из вакансии, которые похожи на опыт и интересы кандидата.
- Затем коротко подкрепи письмо 1-2 совпадениями по опыту.
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

const buildCompanyExtractionPrompt = (rawCompanyText: string): string => `
You extract structured company data from raw company description text.

Rules:
- Return only valid JSON.
- Preserve the language of the source text for human-readable fields.
- Do not invent facts that are not supported by the text.
- "highlights" must be an array with 2-6 concise points.
- Use null for unknown scalar fields.
- "summary" must be a short text in 2-4 sentences for a cover letter context.

Raw company text:
${rawCompanyText}

Return this JSON shape:
{
  "name": "string",
  "domain": "string | null",
  "product_type": "string | null",
  "short_pitch": "string | null",
  "highlights": ["string"],
  "tech_level": "string | null",
  "summary": "string | null"
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

const parseCompanyProfile = (content: string): CompanyProfileAnalysis => {
  const parsed = JSON.parse(extractJsonObject(content)) as CompanyProfileAnalysis;

  if (typeof parsed.name !== "string" || !parsed.name.trim()) {
    throw new Error("Модель не вернула название компании");
  }

  return {
    name: parsed.name.trim(),
    domain:
      typeof parsed.domain === "string" && parsed.domain.trim()
        ? parsed.domain.trim()
        : null,
    product_type:
      typeof parsed.product_type === "string" && parsed.product_type.trim()
        ? parsed.product_type.trim()
        : null,
    short_pitch:
      typeof parsed.short_pitch === "string" && parsed.short_pitch.trim()
        ? parsed.short_pitch.trim()
        : null,
    highlights: Array.isArray(parsed.highlights)
      ? parsed.highlights
        .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
        .map((item) => item.trim())
      : [],
    tech_level:
      typeof parsed.tech_level === "string" && parsed.tech_level.trim()
        ? parsed.tech_level.trim()
        : null,
    summary:
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : null,
  };
};

const ensureApiKey = (): void => {
  if (!env.groqApiKey) {
    throw new Error("Не задан GROQ_API_KEY. Без него нельзя выполнить запрос к нейросети");
  }
};

const formatCompanyContext = (
  company: {
    name: string;
    domain: string | null;
    productType: string | null;
    shortPitch: string | null;
    highlights: string[];
    techLevel: string | null;
    summary: string | null;
  } | null,
): string => {
  if (!company) {
    return "Нет отдельного профиля компании. Опирайся на вакансию и не выдумывай детали компании.";
  }

  return [
    `Название: ${company.name}`,
    `Домен: ${company.domain || "-"}`,
    `Тип продукта: ${company.productType || "-"}`,
    `Кратко: ${company.shortPitch || "-"}`,
    `Что цепляет: ${company.highlights.length > 0 ? company.highlights.join(", ") : "-"}`,
    `Технологический уровень: ${company.techLevel || "-"}`,
    `Короткий обзор для письма: ${company.summary || "-"}`,
  ].join("\n");
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
  company: {
    name: string;
    domain: string | null;
    productType: string | null;
    shortPitch: string | null;
    highlights: string[];
    techLevel: string | null;
    summary: string | null;
  } | null,
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
            formatCompanyContext(company),
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

export const extractCompanyProfile = async (
  rawCompanyText: string,
): Promise<CompanyProfileAnalysis> => {
  ensureApiKey();

  try {
    const completion = await client.chat.completions.create({
      model: env.groqModel,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: "Return only valid JSON.",
        },
        {
          role: "user",
          content: buildCompanyExtractionPrompt(rawCompanyText),
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("Модель вернула пустой ответ при разборе компании");
    }

    return parseCompanyProfile(content);
  } catch (error) {
    logger.error("Company extraction failed", error);
    throw error;
  }
};
