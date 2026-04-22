import express, {
  NextFunction,
  Request,
  Response,
} from "express";
import {
  CompanyDuplicateHhIdError,
  createCompanyFromText,
  getCompanies,
  getCompany,
} from "./services/companyService";
import {
  analyzeManualVacancyById,
  createAndAnalyzeManualVacancy,
  createManualVacancyFromText,
  generateManualVacancyCoverLetterById,
  getManualVacancies,
  getManualVacancy,
  ManualVacancyDuplicateHhIdError,
  updateManualVacancyById,
} from "./services/manualVacancyService";
import {
  ManualVacancyStatus,
  UpdateManualVacancyInput,
} from "./types/manualVacancy";
import {
  UpdateCandidateProfileInput,
} from "./types/profile";
import {
  getCandidateProfile,
} from "./storage/profileRepository";
import { updateCandidateProfileWithSummary } from "./services/profileSummaryService";
import { getManualVacancyStats } from "./storage/manualVacancyRepository";
import {
  CompetitorResumeDuplicateHhIdError,
  createCompetitorResume,
} from "./services/competitorResumeService";
import {
  getCompetitorResumeById,
  getCompetitorResumeStats,
  listCompetitorResumes,
} from "./storage/competitorResumeRepository";
import { env } from "./utils/env";

const ALLOWED_MANUAL_VACANCY_STATUSES: ManualVacancyStatus[] = [
  "new",
  "analyzed",
  "applied",
  "not_fit",
  "archived",
];

const parseManualVacancyStatus = (
  value: unknown,
): ManualVacancyStatus | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  return ALLOWED_MANUAL_VACANCY_STATUSES.includes(value as ManualVacancyStatus)
    ? (value as ManualVacancyStatus)
    : undefined;
};

const parseOptionalString = (value: unknown): string | null | undefined => {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const parseOptionalRequiredString = (
  value: unknown,
): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const parseStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseRequiredStringArray = (value: unknown): string[] =>
  parseStringArray(value) ?? [];

const parseCandidateProfileInput = (
  body: unknown,
): UpdateCandidateProfileInput | null => {
  if (!body || typeof body !== "object") {
    return null;
  }

  const payload = body as Record<string, unknown>;
  const title = parseOptionalRequiredString(payload.title);
  const about = parseOptionalRequiredString(payload.about);
  const experienceText = parseOptionalRequiredString(payload.experienceText);
  const educationText = parseOptionalRequiredString(payload.educationText);
  const coverLetterInstructions = parseOptionalRequiredString(
    payload.coverLetterInstructions,
  );

  if (!title || !about || !experienceText || !educationText || !coverLetterInstructions) {
    return null;
  }

  return {
    title,
    salaryExpectation: parseOptionalString(payload.salaryExpectation) ?? null,
    formats: parseRequiredStringArray(payload.formats),
    location: parseOptionalString(payload.location) ?? null,
    hasPhoto: Boolean(payload.hasPhoto),
    about,
    skills: parseRequiredStringArray(payload.skills),
    experienceText,
    educationText,
    coverLetterInstructions,
  };
};

const parseManualVacancyUpdate = (body: unknown): UpdateManualVacancyInput => {
  const payload = body && typeof body === "object"
    ? (body as Record<string, unknown>)
    : {};
  const input: UpdateManualVacancyInput = {};
  const status = parseManualVacancyStatus(payload.status);
  const rawText = parseOptionalRequiredString(payload.rawText);
  const hhId = parseOptionalString(payload.hhId);
  const companyId = parseOptionalString(payload.companyId);
  const url = parseOptionalString(payload.url);
  const title = parseOptionalRequiredString(payload.title);
  const company = parseOptionalRequiredString(payload.company);
  const salary = parseOptionalString(payload.salary);
  const estimatedSalary = parseOptionalString(payload.estimatedSalary);
  const formats = parseStringArray(payload.formats);
  const location = parseOptionalRequiredString(payload.location);
  const grade = parseOptionalRequiredString(payload.grade);
  const stack = parseStringArray(payload.stack);
  const tasks = parseStringArray(payload.tasks);
  const requirements = parseStringArray(payload.requirements);
  const niceToHave = parseStringArray(payload.niceToHave);
  const redFlags = parseStringArray(payload.redFlags);
  const summary = parseOptionalRequiredString(payload.summary);

  if (status) input.status = status;
  if (rawText !== undefined) input.rawText = rawText;
  if (hhId !== undefined) input.hhId = hhId;
  if (companyId !== undefined) input.companyId = companyId;
  if (url !== undefined) input.url = url;
  if (title !== undefined) input.title = title;
  if (company !== undefined) input.company = company;
  if (salary !== undefined) input.salary = salary;
  if (estimatedSalary !== undefined) input.estimatedSalary = estimatedSalary;
  if (formats !== undefined) input.formats = formats;
  if (location !== undefined) input.location = location;
  if (grade !== undefined) input.grade = grade;
  if (stack !== undefined) input.stack = stack;
  if (tasks !== undefined) input.tasks = tasks;
  if (requirements !== undefined) input.requirements = requirements;
  if (niceToHave !== undefined) input.niceToHave = niceToHave;
  if (redFlags !== undefined) input.redFlags = redFlags;
  if (summary !== undefined) input.summary = summary;

  return input;
};

const getSingleValue = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return undefined;
};

