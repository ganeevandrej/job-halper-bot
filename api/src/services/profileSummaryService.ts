import OpenAI from "openai";
import {
  formatCandidateProfileFullForPrompt,
  markCandidateProfileSummaryFailed,
  updateCandidateProfile,
  updateCandidateProfileSummary,
} from "../storage/profileRepository";
import {
  CandidateProfile,
  CandidateResumeStructuredSummary,
  UpdateCandidateProfileInput,
} from "../types/profile";
import { env } from "../utils/env";
import { logger } from "../utils/logger";

const client = new OpenAI({
  apiKey: env.groqApiKey,
  baseURL: env.groqBaseUrl,
});

const buildResumeSummaryPrompt = (candidateResume: string): string => `
Ты карьерный аналитик и редактор резюме. Сделай из полного резюме короткую, но читаемую версию, которую можно показать пользователю и использовать для матчинга с вакансиями.

Полное резюме:
${candidateResume}

Главное требование к summary_text:
- Это должен быть готовый краткий вариант резюме, а не сухая JSON-карточка.
- Пиши по-русски.
- Сохраняй переносы строк как \\n.
- Используй факты из резюме. Не выдумывай компании, проекты, сроки, зарплату, навыки, образование или языки.
- Если зарплата, формат работы или срок опыта не указаны явно, напиши "не указано" или приблизь только когда это надежно следует из текста.
- Длина summary_text: примерно 1800-3500 символов. Можно короче, если фактов мало.
- Не используй markdown-таблицы.
- Не добавляй контакты.

Желаемый стиль summary_text:

📌 PROFILE

Frontend Developer (React / Next.js / TypeScript)
Опыт: ~4 года
Формат: удалёнка / гибрид
Зарплата: 160k

🧠 SUMMARY

2-4 короткие строки: кто кандидат, основная специализация, домены, fullstack/backend опыт если есть.

💼 EXPERIENCE

Компания / проект (срок)
Роль

Ключевой контекст проекта
Ключевые задачи без длинных предложений
Технологии и результат, если это есть в резюме

🛠 SKILLS

Frontend:
React, Next.js, TypeScript

Forms & UI:
React Hook Form, Yup, Material UI

Architecture & Tools:
Module Federation, Webpack, Vite

Backend / Fullstack:
Node.js, Express.js, Prisma, REST API

DB:
PostgreSQL, MySQL

DevOps & Quality:
Docker, GitHub Actions, Jest, ESLint

🎓 EDUCATION

Коротко по образованию.

💬 EXTRA

1-2 строки про сильные стороны, только если это следует из резюме.

Правила для structured:
- structured нужен для машинного анализа.
- skills, domains, strengths и languages должны быть массивами строк без дублей.
- experience_years верни числом, если можно надежно определить, иначе null.
- level верни строкой, если можно надежно определить, иначе null.

Верни только валидный JSON без markdown:
{
  "summary_text": "string",
  "structured": {
    "title": "string",
    "level": "string | null",
    "summary": "string",
    "skills": ["string"],
    "experience_years": number | null,
    "domains": ["string"],
    "strengths": ["string"],
    "education": "string | null",
    "languages": ["string"]
  }
}
`.trim();

const extractJsonObject = (content: string): string => {
  const match = content.match(/\{[\s\S]*\}/);

  if (!match) {
    throw new Error("Model did not return JSON for resume summary");
  }

  return match[0];
};

const normalizeString = (value: unknown, fallback = ""): string =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const normalizeNullableString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
};

const normalizeNullableNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.round(value * 10) / 10)
    : null;

const parseResumeSummary = (
  content: string,
): {
  summaryText: string;
  structured: CandidateResumeStructuredSummary;
} => {
  const parsed = JSON.parse(extractJsonObject(content)) as Record<string, unknown>;
  const structuredSource =
    parsed.structured && typeof parsed.structured === "object"
      ? (parsed.structured as Record<string, unknown>)
      : {};

  const structured: CandidateResumeStructuredSummary = {
    title: normalizeString(structuredSource.title, "Candidate"),
    level: normalizeNullableString(structuredSource.level),
    summary: normalizeString(structuredSource.summary),
    skills: normalizeStringArray(structuredSource.skills),
    experienceYears: normalizeNullableNumber(structuredSource.experience_years),
    domains: normalizeStringArray(structuredSource.domains),
    strengths: normalizeStringArray(structuredSource.strengths),
    education: normalizeNullableString(structuredSource.education),
    languages: normalizeStringArray(structuredSource.languages),
  };

  const summaryText = normalizeString(parsed.summary_text, structured.summary);

  if (!summaryText) {
    throw new Error("Model returned empty resume summary");
  }

  return {
    summaryText,
    structured: {
      ...structured,
      summary: structured.summary || summaryText,
    },
  };
};

const summarizeCandidateProfile = async (
  profile: CandidateProfile,
): Promise<{
  summaryText: string;
  structured: CandidateResumeStructuredSummary;
}> => {
  if (!env.groqApiKey) {
    throw new Error("GROQ_API_KEY is not set. Profile was saved, but resume summary was not generated");
  }

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
        content: buildResumeSummaryPrompt(
          formatCandidateProfileFullForPrompt(profile),
        ),
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("Model returned an empty response for resume summary");
  }

  return parseResumeSummary(content);
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Unknown resume summary error";

export const updateCandidateProfileWithSummary = async (
  input: UpdateCandidateProfileInput,
): Promise<CandidateProfile> => {
  const savedProfile = await updateCandidateProfile(input);

  try {
    const summary = await summarizeCandidateProfile(savedProfile);
    return updateCandidateProfileSummary(summary.summaryText, summary.structured);
  } catch (error) {
    logger.error("Candidate profile summary failed", error);
    return markCandidateProfileSummaryFailed(getErrorMessage(error));
  }
};
