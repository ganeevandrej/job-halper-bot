import {
  ManualVacancyListFilters,
  ManualVacancyRecord,
  ManualVacancyStatus,
  UpdateManualVacancyInput,
} from "../types/manualVacancy";
import {
  getManualVacancyDatabase,
  persistManualVacancyDatabase,
} from "./manualVacancyDatabase";

const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;
const EMPTY_JSON_ARRAY = "[]";

const parseJsonArray = (value: unknown): string[] => {
  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
};

const stringifyJsonArray = (value: string[]): string =>
  JSON.stringify(value.filter((item) => item.trim()).map((item) => item.trim()));

const mapDecision = (value: unknown): "yes" | "no" | null => {
  if (value === "yes" || value === "no") {
    return value;
  }

  return null;
};

const mapStatus = (value: unknown): ManualVacancyStatus => {
  if (
    value === "new" ||
    value === "viewed" ||
    value === "rejected" ||
    value === "applied" ||
    value === "hidden"
  ) {
    return value;
  }

  return "new";
};

const mapRowToManualVacancy = (
  row: Record<string, unknown>,
): ManualVacancyRecord => ({
  id: String(row.id),
  rawText: String(row.raw_text),
  status: mapStatus(row.status),
  title: String(row.title),
  company: String(row.company),
  salary: typeof row.salary === "string" && row.salary ? row.salary : null,
  estimatedSalary:
    typeof row.estimated_salary === "string" && row.estimated_salary
      ? row.estimated_salary
      : null,
  formats: parseJsonArray(row.formats_json).length > 0
    ? parseJsonArray(row.formats_json)
    : parseJsonArray(row.format).length > 0
      ? parseJsonArray(row.format)
      : typeof row.format === "string" && row.format
        ? [row.format]
        : [],
  location: String(row.location),
  grade: String(row.grade),
  stack: parseJsonArray(row.stack_json),
  tasks: parseJsonArray(row.tasks_json),
  requirements: parseJsonArray(row.requirements_json),
  niceToHave: parseJsonArray(row.nice_to_have_json),
  redFlags: parseJsonArray(row.red_flags_json),
  summary: String(row.summary),
  matchPercent: typeof row.match_percent === "number" ? row.match_percent : null,
  decision: mapDecision(row.decision),
  reason: typeof row.reason === "string" ? row.reason : null,
  salaryEstimate:
    typeof row.salary_estimate === "string" ? row.salary_estimate : null,
  coverLetter: typeof row.cover_letter === "string" ? row.cover_letter : null,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
  analyzedAt: typeof row.analyzed_at === "string" ? row.analyzed_at : null,
});

