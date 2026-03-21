import { ProcessedVacancyRecord, VacancyStatus } from "../types";
import { getDatabase, persistDatabase } from "./database";

const mapDecision = (value: unknown): "yes" | "no" | null => {
  if (value === "yes" || value === "no") {
    return value;
  }

  return null;
};

const mapStatus = (value: unknown): VacancyStatus => {
  if (
    value === "queued" ||
    value === "analyzed_fit" ||
    value === "analyzed_skip" ||
    value === "prefilter_rejected"
  ) {
    return value;
  }

  return "queued";
};

const mapRowToRecord = (row: Record<string, unknown>): ProcessedVacancyRecord => ({
  id: String(row.id),
  title: String(row.title),
  company: String(row.company),
  salary: String(row.salary),
  url: String(row.url),
  searchUrl: String(row.search_url),
  status: mapStatus(row.status),
  matchPercent: typeof row.match_percent === "number" ? row.match_percent : null,
  reason: typeof row.reason === "string" ? row.reason : null,
  decision: mapDecision(row.decision),
  processedAt: String(row.processed_at),
  sentAt: typeof row.sent_at === "string" ? row.sent_at : null,
});

export const hasProcessedVacancy = async (id: string): Promise<boolean> => {
  const { db } = await getDatabase();
  const statement = db.prepare(
    "SELECT 1 FROM processed_vacancies WHERE id = ? LIMIT 1",
  );

  try {
    statement.bind([id]);
    return statement.step();
  } finally {
    statement.free();
  }
};

export const saveProcessedVacancy = async (
  vacancy: ProcessedVacancyRecord,
): Promise<void> => {
  const { db } = await getDatabase();

  db.run(
    `
      INSERT OR REPLACE INTO processed_vacancies (
        id,
        title,
        company,
        salary,
        url,
        search_url,
        status,
        match_percent,
        reason,
        decision,
        processed_at,
        sent_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      vacancy.id,
      vacancy.title,
      vacancy.company,
      vacancy.salary,
      vacancy.url,
      vacancy.searchUrl,
      vacancy.status,
      vacancy.matchPercent,
      vacancy.reason,
      vacancy.decision,
      vacancy.processedAt,
      vacancy.sentAt,
    ],
  );

  await persistDatabase();
};

export const getProcessedVacancy = async (
  id: string,
): Promise<ProcessedVacancyRecord | null> => {
  const { db } = await getDatabase();
  const statement = db.prepare(
    `
      SELECT
        id,
        title,
        company,
        salary,
        url,
        search_url,
        status,
        match_percent,
        reason,
        decision,
        processed_at,
        sent_at
      FROM processed_vacancies
      WHERE id = ?
      LIMIT 1
    `,
  );

  try {
    statement.bind([id]);
    if (!statement.step()) {
      return null;
    }

    const row = statement.getAsObject();

    return mapRowToRecord(row);
  } finally {
    statement.free();
  }
};

export const getQueuedVacancyCount = async (): Promise<number> => {
  const { db } = await getDatabase();
  const statement = db.prepare(
    "SELECT COUNT(*) AS total FROM processed_vacancies WHERE status = 'queued'",
  );

  try {
    statement.bind([]);
    if (!statement.step()) {
      return 0;
    }

    const row = statement.getAsObject();
    return typeof row.total === "number" ? row.total : 0;
  } finally {
    statement.free();
  }
};

export const getFirstQueuedVacancy = async (): Promise<ProcessedVacancyRecord | null> => {
  const { db } = await getDatabase();
  const statement = db.prepare(
    `
      SELECT
        id,
        title,
        company,
        salary,
        url,
        search_url,
        status,
        match_percent,
        reason,
        decision,
        processed_at,
        sent_at
      FROM processed_vacancies
      WHERE status = 'queued'
      ORDER BY processed_at ASC
      LIMIT 1
    `,
  );

  try {
    statement.bind([]);
    if (!statement.step()) {
      return null;
    }

    return mapRowToRecord(statement.getAsObject());
  } finally {
    statement.free();
  }
};
