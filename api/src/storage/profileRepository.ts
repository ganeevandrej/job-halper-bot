import {
  CandidateProfile,
  CandidateResumeStructuredSummary,
  ResumeProcessingStatus,
  UpdateCandidateProfileInput,
} from "../types/profile";
import { getProfileDatabase, persistProfileDatabase } from "./profileDatabase";

const PROFILE_ID = "default";

const DEFAULT_COVER_LETTER_INSTRUCTIONS = `
Сгенерируй сообщение в стиле личного отклика.
Оно должно звучать как текст, который кандидат сам написал работодателю: спокойно, живо, немного разговорно, без официального шаблона.

Стиль:
- русский язык
- спокойно, по-человечески, без официального тона
- без канцелярита и HR-штампов
- можно использовать легкий разговорный стиль
- не писать слишком идеально и рекламно
- не использовать markdown, списки, заголовки
- не добавлять контакты
- не преувеличивать опыт
- не пересказывать резюме и не перечислять все места работы
- не писать общую фразу "близки задачи и стек технологий"; вместо этого выбрать один естественный мотив интереса
- отсутствующую технологию упоминать только если это ключевой core-навык вакансии, а не вспомогательная библиотека или UI/CSS-инструмент

Структура:
1. Первая строка: "Добрый день!"
2. Затем коротко: посмотрел вакансию и откликнулся, потому что по описанию она похожа на опыт кандидата / близка по задачам / близка по продуктовой области. Выбери один вариант по фактам вакансии.
3. Затем 1 короткий абзац про самый релевантный опыт кандидата под вакансию: максимум 2-3 технологии или типа задач.
4. Затем 1 короткий абзац про похожие задачи, которые кандидат уже делал: без полного пересказа проектов и без длинных списков.
5. Если в вакансии есть важная технология, которой нет в резюме, упомяни это только если она критична для работы. Не упоминай отсутствие опыта с UI-библиотеками, CSS-фреймворками, админками, дизайн-системами, если у кандидата есть близкий опыт с аналогами.
6. Завершить коротко: "Буду рад пообщаться :)"

Длина:
- 4-6 коротких абзацев
- между абзацами обязательно оставляй одну пустую строку
- без длинного вступления
- без формального "Меня зовут..."
- без блока контактов

Дополнительные ограничения:
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
`.trim();

const DEFAULT_PROFILE: UpdateCandidateProfileInput = {
  title: "Frontend-разработчик (React / TypeScript)",
  salaryExpectation: null,
  formats: ["remote", "hybrid"],
  location: "Москва",
  hasPhoto: false,
  about:
    "Frontend-разработчик с опытом 2 года. Специализируюсь на React, Next.js и TypeScript. Работал над финтех-продуктами и Telegram Mini Apps.",
  skills: [
    "HTML5",
    "React",
    "TypeScript",
    "Redux Toolkit",
    "RTK Query",
    "React Hook Form",
    "Git",
    "REST API",
    "JavaScript",
    "Next.js",
    "Webpack",
    "Module Federation",
    "Vite",
    "ESLint",
    "Jest",
    "Docker",
    "CSS Modules",
    "Node.js",
  ],
  experienceText: `
Stealth Startup
Frontend / Fullstack Developer
Ноябрь 2025 - сейчас (6 месяцев)

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

Финтех-платформа СберБанка и внутренний SPA-продукт для автоматизации бизнес-процессов.

Что делал:
- Разрабатывал модули микрофронтов на React и TypeScript с Module Federation.
- Интегрировал фронт с бэкендом через REST API: RTK Query, OpenAPI.
- Участвовал в релизах, code review и писал unit-тесты на Jest.
- Реализовывал сложные динамические формы с валидацией на React Hook Form и Yup.
- Провел миграцию сборки проекта с Webpack на Vite.
- Внедрил TypeScript, ESLint и unit-тестирование в команде.
- Рефакторил legacy-код и перевел UI-архитектуру на Atomic Design.

Стек: React, TypeScript, Redux Toolkit, RTK Query, React Hook Form, Yup, Jest, Material UI, Vite, Webpack, Module Federation.
`.trim(),
  educationText:
    "Московский политехнический университет, Москва\nИнформационные системы и технологии\n2024, бакалавр",
  coverLetterInstructions: DEFAULT_COVER_LETTER_INSTRUCTIONS,
};