const normalizeOrigin = (value: string): string | null => {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed === "*") {
    return trimmed;
  }

  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/$/, "");
  }
};

const parseAllowedOrigins = (value: string): string[] =>
  value
    .split(",")
    .map(normalizeOrigin)
    .filter((item): item is string => Boolean(item));

const allowedCorsOrigins = parseAllowedOrigins(env.corsAllowedOrigins);

const isOriginAllowed = (origin: string): boolean =>
  allowedCorsOrigins.includes("*") || allowedCorsOrigins.includes(origin);

export const createApp = () => {
  const app = express();

  app.use((request: Request, response: Response, next: NextFunction) => {
    const origin = request.headers.origin;

    if (typeof origin === "string" && isOriginAllowed(origin)) {
      response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Vary", "Origin");
    } else if (allowedCorsOrigins.includes("*")) {
      response.setHeader("Access-Control-Allow-Origin", "*");
    }

    response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,OPTIONS");
    response.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, ngrok-skip-browser-warning",
    );
    response.setHeader("Access-Control-Max-Age", "86400");

    if (request.method === "OPTIONS") {
      response.status(204).end();
      return;
    }

    next();
  });
  app.use(express.json());

  app.get("/health", (_: Request, response: Response) => {
    response.json({ ok: true });
  });

  app.get("/profile", async (_: Request, response: Response) => {
    response.json(await getCandidateProfile());
  });

  app.put("/profile", async (request: Request, response: Response) => {
    const input = parseCandidateProfileInput(request.body);

    if (!input) {
      response.status(400).json({
        error: "Заполни обязательные поля профиля",
      });
      return;
    }

    response.json(await updateCandidateProfileWithSummary(input));
  });

  app.post("/competitor-resumes", async (request: Request, response: Response) => {
    const rawText = request.body?.rawText;

    if (typeof rawText !== "string" || rawText.trim().length < 50) {
      response.status(400).json({
        error: "Описание резюме должно быть не короче 50 символов",
      });
      return;
    }

    const hhId = typeof request.body?.hhId === "string"
      ? request.body.hhId.trim()
      : undefined;

    try {
      const resume = await createCompetitorResume({
        rawText: rawText.trim(),
        hhId: hhId || undefined,
        hasPhoto: Boolean(request.body?.hasPhoto),
      });

      response.status(201).json(resume);
    } catch (error) {
      if (error instanceof CompetitorResumeDuplicateHhIdError) {
        response.status(409).json({
          error: `Резюме с hh id ${error.hhId} уже есть в базе`,
        });
        return;
      }

      throw error;
    }
  });

  app.get("/competitor-resumes", async (request: Request, response: Response) => {
    const page = Number(getSingleValue(request.query.page) || 1);
    const pageSize = Number(getSingleValue(request.query.pageSize) || 20);
    const limit = Math.max(1, Math.min(pageSize, 100));
    const safePage = Math.max(1, page);
    const offset = (safePage - 1) * limit;
    const result = await listCompetitorResumes({ limit, offset });

    response.json({
      ...result,
      page: safePage,
      pageSize: limit,
    });
  });

  app.get("/competitor-resumes/stats", async (_: Request, response: Response) => {
    response.json(await getCompetitorResumeStats());
  });

  app.get("/competitor-resumes/:id", async (request: Request, response: Response) => {
    const resumeId = getSingleValue(request.params.id);

    if (!resumeId) {
      response.status(400).json({ error: "Не передан id резюме" });
      return;
    }

    const resume = await getCompetitorResumeById(resumeId);

    if (!resume) {
      response.status(404).json({ error: "Резюме не найдено" });
      return;
    }

    response.json(resume);
  });

  app.get("/manual-vacancies", async (request: Request, response: Response) => {
    const page = Number(getSingleValue(request.query.page) || 1);
    const pageSize = Number(getSingleValue(request.query.pageSize) || 20);
    const hhId = getSingleValue(request.query.hhId)?.trim();
    const status = parseManualVacancyStatus(getSingleValue(request.query.status));
    const result = await getManualVacancies(page, pageSize, hhId, status);
    response.json(result);
  });

  app.get("/manual-vacancies/stats", async (_: Request, response: Response) => {
    response.json(await getManualVacancyStats());
  });

  app.get("/manual-vacancies/:id", async (request: Request, response: Response) => {
    const vacancyId = getSingleValue(request.params.id);

    if (!vacancyId) {
      response.status(400).json({ error: "Не передан id вакансии" });
      return;
    }

    const vacancy = await getManualVacancy(vacancyId);

    if (!vacancy) {
      response.status(404).json({ error: "Вакансия не найдена" });
      return;
    }

    response.json(vacancy);
  });

  app.post("/manual-vacancies", async (request: Request, response: Response) => {
    const rawText = request.body?.rawText;

    if (typeof rawText !== "string" || rawText.trim().length < 20) {
      response.status(400).json({
        error: "Описание вакансии должно быть не короче 20 символов",
      });
      return;
    }

    const salaryOverride =
      typeof request.body?.salaryOverride === "string"
        ? request.body.salaryOverride
        : undefined;
    const hhId =
      typeof request.body?.hhId === "string"
        ? request.body.hhId.trim()
        : undefined;
    const companyId =
      typeof request.body?.companyId === "string"
        ? request.body.companyId.trim()
        : undefined;
    const url =
      typeof request.body?.url === "string"
        ? request.body.url.trim()
        : undefined;

    try {
      const vacancy = await createManualVacancyFromText(
        rawText.trim(),
        {
          salaryOverride: salaryOverride?.trim() || undefined,
          hhId: hhId || undefined,
          companyId: companyId || undefined,
          url: url || undefined,
        },
      );

      response.status(201).json(vacancy);
    } catch (error) {
      if (error instanceof ManualVacancyDuplicateHhIdError) {
        response.status(409).json({
          error: `Вакансия с hh id ${error.hhId} уже есть в списке`,
        });
        return;
      }

      throw error;
    }
  });

  app.post("/manual-vacancies/analyze", async (request: Request, response: Response) => {
    const rawText = request.body?.rawText;

    if (typeof rawText !== "string" || rawText.trim().length < 20) {
      response.status(400).json({
        error: "Описание вакансии должно быть не короче 20 символов",
      });
      return;
    }

    const salaryOverride =
      typeof request.body?.salaryOverride === "string"
        ? request.body.salaryOverride
        : undefined;
    const hhId =
      typeof request.body?.hhId === "string"
        ? request.body.hhId.trim()
        : undefined;
    const companyId =
      typeof request.body?.companyId === "string"
        ? request.body.companyId.trim()
        : undefined;
    const url =
      typeof request.body?.url === "string"
        ? request.body.url.trim()
        : undefined;
    try {
      const vacancy = await createAndAnalyzeManualVacancy(
        rawText.trim(),
        {
          salaryOverride: salaryOverride?.trim() || undefined,
          hhId: hhId || undefined,
          companyId: companyId || undefined,
          url: url || undefined,
        },
      );

      response.json(vacancy);
    } catch (error) {
      if (error instanceof ManualVacancyDuplicateHhIdError) {
        response.status(409).json({
          error: `Вакансия с hh id ${error.hhId} уже есть в списке`,
        });
        return;
      }

      throw error;
    }
  });

  app.patch("/manual-vacancies/:id", async (request: Request, response: Response) => {
    const vacancyId = getSingleValue(request.params.id);

    if (!vacancyId) {
      response.status(400).json({ error: "Не передан id вакансии" });
      return;
    }

    const vacancy = await updateManualVacancyById(
      vacancyId,
      parseManualVacancyUpdate(request.body),
    );

    if (!vacancy) {
      response.status(404).json({ error: "Вакансия не найдена" });
      return;
    }

    response.json(vacancy);
  });

  app.post("/manual-vacancies/:id/analyze", async (request: Request, response: Response) => {
    const vacancyId = getSingleValue(request.params.id);

    if (!vacancyId) {
      response.status(400).json({ error: "Не передан id вакансии" });
      return;
    }

    const vacancy = await analyzeManualVacancyById(vacancyId);

    if (!vacancy) {
      response.status(404).json({ error: "Вакансия не найдена" });
      return;
    }

    response.json(vacancy);
  });

  app.post("/manual-vacancies/:id/cover-letter", async (request: Request, response: Response) => {
    const vacancyId = getSingleValue(request.params.id);

    if (!vacancyId) {
      response.status(400).json({ error: "Не передан id вакансии" });
      return;
    }

    const vacancy = await generateManualVacancyCoverLetterById(vacancyId);

    if (!vacancy) {
      response.status(404).json({ error: "Вакансия не найдена" });
      return;
    }

    response.json(vacancy);
  });

  app.get("/companies", async (_: Request, response: Response) => {
    response.json(await getCompanies());
  });

  app.get("/companies/:id", async (request: Request, response: Response) => {
    const companyId = getSingleValue(request.params.id);

    if (!companyId) {
      response.status(400).json({ error: "Не передан id компании" });
      return;
    }

    const company = await getCompany(companyId);

    if (!company) {
      response.status(404).json({ error: "Компания не найдена" });
      return;
    }

    response.json(company);
  });

  app.post("/companies", async (request: Request, response: Response) => {
    const rawText = request.body?.rawText;

    if (typeof rawText !== "string" || rawText.trim().length < 20) {
      response.status(400).json({
        error: "Описание компании должно быть не короче 20 символов",
      });
      return;
    }

    const hhId =
      typeof request.body?.hhId === "string"
        ? request.body.hhId.trim()
        : undefined;

    try {
      const company = await createCompanyFromText(rawText.trim(), {
        hhId: hhId || undefined,
      });
      response.status(201).json(company);
    } catch (error) {
      if (error instanceof CompanyDuplicateHhIdError) {
        response.status(409).json({
          error: `Компания с hh id ${error.hhId} уже есть в базе`,
        });
        return;
      }

      throw error;
    }
  });

  return app;
};
