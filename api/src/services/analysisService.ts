import OpenAI from "openai";
import { CoverLetterFocus, VacancyAnalysis, VacancyDetails } from "../types";
import { env } from "../utils/env";
import { logger } from "../utils/logger";

const client = new OpenAI({
  apiKey: env.groqApiKey,
  baseURL: env.groqBaseUrl,
});

const candidateResume = `
Frontend-разработчик (React / TypeScript)

Опыт работы: 1 год 10 месяцев

Stealth Startup
Frontend / Fullstack Developer
Ноябрь 2025 - сейчас (6 месяцев)

Контекст проекта:
Telegram-продукт с mini-app и ботом. Участвую в развитии mini-app на Next.js, интеграции с Telegram WebApp, общей архитектуры monorepo и data-layer на Prisma/MySQL.

Что делал:
- Разрабатывал интерфейсы Telegram Mini App на Next.js и TypeScript.
- Настроил получение данных пользователя через Telegram WebApp и связал фронт с бэкендом через Next.js API Routes.
- Работал с базой данных через Prisma: писал запросы, участвовал в создании схемы данных.
- Поддерживал CI-проверки GitHub Actions и сборку Docker-образов.
- Работал в монорепозитории с Turbo Repo.

Стек: Next.js, React, TypeScript, Telegram WebApp, Prisma, MySQL, Turbo, Docker, GitHub Actions.

ЛАНИТ
Frontend-разработчик
Июль 2024 - Октябрь 2025 (1 год и 4 месяца)

Проект 1: Финтех-платформа СберБанка

Контекст проекта:
Внутренняя финтех-платформа для автоматизации бизнес-процессов СберБанка.

Что делал:
- Разрабатывал модули микрофронтов на React и TypeScript с Module Federation.
- Интегрировал фронт с бэкендом через REST API: RTK Query, OpenAPI.
- Участвовал в релизах, code review и писал unit-тесты на Jest.

Стек: React, TypeScript, Redux Toolkit, RTK Query, Module Federation, Webpack, Jest.

Проект 2: Внутренний SPA-продукт LANIT

Контекст проекта:
Внутреннее SPA-приложение для автоматизации бизнес-процессов компании.

Что делал:
- Реализовывал сложные динамические формы с валидацией на React Hook Form и Yup.
- Провел миграцию сборки проекта с Webpack на Vite.
- Внедрил TypeScript, ESLint и unit-тестирование в команде.
- Рефакторил legacy-код и перевел UI-архитектуру на Atomic Design.

Стек: React, TypeScript, Redux Toolkit, RTK Query, React Hook Form, Yup, Jest, Material UI, Vite.

Навыки:
HTML5, React, TypeScript, Redux Toolkit, RTK Query, React Hook Form, Git, REST API, JavaScript, Next.js, Webpack, Module Federation, Vite, ESLint, Jest, Docker, CSS Modules, Node.js.

Образование:
Московский политехнический университет, Москва
Информационные системы и технологии
2024, бакалавр

О себе:
Frontend-разработчик с опытом 2 года. Специализируюсь на React, Next.js и TypeScript. Работал над финтех-продуктами и Telegram Mini Apps.

Если вам нужен стабильный разработчик, который берет ответственность и доводит задачи до результата, давайте знакомиться.
`.trim();

const coverLetterTemplate = `
Добрый день!

Меня зовут Андрей, я фронтенд-разработчик с опытом около 2 лет.

Увидел вашу вакансию - заинтересовало то, что близко моему опыту, хотел бы узнать о проекте больше.

По стеку вижу совпадение: React и TypeScript использую регулярно, а с релевантными инструментами из вакансии уже работал в проектах.

Буду рад пообщаться и подробнее рассказать про опыт.

Мои контакты:
Telegram: @gganeev_andrey
Телефон: 89325391123
`.trim();

const coverLetterFocusInstructions: Record<CoverLetterFocus, string> = {
  tasks: "Коротко укажи факт: понравились задачи.",
  product: "Коротко укажи факт: понравился продукт или компания.",
  domain: "Коротко укажи факт: понравилась сфера деятельности.",
  stack: "Коротко укажи факт: понравилось совпадение по стеку.",
  experience: "Коротко укажи факт: опыт показался близким к задачам вакансии.",
  short: "Сделай письмо максимально коротким, без деталей и пояснений.",
};

