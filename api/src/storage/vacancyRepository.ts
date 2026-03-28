import {
  ProcessedVacancyRecord,
  VacancyListFilters,
  VacancyStats,
  VacancyStatus,
} from "../types";
import { getDatabase, persistDatabase } from "./database";

const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;

const mapDecision = (value: unknown): "yes" | "no" | null => {
  if (value === "yes" || value === "no") {
    return value;
  }

  return null;
};

const mapStatus = (value: unknown): VacancyStatus => {
  if (
    value === "queued" ||
    value === "manual_skipped" ||
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

    return mapRowToRecord(statement.getAsObject());
  } finally {
    statement.free();
  }
};

export const listProcessedVacancies = async (
  filters: Partial<VacancyListFilters> = {},
): Promise<ProcessedVacancyRecord[]> => {
  const limit = filters.limit ?? DEFAULT_LIMIT;
  const offset = filters.offset ?? DEFAULT_OFFSET;
  const { db } = await getDatabase();
  const hasStatusFilter = Boolean(filters.status);
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
      ${hasStatusFilter ? "WHERE status = ?" : ""}
      ORDER BY processed_at DESC
      LIMIT ? OFFSET ?
    `,
  );

  try {
    const params = hasStatusFilter
      ? [filters.status, limit, offset]
      : [limit, offset];
    statement.bind(params);
    const records: ProcessedVacancyRecord[] = [];

    while (statement.step()) {
      records.push(mapRowToRecord(statement.getAsObject()));
    }

    return records;
  } finally {
    statement.free();
  }
};

export const getVacancyStats = async (): Promise<VacancyStats> => {
  const { db } = await getDatabase();
  const result = db.exec(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) AS queued,
      SUM(CASE WHEN status = 'analyzed_fit' THEN 1 ELSE 0 END) AS analyzed_fit,
      SUM(CASE WHEN status = 'analyzed_skip' THEN 1 ELSE 0 END) AS analyzed_skip,
      SUM(CASE WHEN status = 'prefilter_rejected' THEN 1 ELSE 0 END) AS prefilter_rejected,
      SUM(CASE WHEN status = 'manual_skipped' THEN 1 ELSE 0 END) AS manual_skipped
    FROM processed_vacancies
  `);

  const row = result[0]?.values[0];

  return {
    total: Number(row?.[0] ?? 0),
    queued: Number(row?.[1] ?? 0),
    analyzedFit: Number(row?.[2] ?? 0),
    analyzedSkip: Number(row?.[3] ?? 0),
    prefilterRejected: Number(row?.[4] ?? 0),
    manualSkipped: Number(row?.[5] ?? 0),
  };
};
