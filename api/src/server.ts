import { createServer, IncomingMessage, ServerResponse } from "http";
import {
  getProcessedVacancy,
  getVacancyStats,
  listProcessedVacancies,
} from "./storage/vacancyRepository";
import { collectSearchQueue } from "./services/searchService";
import { VacancyStatus } from "./types";
import { env } from "./utils/env";
import { logger } from "./utils/logger";

const ALLOWED_STATUSES: VacancyStatus[] = [
  "queued",
  "manual_skipped",
  "analyzed_fit",
  "analyzed_skip",
  "prefilter_rejected",
];

const sendJson = (
  response: ServerResponse,
  statusCode: number,
  payload: unknown,
): void => {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  response.end(JSON.stringify(payload));
};

const sendNotFound = (response: ServerResponse): void => {
  sendJson(response, 404, {
    error: "Not found",
  });
};

const getVacancyId = (pathname: string): string | null => {
  const match = pathname.match(/^\/vacancies\/([^/]+)$/);
  return match?.[1] ?? null;
};

const getStatusFilter = (value: string | null): VacancyStatus | undefined => {
  if (!value) {
    return undefined;
  }

  return ALLOWED_STATUSES.includes(value as VacancyStatus)
    ? (value as VacancyStatus)
    : undefined;
};

const handleRequest = async (
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> => {
  const method = request.method || "GET";
  const url = new URL(request.url || "/", `http://${request.headers.host}`);

  if (method === "OPTIONS") {
    sendJson(response, 204, null);
    return;
  }

  if (method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (method === "GET" && url.pathname === "/stats") {
    const stats = await getVacancyStats();
    sendJson(response, 200, stats);
    return;
  }

  if (method === "GET" && url.pathname === "/vacancies") {
    const limit = Number(url.searchParams.get("limit") || 20);
    const offset = Number(url.searchParams.get("offset") || 0);
    const status = getStatusFilter(url.searchParams.get("status"));
    const vacancies = await listProcessedVacancies({ limit, offset, status });

    sendJson(response, 200, {
      items: vacancies,
      limit,
      offset,
    });
    return;
  }

  if (method === "GET") {
    const vacancyId = getVacancyId(url.pathname);

    if (vacancyId) {
      const vacancy = await getProcessedVacancy(vacancyId);

      if (!vacancy) {
        sendJson(response, 404, {
          error: "Vacancy not found",
        });
        return;
      }

      sendJson(response, 200, vacancy);
      return;
    }
  }

  if (method === "POST" && url.pathname === "/search/run") {
    const result = await collectSearchQueue();
    sendJson(response, 200, result);
    return;
  }

  sendNotFound(response);
};

const server = createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    logger.error("API request failed", error);
    sendJson(response, 500, {
      error: "Internal server error",
    });
  });
});

server.listen(env.port, () => {
  logger.info("API server started", {
    port: env.port,
  });
});
