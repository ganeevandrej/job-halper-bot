import express, {
  NextFunction,
  Request,
  Response,
} from "express";
import { collectSearchQueue } from "./services/searchService";
import {
  analyzeVacancyById,
  getVacancies,
  getVacancy,
  setVacancyStatus,
} from "./services/vacancyService";
import { getVacancyStats } from "./storage/vacancyRepository";
import { VacancyStatus } from "./types";
import {
  analyzeManualVacancyById,
  createAndAnalyzeManualVacancy,
  getManualVacancies,
  getManualVacancy,
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
  updateCandidateProfile,
} from "./storage/profileRepository";

const ALLOWED_STATUSES: VacancyStatus[] = [
  "new",
  "viewed",
  "rejected",
  "applied",
  "hidden",
];

const ALLOWED_MANUAL_VACANCY_STATUSES: ManualVacancyStatus[] = [
  "new",
  "viewed",
  "rejected",
  "applied",
  "hidden",
];

const parseStatus = (value: unknown): VacancyStatus | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  return ALLOWED_STATUSES.includes(value as VacancyStatus)
    ? (value as VacancyStatus)
    : undefined;
};

const parseStatuses = (value: unknown): VacancyStatus[] => {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return values
    .map((item) => parseStatus(item))
    .filter((item): item is VacancyStatus => Boolean(item));
};

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

export const createApp = () => {
  const app = express();

  app.use(express.json());
  app.use((_: Request, response: Response, next: NextFunction) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    next();
  });

  app.use((request: Request, response: Response, next: NextFunction) => {
    if (request.method === "OPTIONS") {
      response.status(204).end();
      return;
    }

    next();
  });

  app.get("/health", (_: Request, response: Response) => {
    response.json({ ok: true });
  });

  app.get("/stats", async (_: Request, response: Response) => {
    response.json(await getVacancyStats());
  });

  app.get("/profile", async (_: Request, response: Response) => {
    response.json(await getCandidateProfile());
  });

  app.put("/profile", async (request: Request, response: Response) => {
    const input = parseCandidateProfileInput(request.body);

    if (!input) {
      response.status(400).json({
        error: "Valid profile payload is required",
      });
      return;
    }

    response.json(await updateCandidateProfile(input));
  });

  app.get("/vacancies", async (request: Request, response: Response) => {
    const page = Number(getSingleValue(request.query.page) || 1);
    const pageSize = Number(getSingleValue(request.query.pageSize) || 20);
    const statuses = parseStatuses(request.query.status);
    const result = await getVacancies(page, pageSize, statuses);
    response.json(result);
  });

  app.get("/vacancies/:id", async (request: Request, response: Response) => {
    const vacancyId = getSingleValue(request.params.id);

    if (!vacancyId) {
      response.status(400).json({ error: "Vacancy id is required" });
      return;
    }

    const vacancy = await getVacancy(vacancyId);

    if (!vacancy) {
      response.status(404).json({ error: "Vacancy not found" });
      return;
    }

    response.json(vacancy);
  });

  app.post("/search/run", async (_: Request, response: Response) => {
    response.json(await collectSearchQueue());
  });

  app.get("/manual-vacancies", async (request: Request, response: Response) => {
    const page = Number(getSingleValue(request.query.page) || 1);
    const pageSize = Number(getSingleValue(request.query.pageSize) || 20);
    const result = await getManualVacancies(page, pageSize);
    response.json(result);
  });

  app.get("/manual-vacancies/:id", async (request: Request, response: Response) => {
    const vacancyId = getSingleValue(request.params.id);

    if (!vacancyId) {
      response.status(400).json({ error: "Manual vacancy id is required" });
      return;
    }

    const vacancy = await getManualVacancy(vacancyId);

    if (!vacancy) {
      response.status(404).json({ error: "Manual vacancy not found" });
      return;
    }

    response.json(vacancy);
  });

  app.post("/manual-vacancies/analyze", async (request: Request, response: Response) => {
    const rawText = request.body?.rawText;

    if (typeof rawText !== "string" || rawText.trim().length < 20) {
      response.status(400).json({
        error: "Vacancy text must be at least 20 characters long",
      });
      return;
    }

    const salaryOverride =
      typeof request.body?.salaryOverride === "string"
        ? request.body.salaryOverride
        : undefined;
    const vacancy = await createAndAnalyzeManualVacancy(
      rawText.trim(),
      salaryOverride?.trim() || undefined,
    );

    response.json(vacancy);
  });

  app.patch("/manual-vacancies/:id", async (request: Request, response: Response) => {
    const vacancyId = getSingleValue(request.params.id);

    if (!vacancyId) {
      response.status(400).json({ error: "Manual vacancy id is required" });
      return;
    }

    const vacancy = await updateManualVacancyById(
      vacancyId,
      parseManualVacancyUpdate(request.body),
    );

    if (!vacancy) {
      response.status(404).json({ error: "Manual vacancy not found" });
      return;
    }

    response.json(vacancy);
  });

  app.post("/manual-vacancies/:id/analyze", async (request: Request, response: Response) => {
    const vacancyId = getSingleValue(request.params.id);

    if (!vacancyId) {
      response.status(400).json({ error: "Manual vacancy id is required" });
      return;
    }

    const vacancy = await analyzeManualVacancyById(vacancyId);

    if (!vacancy) {
      response.status(404).json({ error: "Manual vacancy not found" });
      return;
    }

    response.json(vacancy);
  });

  app.post("/vacancies/:id/analyze", async (request: Request, response: Response) => {
    const vacancyId = getSingleValue(request.params.id);

    if (!vacancyId) {
      response.status(400).json({ error: "Vacancy id is required" });
      return;
    }

    const vacancy = await analyzeVacancyById(vacancyId);

    if (!vacancy) {
      response.status(404).json({ error: "Vacancy not found" });
      return;
    }

    response.json(vacancy);
  });

  app.patch("/vacancies/:id/status", async (request: Request, response: Response) => {
    const vacancyId = getSingleValue(request.params.id);
    const status = parseStatus(request.body?.status);

    if (!vacancyId) {
      response.status(400).json({ error: "Vacancy id is required" });
      return;
    }

    if (!status) {
      response.status(400).json({ error: "Valid status is required" });
      return;
    }

    const vacancy = await setVacancyStatus(vacancyId, status);

    if (!vacancy) {
      response.status(404).json({ error: "Vacancy not found" });
      return;
    }

    response.json(vacancy);
  });

  return app;
};
