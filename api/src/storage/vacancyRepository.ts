import {
  VacancyAnalysis,
  VacancyListFilters,
  VacancyRecord,
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
    value === "new" ||
    value === "viewed" ||
    value === "rejected" ||
    value === "hidden"
  ) {
    return value;
  }

  if (value === "applied") {
    return "applied";
  }

  if (value === "analyzed_fit" || value === "analyzed_skip") {
    return "viewed";
  }

  return "new";
};

const mapRowToRecord = (row: Record<string, unknown>): VacancyRecord => ({
  id: String(row.id),
  title: String(row.title),
  company: String(row.company),
  salary: String(row.salary),
  url: String(row.url),
  searchUrl: String(row.search_url),
  status: mapStatus(row.status),
  description: typeof row.description === "string" ? row.description : null,
  matchPercent: typeof row.match_percent === "number" ? row.match_percent : null,
  reason: typeof row.reason === "string" ? row.reason : null,
  decision: mapDecision(row.decision),
  salaryEstimate:
    typeof row.salary_estimate === "string" ? row.salary_estimate : null,
  coverLetter: typeof row.cover_letter === "string" ? row.cover_letter : null,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
  analyzedAt: typeof row.analyzed_at === "string" ? row.analyzed_at : null,
  notifiedAt: typeof row.notified_at === "string" ? row.notified_at : null,
});

export const hasVacancy = async (id: string): Promise<boolean> => {
  const { db } = await getDatabase();
  const statement = db.prepare("SELECT 1 FROM vacancies WHERE id = ? LIMIT 1");

  try {
    statement.bind([id]);
    return statement.step();
  } finally {
    statement.free();
  }
};

export const createVacancy = async (
  vacancy: Omit<
    VacancyRecord,
    | "description"
    | "matchPercent"
    | "reason"
    | "decision"
    | "salaryEstimate"
    | "coverLetter"
    | "analyzedAt"
    | "notifiedAt"
  >,
): Promise<void> => {
  const { db } = await getDatabase();

  db.run(
    `
      INSERT INTO vacancies (
        id, title, company, salary, url, search_url, status,
        description, match_percent, reason, decision, salary_estimate,
        cover_letter, created_at, updated_at, analyzed_at, notified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      vacancy.id,
      vacancy.title,
      vacancy.company,
      vacancy.salary,
      vacancy.url,
      vacancy.searchUrl,
      vacancy.status,
      null,
      null,
      null,
      null,
      null,
      null,
      vacancy.createdAt,
      vacancy.updatedAt,
      null,
      null,
    ],
  );

  await persistDatabase();
};

export const getVacancyById = async (
  id: string,
): Promise<VacancyRecord | null> => {
  const { db } = await getDatabase();
  const statement = db.prepare(
    `
      SELECT
        id, title, company, salary, url, search_url, status, description,
        match_percent, reason, decision, salary_estimate, cover_letter,
        created_at, updated_at, analyzed_at, notified_at
      FROM vacancies
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

export const listVacancies = async (
  filters: Partial<VacancyListFilters> = {},
): Promise<{ items: VacancyRecord[]; total: number }> => {
  const limit = filters.limit ?? DEFAULT_LIMIT;
  const offset = filters.offset ?? DEFAULT_OFFSET;
  const { db } = await getDatabase();
  const statuses = filters.statuses ?? [];
  const hasStatusFilter = statuses.length > 0;
  const statusPlaceholders = statuses.map(() => "?").join(", ");
  const baseWhere = hasStatusFilter
    ? `WHERE status IN (${statusPlaceholders})`
    : "WHERE status != 'hidden'";

  const totalStatement = db.prepare(
    `
      SELECT COUNT(*) AS total
      FROM vacancies
      ${baseWhere}
    `,
  );

  const itemsStatement = db.prepare(
    `
      SELECT
        id, title, company, salary, url, search_url, status, description,
        match_percent, reason, decision, salary_estimate, cover_letter,
        created_at, updated_at, analyzed_at, notified_at
      FROM vacancies
      ${baseWhere}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `,
  );

  try {
    const filterParams = hasStatusFilter ? statuses : [];

    totalStatement.bind(filterParams);
    const total = totalStatement.step()
      ? Number(totalStatement.getAsObject().total ?? 0)
      : 0;

    itemsStatement.bind([...filterParams, limit, offset]);
    const items: VacancyRecord[] = [];

    while (itemsStatement.step()) {
      items.push(mapRowToRecord(itemsStatement.getAsObject()));
    }

    return { items, total };
  } finally {
    totalStatement.free();
    itemsStatement.free();
  }
};

export const updateVacancyDescription = async (
  id: string,
  description: string,
): Promise<void> => {
  const { db } = await getDatabase();
  const updatedAt = new Date().toISOString();

  db.run(
    "UPDATE vacancies SET description = ?, updated_at = ? WHERE id = ?",
    [description, updatedAt, id],
  );

  await persistDatabase();
};

export const saveVacancyAnalysis = async (
  id: string,
  analysis: VacancyAnalysis,
): Promise<void> => {
  const { db } = await getDatabase();
  const now = new Date().toISOString();

  db.run(
    `
      UPDATE vacancies
      SET
        match_percent = ?,
        reason = ?,
        decision = ?,
        salary_estimate = ?,
        cover_letter = ?,
        analyzed_at = ?,
        updated_at = ?
      WHERE id = ?
    `,
    [
      analysis.match_percent,
      analysis.reason,
      analysis.decision,
      analysis.salary_estimate,
      analysis.cover_letter,
      now,
      now,
      id,
    ],
  );

  await persistDatabase();
};

export const updateVacancyStatus = async (
  id: string,
  status: VacancyStatus,
): Promise<void> => {
  const { db } = await getDatabase();
  const updatedAt = new Date().toISOString();

  db.run("UPDATE vacancies SET status = ?, updated_at = ? WHERE id = ?", [
    status,
    updatedAt,
    id,
  ]);

  await persistDatabase();
};

export const markVacanciesNotified = async (ids: string[]): Promise<void> => {
  if (ids.length === 0) {
    return;
  }

  const { db } = await getDatabase();
  const now = new Date().toISOString();

  for (const id of ids) {
    db.run("UPDATE vacancies SET notified_at = ?, updated_at = ? WHERE id = ?", [
      now,
      now,
      id,
    ]);
  }

  await persistDatabase();
};

export const getVacancyStats = async (): Promise<VacancyStats> => {
  const { db } = await getDatabase();
  const result = db.exec(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) AS new_count,
      SUM(CASE WHEN status = 'viewed' THEN 1 ELSE 0 END) AS viewed_count,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count,
      SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) AS applied_count,
      SUM(CASE WHEN status = 'hidden' THEN 1 ELSE 0 END) AS hidden_count
    FROM vacancies
  `);

  const row = result[0]?.values[0];

  return {
    total: Number(row?.[0] ?? 0),
    new: Number(row?.[1] ?? 0),
    viewed: Number(row?.[2] ?? 0),
    rejected: Number(row?.[3] ?? 0),
    applied: Number(row?.[4] ?? 0),
    hidden: Number(row?.[5] ?? 0),
  };
};