export const createManualVacancy = async (
  vacancy: ManualVacancyRecord,
): Promise<void> => {
  const { db } = await getManualVacancyDatabase();

  db.run(
    `
      INSERT INTO manual_vacancies (
        id, raw_text, status, title, company, salary, estimated_salary, format, formats_json,
        location, grade, stack_json, tasks_json, requirements_json, nice_to_have_json,
        red_flags_json, summary, match_percent, decision, reason,
        salary_estimate, cover_letter, created_at, updated_at, analyzed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      vacancy.id,
      vacancy.rawText,
      vacancy.status,
      vacancy.title,
      vacancy.company,
      vacancy.salary,
      vacancy.estimatedSalary,
      vacancy.formats[0] ?? "Unknown",
      stringifyJsonArray(vacancy.formats),
      vacancy.location,
      vacancy.grade,
      stringifyJsonArray(vacancy.stack),
      stringifyJsonArray(vacancy.tasks),
      stringifyJsonArray(vacancy.requirements),
      stringifyJsonArray(vacancy.niceToHave),
      stringifyJsonArray(vacancy.redFlags),
      vacancy.summary,
      vacancy.matchPercent,
      vacancy.decision,
      vacancy.reason,
      vacancy.salaryEstimate,
      vacancy.coverLetter,
      vacancy.createdAt,
      vacancy.updatedAt,
      vacancy.analyzedAt,
    ],
  );

  await persistManualVacancyDatabase();
};

export const listManualVacancies = async (
  filters: Partial<ManualVacancyListFilters> = {},
): Promise<{ items: ManualVacancyRecord[]; total: number }> => {
  const limit = filters.limit ?? DEFAULT_LIMIT;
  const offset = filters.offset ?? DEFAULT_OFFSET;
  const { db } = await getManualVacancyDatabase();

  const totalStatement = db.prepare(
    "SELECT COUNT(*) AS total FROM manual_vacancies",
  );
  const itemsStatement = db.prepare(`
    SELECT
      id, raw_text, status, title, company, salary, estimated_salary, format, formats_json,
      location, grade, stack_json, tasks_json, requirements_json, nice_to_have_json,
      red_flags_json, summary, match_percent, decision, reason,
      salary_estimate, cover_letter, created_at, updated_at, analyzed_at
    FROM manual_vacancies
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `);

  try {
    const total = totalStatement.step()
      ? Number(totalStatement.getAsObject().total ?? 0)
      : 0;

    itemsStatement.bind([limit, offset]);
    const items: ManualVacancyRecord[] = [];

    while (itemsStatement.step()) {
      items.push(mapRowToManualVacancy(itemsStatement.getAsObject()));
    }

    return { items, total };
  } finally {
    totalStatement.free();
    itemsStatement.free();
  }
};

export const getManualVacancyById = async (
  id: string,
): Promise<ManualVacancyRecord | null> => {
  const { db } = await getManualVacancyDatabase();
  const statement = db.prepare(`
    SELECT
      id, raw_text, status, title, company, salary, estimated_salary, format, formats_json,
      location, grade, stack_json, tasks_json, requirements_json, nice_to_have_json,
      red_flags_json, summary, match_percent, decision, reason,
      salary_estimate, cover_letter, created_at, updated_at, analyzed_at
    FROM manual_vacancies
    WHERE id = ?
    LIMIT 1
  `);

  try {
    statement.bind([id]);

    if (!statement.step()) {
      return null;
    }

    return mapRowToManualVacancy(statement.getAsObject());
  } finally {
    statement.free();
  }
};

export const updateManualVacancy = async (
  id: string,
  input: UpdateManualVacancyInput,
): Promise<void> => {
  const { db } = await getManualVacancyDatabase();
  const current = await getManualVacancyById(id);

  if (!current) {
    return;
  }

  const next = {
    ...current,
    ...input,
    updatedAt: new Date().toISOString(),
  };

  db.run(
    `
      UPDATE manual_vacancies
      SET
        raw_text = ?,
        status = ?,
        title = ?,
        company = ?,
        salary = ?,
        estimated_salary = ?,
        format = ?,
        formats_json = ?,
        location = ?,
        grade = ?,
        stack_json = ?,
        tasks_json = ?,
        requirements_json = ?,
        nice_to_have_json = ?,
        red_flags_json = ?,
        summary = ?,
        updated_at = ?
      WHERE id = ?
    `,
    [
      next.rawText,
      next.status,
      next.title,
      next.company,
      next.salary,
      next.estimatedSalary,
      next.formats[0] ?? "Unknown",
      stringifyJsonArray(next.formats),
      next.location,
      next.grade,
      stringifyJsonArray(next.stack),
      stringifyJsonArray(next.tasks),
      stringifyJsonArray(next.requirements),
      stringifyJsonArray(next.niceToHave),
      stringifyJsonArray(next.redFlags),
      next.summary,
      next.updatedAt,
      id,
    ],
  );

  await persistManualVacancyDatabase();
};

export const saveManualVacancyAnalysis = async (
  id: string,
  analysis: {
    matchPercent: number;
    decision: "yes" | "no";
    reason: string;
    salaryEstimate: string;
    coverLetter: string;
  },
): Promise<void> => {
  const { db } = await getManualVacancyDatabase();
  const now = new Date().toISOString();

  db.run(
    `
      UPDATE manual_vacancies
      SET
        match_percent = ?,
        decision = ?,
        reason = ?,
        estimated_salary = ?,
        salary_estimate = ?,
        cover_letter = ?,
        analyzed_at = ?,
        updated_at = ?
      WHERE id = ?
    `,
    [
      analysis.matchPercent,
      analysis.decision,
      analysis.reason,
      analysis.salaryEstimate,
      analysis.salaryEstimate,
      analysis.coverLetter,
      now,
      now,
      id,
    ],
  );

  await persistManualVacancyDatabase();
};
