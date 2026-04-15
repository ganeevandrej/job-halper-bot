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
import { CoverLetterFocus, VacancyStatus } from "./types";

const ALLOWED_STATUSES: VacancyStatus[] = [
  "new",
  "viewed",
  "rejected",
  "applied",
  "hidden",
];

const ALLOWED_COVER_LETTER_FOCUSES: CoverLetterFocus[] = [
  "tasks",
  "product",
  "domain",
  "stack",
  "experience",
  "short",
];

const parseStatus = (value: unknown): VacancyStatus | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  return ALLOWED_STATUSES.includes(value as VacancyStatus)
    ? (value as VacancyStatus)
    : undefined;
};

const parseCoverLetterFocus = (value: unknown): CoverLetterFocus | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  return ALLOWED_COVER_LETTER_FOCUSES.includes(value as CoverLetterFocus)
    ? (value as CoverLetterFocus)
    : undefined;
};

const parseCoverLetterFocuses = (value: unknown): CoverLetterFocus[] => {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? [value]
      : [];

  const focuses = values
    .map((item) => parseCoverLetterFocus(item))
    .filter((item): item is CoverLetterFocus => Boolean(item));

  return Array.from(new Set(focuses));
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
    response.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
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

  app.post("/vacancies/:id/analyze", async (request: Request, response: Response) => {
    const vacancyId = getSingleValue(request.params.id);

    if (!vacancyId) {
      response.status(400).json({ error: "Vacancy id is required" });
      return;
    }

    const coverLetterFocuses = parseCoverLetterFocuses(
      request.body?.coverLetterFocuses ?? request.body?.coverLetterFocus,
    );
    const vacancy = await analyzeVacancyById(vacancyId, coverLetterFocuses);

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