const parseJsonArray = <T>(value: unknown, fallback: T[]): T[] => {
  if (typeof value !== "string") {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
};

const stringifyJson = (value: unknown): string => JSON.stringify(value);

const parseStructuredSummary = (
  value: unknown,
): CandidateResumeStructuredSummary | null => {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as CandidateResumeStructuredSummary;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const parseResumeProcessingStatus = (
  value: unknown,
): ResumeProcessingStatus => {
  return value === "processing" || value === "completed" || value === "failed"
    ? value
    : "idle";
};

const getColumnNames = async (): Promise<Set<string>> => {
  const { db } = await getProfileDatabase();
  const columns = db.exec("PRAGMA table_info(candidate_profile)");
  return new Set((columns[0]?.values ?? []).map((row) => String(row[1])));
};

const formatLegacyExperience = (value: unknown): string => {
  const items = parseJsonArray<Record<string, unknown>>(value, []);

  return items
    .map((item) => {
      const responsibilities = Array.isArray(item.responsibilities)
        ? item.responsibilities.map(String)
        : [];
      const stack = Array.isArray(item.stack) ? item.stack.map(String) : [];

      return [
        String(item.company || ""),
        String(item.position || ""),
        String(item.period || ""),
        "",
        String(item.context || ""),
        "",
        responsibilities.length > 0 ? "Что делал:" : "",
        ...responsibilities.map((responsibility) => `- ${responsibility}`),
        "",
        stack.length > 0 ? `Стек: ${stack.join(", ")}` : "",
      ]
        .filter((line) => line !== "")
        .join("\n");
    })
    .join("\n\n")
    .trim();
};

const formatLegacyEducation = (value: unknown): string => {
  const items = parseJsonArray<Record<string, unknown>>(value, []);

  return items
    .map((item) =>
      [
        item.institution,
        item.faculty,
        item.specialization,
        item.graduationYear,
        item.degree,
      ]
        .filter(Boolean)
        .map(String)
        .join(", "),
    )
    .join("\n")
    .trim();
};

const mapRowToProfile = (row: Record<string, unknown>): CandidateProfile => ({
  id: String(row.id),
  title: String(row.title),
  salaryExpectation:
    typeof row.salary_expectation === "string" && row.salary_expectation
      ? row.salary_expectation
      : null,
  formats: parseJsonArray<string>(row.formats_json, []),
  location:
    typeof row.location === "string" && row.location ? row.location : null,
  hasPhoto: Boolean(row.has_photo),
  about: String(row.about),
  skills: parseJsonArray<string>(row.skills_json, []),
  experienceText:
    typeof row.experience_text === "string"
      ? row.experience_text
      : formatLegacyExperience(row.experience_json),
  educationText:
    typeof row.education_text === "string"
      ? row.education_text
      : formatLegacyEducation(row.education_json),
  coverLetterInstructions: String(row.cover_letter_instructions),
  resumeSummaryText:
    typeof row.resume_summary_text === "string" && row.resume_summary_text
      ? row.resume_summary_text
      : null,
  resumeStructured: parseStructuredSummary(row.resume_structured_json),
  resumeProcessingStatus: parseResumeProcessingStatus(
    row.resume_processing_status,
  ),
  resumeProcessingError:
    typeof row.resume_processing_error === "string" && row.resume_processing_error
      ? row.resume_processing_error
      : null,
  resumeSummaryUpdatedAt:
    typeof row.resume_summary_updated_at === "string" && row.resume_summary_updated_at
      ? row.resume_summary_updated_at
      : null,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

export const createDefaultProfile = async (): Promise<CandidateProfile> => {
  const { db } = await getProfileDatabase();
  const now = new Date().toISOString();

  db.run(
    `
      INSERT INTO candidate_profile (
        id, title, salary_expectation, formats_json, location, has_photo,
        about, skills_json, experience_json, education_json,
        experience_text, education_text,
        cover_letter_instructions, resume_processing_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      PROFILE_ID,
      DEFAULT_PROFILE.title,
      DEFAULT_PROFILE.salaryExpectation,
      stringifyJson(DEFAULT_PROFILE.formats),
      DEFAULT_PROFILE.location,
      DEFAULT_PROFILE.hasPhoto ? 1 : 0,
      DEFAULT_PROFILE.about,
      stringifyJson(DEFAULT_PROFILE.skills),
      stringifyJson([]),
      stringifyJson([]),
      DEFAULT_PROFILE.experienceText,
      DEFAULT_PROFILE.educationText,
      DEFAULT_PROFILE.coverLetterInstructions,
      "idle",
      now,
      now,
    ],
  );

  await persistProfileDatabase();
  return getCandidateProfile();
};

export const getCandidateProfile = async (): Promise<CandidateProfile> => {
  const { db } = await getProfileDatabase();
  const columnNames = await getColumnNames();
  const experienceSelect = columnNames.has("experience_text")
    ? "experience_text"
    : "NULL AS experience_text";
  const educationSelect = columnNames.has("education_text")
    ? "education_text"
    : "NULL AS education_text";
  const resumeSummarySelect = columnNames.has("resume_summary_text")
    ? "resume_summary_text"
    : "NULL AS resume_summary_text";
  const resumeStructuredSelect = columnNames.has("resume_structured_json")
    ? "resume_structured_json"
    : "NULL AS resume_structured_json";
  const resumeStatusSelect = columnNames.has("resume_processing_status")
    ? "resume_processing_status"
    : "'idle' AS resume_processing_status";
  const resumeErrorSelect = columnNames.has("resume_processing_error")
    ? "resume_processing_error"
    : "NULL AS resume_processing_error";
  const resumeUpdatedSelect = columnNames.has("resume_summary_updated_at")
    ? "resume_summary_updated_at"
    : "NULL AS resume_summary_updated_at";
  const statement = db.prepare(`
    SELECT
      id, title, salary_expectation, formats_json, location, has_photo,
      about, skills_json, experience_json, education_json,
      ${experienceSelect}, ${educationSelect},
      ${resumeSummarySelect}, ${resumeStructuredSelect},
      ${resumeStatusSelect}, ${resumeErrorSelect}, ${resumeUpdatedSelect},
      cover_letter_instructions, created_at, updated_at
    FROM candidate_profile
    WHERE id = ?
    LIMIT 1
  `);

  try {
    statement.bind([PROFILE_ID]);

    if (!statement.step()) {
      statement.free();
      return createDefaultProfile();
    }

    return mapRowToProfile(statement.getAsObject());
  } finally {
    try {
      statement.free();
    } catch {
      // statement may already be freed before default profile creation
    }
  }
};

export const updateCandidateProfile = async (
  input: UpdateCandidateProfileInput,
): Promise<CandidateProfile> => {
  await getCandidateProfile();
  const { db } = await getProfileDatabase();
  const columnNames = await getColumnNames();

  if (!columnNames.has("experience_text")) {
    db.run("ALTER TABLE candidate_profile ADD COLUMN experience_text TEXT");
  }

  if (!columnNames.has("education_text")) {
    db.run("ALTER TABLE candidate_profile ADD COLUMN education_text TEXT");
  }

  if (!columnNames.has("resume_summary_text")) {
    db.run("ALTER TABLE candidate_profile ADD COLUMN resume_summary_text TEXT");
  }

  if (!columnNames.has("resume_structured_json")) {
    db.run("ALTER TABLE candidate_profile ADD COLUMN resume_structured_json TEXT");
  }

  if (!columnNames.has("resume_processing_status")) {
    db.run("ALTER TABLE candidate_profile ADD COLUMN resume_processing_status TEXT NOT NULL DEFAULT 'idle'");
  }

  if (!columnNames.has("resume_processing_error")) {
    db.run("ALTER TABLE candidate_profile ADD COLUMN resume_processing_error TEXT");
  }

  if (!columnNames.has("resume_summary_updated_at")) {
    db.run("ALTER TABLE candidate_profile ADD COLUMN resume_summary_updated_at TEXT");
  }

  const now = new Date().toISOString();

  db.run(
    `
      UPDATE candidate_profile
      SET
        title = ?,
        salary_expectation = ?,
        formats_json = ?,
        location = ?,
        has_photo = ?,
        about = ?,
        skills_json = ?,
        experience_text = ?,
        education_text = ?,
        cover_letter_instructions = ?,
        resume_summary_text = ?,
        resume_structured_json = ?,
        resume_processing_status = ?,
        resume_processing_error = ?,
        resume_summary_updated_at = ?,
        updated_at = ?
      WHERE id = ?
    `,
    [
      input.title,
      input.salaryExpectation,
      stringifyJson(input.formats),
      input.location,
      input.hasPhoto ? 1 : 0,
      input.about,
      stringifyJson(input.skills),
      input.experienceText,
      input.educationText,
      input.coverLetterInstructions,
      null,
      null,
      "processing",
      null,
      null,
      now,
      PROFILE_ID,
    ],
  );

  await persistProfileDatabase();
  return getCandidateProfile();
};

export const updateCandidateProfileSummary = async (
  summaryText: string,
  structured: CandidateResumeStructuredSummary,
): Promise<CandidateProfile> => {
  await getCandidateProfile();
  const { db } = await getProfileDatabase();
  const now = new Date().toISOString();

  db.run(
    `
      UPDATE candidate_profile
      SET
        resume_summary_text = ?,
        resume_structured_json = ?,
        resume_processing_status = ?,
        resume_processing_error = ?,
        resume_summary_updated_at = ?,
        updated_at = ?
      WHERE id = ?
    `,
    [
      summaryText,
      stringifyJson(structured),
      "completed",
      null,
      now,
      now,
      PROFILE_ID,
    ],
  );

  await persistProfileDatabase();
  return getCandidateProfile();
};

export const markCandidateProfileSummaryFailed = async (
  errorMessage: string,
): Promise<CandidateProfile> => {
  await getCandidateProfile();
  const { db } = await getProfileDatabase();
  const now = new Date().toISOString();

  db.run(
    `
      UPDATE candidate_profile
      SET
        resume_processing_status = ?,
        resume_processing_error = ?,
        updated_at = ?
      WHERE id = ?
    `,
    ["failed", errorMessage, now, PROFILE_ID],
  );

  await persistProfileDatabase();
  return getCandidateProfile();
};

export const formatCandidateProfileFullForPrompt = (
  profile: CandidateProfile,
): string => {
  const lines: string[] = [
    profile.title,
    "",
    profile.salaryExpectation
      ? `Зарплатные ожидания: ${profile.salaryExpectation}`
      : "",
    profile.formats.length > 0
      ? `Формат работы: ${profile.formats.join(", ")}`
      : "",
    profile.location ? `Локация: ${profile.location}` : "",
    `Фото в резюме: ${profile.hasPhoto ? "есть" : "нет"}`,
    "",
    "О себе:",
    profile.about,
    "",
    "Навыки:",
    profile.skills.join(", "),
    "",
    "Опыт:",
    profile.experienceText,
  ].filter((line) => line !== "");

  if (profile.educationText.trim()) {
    lines.push("");
    lines.push("Образование:");
    lines.push(profile.educationText);
  }

  return lines.join("\n").trim();
};

export const formatCandidateProfileForPrompt = (
  profile: CandidateProfile,
): string => {
  if (
    profile.resumeProcessingStatus === "completed" &&
    profile.resumeSummaryText?.trim()
  ) {
    const structured = profile.resumeStructured
      ? [
          "",
          "Structured summary:",
          JSON.stringify(profile.resumeStructured, null, 2),
        ].join("\n")
      : "";

    return [
      "Short candidate profile:",
      profile.resumeSummaryText.trim(),
      structured,
    ].join("\n").trim();
  }

  return formatCandidateProfileFullForPrompt(profile);
};
