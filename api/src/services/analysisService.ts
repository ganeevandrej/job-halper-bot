import OpenAI from "openai";
import {
  formatCandidateProfileForPrompt,
  getCandidateProfile,
} from "../storage/profileRepository";
import { VacancyAnalysis, VacancyDetails } from "../types";
import { env } from "../utils/env";
import { logger } from "../utils/logger";

const client = new OpenAI({
  apiKey: env.groqApiKey,
  baseURL: env.groqBaseUrl,
});

const buildAnalysisPrompt = (
  vacancy: VacancyDetails,
  candidateResume: string,
  coverLetterInstructions: string,
): string => `
Ты HR-ассистент и карьерный консультант для frontend-разработчика.

Контекст кандидата:
${candidateResume}

Формат cover_letter:
${coverLetterInstructions}

Данные вакансии:
- Название: ${vacancy.title}
- Компания: ${vacancy.company}
- Зарплата: ${vacancy.salary}
- Описание:
${vacancy.description}

Нужно:
1. Оценить соответствие кандидата вакансии в процентах от 0 до 100.
2. Принять решение, стоит ли откликаться.
3. Кратко объяснить решение.
4. Сгенерировать короткое человеческое сообщение для отклика.
5. Оценить реалистичную зарплатную вилку или ожидание кандидата.

Требования к cover_letter:
- Не используй заголовок "Отклик на вакансию" внутри cover_letter.
- Не используй формулировки "зацепили", "новые фичи", "доработка существующего функционала", если таких слов нет в вакансии.
- Не выдумывай опыт, которого нет в резюме.
- Не пересказывай вакансию.
- Не пересказывай резюме. Нельзя перечислять несколько проектов подряд, если достаточно одного самого релевантного.
- Не пиши длинные фразы вида "в предыдущем опыте работы над..." и "я также работал над...". Пиши проще и короче.
- Если технология из вакансии похожа на уже использованные инструменты кандидата, говори про близкий опыт, а не про отсутствие опыта.
- Для Ant Design, Tailwind CSS, React Admin, Material UI, Bootstrap, shadcn/ui и похожих UI/CSS-инструментов не пиши "не использовал", если у кандидата есть опыт React, TypeScript, Material UI, сложных интерфейсов, форм, таблиц или админок.
- Хорошие естественные формулировки: "откликнулся, потому что по описанию задачи близки к тому, чем уже занимался", "похоже на мой опыт с React и TypeScript", "задачи с формами, таблицами и интеграцией API хорошо знакомы".
- Плохие формулировки: "близки задачи и стек технологий", "в своем предыдущем опыте работы над финтех-платформой", "я также работал над внутренним SPA-продуктом".
- В JSON-строке используй переносы строк как \\n.
- Между абзацами в cover_letter используй двойной перенос строки \\n\\n, чтобы после JSON.parse письмо читалось отдельными блоками.
- Не возвращай письмо одной строкой.

Верни строго JSON без markdown.
{
  "match_percent": number,
  "decision": "yes" | "no",
  "reason": string,
  "salary_estimate": string,
  "cover_letter": string
}
`.trim();

const normalizeCoverLetter = (value: string): string =>
  value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const parseAnalysis = (content: string): VacancyAnalysis => {
  const match = content.match(/\{[\s\S]*\}/);

  if (!match) {
    throw new Error("LLM returned no JSON payload");
  }

  const parsed = JSON.parse(match[0]) as VacancyAnalysis;

  if (
    typeof parsed.match_percent !== "number" ||
    (parsed.decision !== "yes" && parsed.decision !== "no") ||
    typeof parsed.reason !== "string" ||
    typeof parsed.salary_estimate !== "string" ||
    typeof parsed.cover_letter !== "string"
  ) {
    throw new Error("LLM returned invalid analysis schema");
  }

  return {
    ...parsed,
    cover_letter: normalizeCoverLetter(parsed.cover_letter),
  };
};

export const analyzeVacancy = async (
  vacancy: VacancyDetails,
): Promise<VacancyAnalysis> => {
  if (!env.groqApiKey) {
    throw new Error("GROQ_API_KEY is required for analysis");
  }

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
          content: buildAnalysisPrompt(
            vacancy,
            candidateResume,
            profile.coverLetterInstructions,
          ),
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("LLM returned empty response");
    }

    return parseAnalysis(content);
  } catch (error) {
    logger.error("Vacancy analysis failed", error);
    throw error;
  }
};
