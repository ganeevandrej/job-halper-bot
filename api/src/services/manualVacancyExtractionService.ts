import OpenAI from "openai";
import { ManualVacancyParsedFields } from "../types/manualVacancy";
import { env } from "../utils/env";
import { logger } from "../utils/logger";

const client = new OpenAI({
  apiKey: env.groqApiKey,
  baseURL: env.groqBaseUrl,
});

const UNKNOWN_VALUE = "Unknown";

const asString = (value: unknown): string =>
  typeof value === "string" && value.trim() ? value.trim() : UNKNOWN_VALUE;

const asNullableString = (value: unknown): string | null => {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const normalized = value.trim();
  return normalized.toLowerCase() === "unknown" ? null : normalized;
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
};

const asFormats = (formats: unknown, legacyFormat: unknown): string[] => {
  const parsedFormats = asStringArray(formats);

  if (parsedFormats.length > 0) {
    return parsedFormats;
  }

  const parsedLegacyFormat = asString(legacyFormat);
  return parsedLegacyFormat === UNKNOWN_VALUE ? [] : [parsedLegacyFormat];
};

const buildExtractionPrompt = (
  rawText: string,
  salaryOverride?: string,
): string => `
You extract structured vacancy data from raw vacancy text.

Rules:
- Return only valid JSON.
- Preserve the language of the source text for human-readable fields.
- If a field is missing, use "Unknown".
- Keep arrays concise: 3-8 strongest items.
- Do not invent technologies, requirements, tasks, company names, or stated salary.
- "salary" must contain only explicitly stated salary from the raw text or salary override. If salary is not explicitly stated, return null.
- "estimated_salary" is a separate approximate salary range inferred from facts: grade, stack, responsibilities, location, format, and market level. Return null if there are not enough facts for a defensible estimate.
- Prefer the salary override for "salary" when it is provided.
- "formats" is an array. Include every explicit work format mentioned in the text.
- Allowed format values: "remote", "office", "hybrid", "relocation", "unknown".
- Use ["unknown"] for formats only when there are no reliable format signals.
- Determine "grade" from explicit level words, years of experience, responsibility, autonomy, architecture, mentoring, and leadership signals.
- Grade rules:
  - "junior": trainee/junior/intern, 0-1 year, supervised tasks.
  - "junior_plus": 1-2 years, mostly implementation tasks, limited autonomy.
  - "middle": 2-4 years, independent feature work, React/TypeScript production experience, no strong architecture or mentoring requirement.
  - "middle_plus": 3-5 years, ownership of modules/features, performance, complex product work, architecture at module level.
  - "senior": 5+ years, architecture, system design, technical decisions, mentoring, cross-team ownership.
  - "lead": people leadership, technical roadmap, team management, hiring, strategy.
  - "unknown": not enough reliable signals. Do not guess from a generic title like "Frontend developer".

Salary override:
${salaryOverride?.trim() || "Not provided"}

Raw vacancy text:
${rawText}

Return this JSON shape:
{
  "title": "string",
  "company": "string",
  "salary": "string | null",
  "estimated_salary": "string | null",
  "formats": ["remote | office | hybrid | relocation | unknown"],
  "location": "string",
  "grade": "junior | junior_plus | middle | middle_plus | senior | lead | unknown",
  "stack": ["string"],
  "tasks": ["string"],
  "requirements": ["string"],
  "nice_to_have": ["string"],
  "red_flags": ["string"],
  "summary": "string"
}
`.trim();

const parseExtraction = (content: string): ManualVacancyParsedFields => {
  const match = content.match(/\{[\s\S]*\}/);

  if (!match) {
    throw new Error("Модель не вернула данные вакансии в ожидаемом формате");
  }

  const parsed = JSON.parse(match[0]) as Record<string, unknown>;

  return {
    title: asString(parsed.title),
    company: asString(parsed.company),
    salary: asNullableString(parsed.salary),
    estimatedSalary: asNullableString(parsed.estimated_salary),
    formats: asFormats(parsed.formats, parsed.format),
    location: asString(parsed.location),
    grade: asString(parsed.grade),
    stack: asStringArray(parsed.stack),
    tasks: asStringArray(parsed.tasks),
    requirements: asStringArray(parsed.requirements),
    niceToHave: asStringArray(parsed.nice_to_have),
    redFlags: asStringArray(parsed.red_flags),
    summary: asString(parsed.summary),
  };
};

export const extractManualVacancyFields = async (
  rawText: string,
  salaryOverride?: string,
): Promise<ManualVacancyParsedFields> => {
  if (!env.groqApiKey) {
    throw new Error("Не задан GROQ_API_KEY. Без него нельзя разобрать вакансию");
  }

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
          content: buildExtractionPrompt(rawText, salaryOverride),
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("Модель вернула пустой ответ при разборе вакансии");
    }

    const parsed = parseExtraction(content);

    return {
      ...parsed,
      salary: salaryOverride?.trim() || parsed.salary,
    };
  } catch (error) {
    logger.error("Manual vacancy extraction failed", error);
    throw error;
  }
};
