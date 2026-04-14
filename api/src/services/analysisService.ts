import OpenAI from "openai";
import { VacancyAnalysis, VacancyDetails } from "../types";
import { env } from "../utils/env";
import { logger } from "../utils/logger";

const client = new OpenAI({
  apiKey: env.groqApiKey,
  baseURL: env.groqBaseUrl,
});

const candidateResume = `
Андрей, Middle Frontend-разработчик.

Кратко:
- Опыт работы в enterprise- и продуктовых командах.
- Развитие и поддержка SPA и микрофронтов.
- Участие в архитектурных решениях, рефакторинге legacy-кода и сопровождении релизов.
- Основной стек: React, TypeScript, JavaScript, Redux Toolkit, RTK Query, Webpack, Vite, Jest.
`.trim();

const coverLetterTemplate = `
Добрый день!

Меня зовут Андрей, я Middle Frontend-разработчик с опытом работы в enterprise- и продуктовых командах. Мой основной стек React и TypeScript.

Буду рад применить свой опыт для решения задач вашей команды и развития продукта.

Спасибо за внимание,
Андрей
Telegram: @gganeev_andrey
`.trim();

const buildAnalysisPrompt = (vacancy: VacancyDetails): string => `
Ты HR-ассистент и карьерный консультант для frontend-разработчика.

Контекст кандидата:
${candidateResume}

Шаблон сопроводительного письма:
${coverLetterTemplate}

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
4. Сгенерировать сопроводительное письмо под вакансию.
5. Оценить реалистичную зарплатную вилку или ожидание кандидата.

Верни строго JSON без markdown.
{
  "match_percent": number,
  "decision": "yes" | "no",
  "reason": string,
  "salary_estimate": string,
  "cover_letter": string
}
`.trim();

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

  return parsed;
};

export const analyzeVacancy = async (
  vacancy: VacancyDetails,
): Promise<VacancyAnalysis> => {
  if (!env.groqApiKey) {
    throw new Error("GROQ_API_KEY is required for analysis");
  }

  try {
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
          content: buildAnalysisPrompt(vacancy),
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
