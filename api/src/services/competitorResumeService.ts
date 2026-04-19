import { randomUUID } from "crypto";
import OpenAI from "openai";
import {
  createCompetitorResumeRecord,
  hasCompetitorResumeWithHhId,
} from "../storage/competitorResumeRepository";
import {
  formatCandidateProfileForPrompt,
  getCandidateProfile,
} from "../storage/profileRepository";
import {
  CompetitorResumeAnalysis,
  CompetitorResumeRecord,
  CreateCompetitorResumeInput,
} from "../types/competitorResume";
import { env } from "../utils/env";
import { logger } from "../utils/logger";

const client = new OpenAI({
  apiKey: env.groqApiKey,
  baseURL: env.groqBaseUrl,
});

export class CompetitorResumeDuplicateHhIdError extends Error {
  constructor(readonly hhId: string) {
    super(`Резюме с hh id ${hhId} уже есть в базе`);
    this.name = "CompetitorResumeDuplicateHhIdError";
  }
}

const normalizeString = (value: unknown, fallback = "Не указано"): string =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const normalizeNullableString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const normalizeGender = (value: unknown): "male" | "female" | "unknown" =>
  value === "male" || value === "female" ? value : "unknown";

const normalizeNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : null;

const normalizeScore = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : 50;

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
};

const buildCompetitorResumePrompt = (
  rawText: string,
  myProfile: string,
  hasPhoto: boolean,
): string => `
Ты карьерный аналитик для frontend-разработчика.

Нужно разобрать резюме конкурента и сравнить его с моим профилем.

Мой профиль:
${myProfile}

Есть фото в резюме конкурента: ${hasPhoto ? "да" : "нет"}

Текст резюме конкурента:
${rawText}

Правила:
- Верни только валидный JSON.
- Не выдумывай опыт, технологии, зарплату или образование.
- Если пол кандидата явно понятен из резюме, верни gender: "male" или "female". Если пол нельзя надежно определить, верни "unknown".
- Если возраст кандидата явно указан в резюме, верни его в age_years. Если возраст нельзя надежно определить, верни null.
- Если общий опыт, релевантный опыт или нерелевантный опыт нельзя надежно определить, верни null.
- Релевантный опыт - опыт, полезный для frontend/React/TypeScript/веб-разработки.
- Нерелевантный опыт - опыт вне целевой профессии или не влияющий на frontend-позиции.
- comparison_score от 0 до 100: насколько резюме конкурента сильнее моего профиля на рынке frontend-вакансий.
- is_better_than_mine = true только если резюме конкурента заметно сильнее моего по релевантному опыту, стеку, грейду, результатам или презентации.
- Фото может быть плюсом для оформления, но не должно перевешивать опыт и навыки.

Верни JSON строго такой формы:
{
  "title": "string",
  "gender": "male | female | unknown",
  "age_years": number | null,
  "total_experience_months": number | null,
  "relevant_experience_months": number | null,
  "irrelevant_experience_months": number | null,
  "relevant_experience_summary": "string",
  "salary_expectation": "string | null",
  "key_skills": ["string"],
  "strengths": ["string"],
  "weaknesses": ["string"],
  "is_better_than_mine": boolean,
  "comparison_score": number,
  "comparison_reason": "string"
}
`.trim();

const parseCompetitorResumeAnalysis = (
  content: string,
): CompetitorResumeAnalysis => {
  const match = content.match(/\{[\s\S]*\}/);

  if (!match) {
    throw new Error("Модель не вернула анализ резюме в ожидаемом формате");
  }

  const parsed = JSON.parse(match[0]) as Record<string, unknown>;

  return {
    title: normalizeString(parsed.title),
    gender: normalizeGender(parsed.gender),
    ageYears: normalizeNumber(parsed.age_years),
    totalExperienceMonths: normalizeNumber(parsed.total_experience_months),
    relevantExperienceMonths: normalizeNumber(parsed.relevant_experience_months),
    irrelevantExperienceMonths: normalizeNumber(parsed.irrelevant_experience_months),
    relevantExperienceSummary: normalizeString(
      parsed.relevant_experience_summary,
      "Релевантный опыт не найден",
    ),
    salaryExpectation: normalizeNullableString(parsed.salary_expectation),
    keySkills: normalizeStringArray(parsed.key_skills),
    strengths: normalizeStringArray(parsed.strengths),
    weaknesses: normalizeStringArray(parsed.weaknesses),
    isBetterThanMine: Boolean(parsed.is_better_than_mine),
    comparisonScore: normalizeScore(parsed.comparison_score),
    comparisonReason: normalizeString(parsed.comparison_reason),
  };
};

const buildHhResumeUrl = (hhId?: string): string | null => {
  const normalized = hhId?.trim();
  return normalized ? `https://hh.ru/resume/${normalized}` : null;
};

export const createCompetitorResume = async (
  input: CreateCompetitorResumeInput,
): Promise<CompetitorResumeRecord> => {
  const hhId = input.hhId?.trim();

  if (hhId && await hasCompetitorResumeWithHhId(hhId)) {
    throw new CompetitorResumeDuplicateHhIdError(hhId);
  }

  if (!env.groqApiKey) {
    throw new Error("Не задан GROQ_API_KEY. Без него нельзя проанализировать резюме");
  }

  try {
    const profile = await getCandidateProfile();
    const myProfile = formatCandidateProfileForPrompt(profile);
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
          content: buildCompetitorResumePrompt(
            input.rawText,
            myProfile,
            input.hasPhoto,
          ),
        },
      ],
      response_format: { type: "json_object" },
    });
    const content = completion.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("Модель вернула пустой ответ при анализе резюме");
    }

    const analysis = parseCompetitorResumeAnalysis(content);
    const now = new Date().toISOString();
    const record: CompetitorResumeRecord = {
      id: randomUUID(),
      hhId: hhId || null,
      url: buildHhResumeUrl(hhId),
      rawText: input.rawText,
      hasPhoto: input.hasPhoto,
      ...analysis,
      createdAt: now,
      updatedAt: now,
    };

    await createCompetitorResumeRecord(record);
    return record;
  } catch (error) {
    logger.error("Competitor resume analysis failed", error);
    throw error;
  }
};