const buildAnalysisPrompt = (
  vacancy: VacancyDetails,
  coverLetterFocuses: CoverLetterFocus[],
): string => {
  const selectedFocuses: CoverLetterFocus[] =
    coverLetterFocuses.length > 0 ? coverLetterFocuses : ["tasks"];
  const focusInstructions = selectedFocuses
    .map((focus) => `- ${focus}: ${coverLetterFocusInstructions[focus]}`)
    .join("\n");

  return `
Ты HR-ассистент и карьерный консультант для frontend-разработчика.

Контекст кандидата:
${candidateResume}

Шаблон сопроводительного письма:
${coverLetterTemplate}

Выбранные акценты сопроводительного письма: ${selectedFocuses.join(", ")}.
Инструкции по акцентам:
${focusInstructions}

Формат cover_letter:
Добрый день!

Меня зовут Андрей, я фронтенд-разработчик с опытом около 2 лет.

Увидел вашу вакансию - [одно короткое предложение с причиной интереса], хотел бы узнать о проекте больше.

По стеку вижу совпадение: [одно-два коротких предложения про сильные совпадения].

Буду рад пообщаться и подробнее рассказать про опыт.

Мои контакты:
Telegram: @gganeev_andrey
Телефон: 89325391123

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
4. Сгенерировать сопроводительное письмо под вакансию на основе шаблона.
5. Оценить реалистичную зарплатную вилку или ожидание кандидата.

Требования к cover_letter:
- Сохрани структуру шаблона сопроводительного письма: приветствие, короткое представление, интерес к вакансии, совпадение по стеку, предложение пообщаться, контакты.
- Строго сохрани пустую строку между абзацами.
- Контакты всегда пиши отдельными строками: строка "Мои контакты:", строка "Telegram: @gganeev_andrey", строка "Телефон: 89325391123".
- Не копируй варианты через слэш из шаблона. Выбери один естественный вариант по выбранным тегам и данным вакансии.
- Предложение "Увидел вашу вакансию..." не должно быть пустым. После тире напиши только короткий факт интереса без подробностей: "понравились задачи", "понравился продукт", "понравилась сфера", "понравилось совпадение по стеку", "описание показалось близким моему опыту".
- Не расписывай, какие конкретно задачи, продуктовые детали или особенности компании понравились.
- Блок про стек пиши обычным текстом, без списков и без категорий "в работе ежедневно", "были конкретные задачи", "работал косвенно".
- В блоке про стек упомяни 2-4 самых сильных совпадения с вакансией. Не перечисляй слабые совпадения вроде Git, если есть более релевантные технологии.
- Если выбран тег stack, блок про стек можно сделать на 2 предложения; иначе оставь его коротким.
- Не используй формулировки "зацепили", "новые фичи", "доработка существующего функционала", если таких слов нет в вакансии.
- В JSON-строке используй переносы строк как \\n, чтобы после JSON.parse письмо отображалось в несколько строк.
- Не возвращай письмо одной строкой.
- Не добавляй markdown, списки и лишние пояснения в cover_letter.
- Пиши естественно, без канцелярита и без фразы "сделай акцент".

Верни строго JSON без markdown.
{
  "match_percent": number,
  "decision": "yes" | "no",
  "reason": string,
  "salary_estimate": string,
  "cover_letter": string
}
`.trim();
};

const normalizeCoverLetter = (value: string): string =>
  value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/Добрый день!\s*Меня зовут/g, "Добрый день!\n\nМеня зовут")
    .replace(/\.\s*Увидел вашу вакансию/g, ".\n\nУвидел вашу вакансию")
    .replace(/\.\s*По стеку/g, ".\n\nПо стеку")
    .replace(/\.\s*Буду рад/g, ".\n\nБуду рад")
    .replace(/\.\s*Мои контакты:/g, ".\n\nМои контакты:")
    .replace(/Мои контакты:\s*Telegram:/g, "Мои контакты:\nTelegram:")
    .replace(/(Telegram:\s*@?gganeev_andrey),?\s*Телефон:/g, "$1\nТелефон:")
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
  coverLetterFocuses: CoverLetterFocus[] = ["tasks"],
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
          content: buildAnalysisPrompt(vacancy, coverLetterFocuses),
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
