import {
  ManualVacancyListFilters,
  ManualVacancyRecord,
  ManualVacancyStats,
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
    value === "analyzed" ||
    value === "applied" ||
    value === "not_fit" ||
    value === "archived"
  ) {
    return value;
  }

  if (value === "viewed") {
    return "new";
  }

  if (value === "rejected") {
    return "not_fit";
  }

  if (value === "hidden") {
    return "archived";
  }

  return "new";
};

const mapRowToManualVacancy = (
  row: Record<string, unknown>,
): ManualVacancyRecord => ({
  id: String(row.id),
  hhId: typeof row.hh_id === "string" && row.hh_id ? row.hh_id : null,
  companyId:
    typeof row.company_id === "string" && row.company_id ? row.company_id : null,
  url: typeof row.url === "string" && row.url ? row.url : null,
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

const increment = (map: Map<string, number>, key: string): void => {
  map.set(key, (map.get(key) ?? 0) + 1);
};

const mapToBuckets = (map: Map<string, number>) =>
  Array.from(map.entries()).map(([label, count]) => ({ label, count }));

const parseSalaryValue = (value: unknown): number | null => {
  const text = typeof value === "string" && value.trim()
    ? value.trim()
    : null;

  if (!text) {
    return null;
  }

  const numbers = text.match(/\d+(?:[\s.]\d{3})*/g)
    ?.map((value) => Number(value.replace(/[^\d]/g, "")))
    .filter((value) => Number.isFinite(value) && value > 0) ?? [];

  if (numbers.length === 0) {
    return null;
  }

  const normalized = numbers.map((value) => value < 1000 ? value * 1000 : value);
  const useful = normalized.slice(0, 2);
  const average = Math.round(
    useful.reduce((sum, value) => sum + value, 0) / useful.length,
  );

  if (/год|year|annual/i.test(text) && average > 500000) {
    return Math.round(average / 12);
  }

  return average;
};

const getSalaryBucket = (salary: number | null): string => {
  if (salary === null) return "Не указана";
  if (salary < 100000) return "до 100к";
  if (salary < 150000) return "100-150к";
  if (salary < 200000) return "150-200к";
  if (salary < 250000) return "200-250к";
  if (salary < 300000) return "250-300к";
  return "300к+";
};

const formatLabels: Record<string, string> = {
  remote: "Удаленка",
  hybrid: "Гибрид",
  office: "Офис",
  "on-site": "Офис",
  "on site": "Офис",
  onsite: "Офис",
  "на месте работодателя": "Офис",
  "удаленка": "Удаленка",
  "удаленно": "Удаленка",
  "удалённо": "Удаленка",
  "гибрид": "Гибрид",
  relocation: "Релокация",
  unknown: "Не указан",
};

const gradeLabels: Record<string, string> = {
  junior: "Junior",
  junior_plus: "Junior+",
  middle: "Middle",
  middle_plus: "Middle+",
  senior: "Senior",
  lead: "Lead",
  unknown: "Не указан",
};

export const createManualVacancy = async (
  vacancy: ManualVacancyRecord,
): Promise<void> => {
  const { db } = await getManualVacancyDatabase();

  db.run(
    `
      INSERT INTO manual_vacancies (
        id, hh_id, company_id, url, raw_text, status, title, company, salary, estimated_salary, format, formats_json,
        location, grade, stack_json, tasks_json, requirements_json, nice_to_have_json,
        red_flags_json, summary, match_percent, decision, reason,
        salary_estimate, cover_letter, created_at, updated_at, analyzed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      vacancy.id,
      vacancy.hhId,
      vacancy.companyId,
      vacancy.url,
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

export const hasManualVacancyWithHhId = async (
  hhId: string,
): Promise<boolean> => {
  const normalized = hhId.trim();

  if (!normalized) {
    return false;
  }

  const { db } = await getManualVacancyDatabase();
  const statement = db.prepare(
    "SELECT 1 FROM manual_vacancies WHERE hh_id = ? LIMIT 1",
  );

  try {
    statement.bind([normalized]);
    return statement.step();
  } finally {
    statement.free();
  }
};

export const listManualVacancies = async (
  filters: Partial<ManualVacancyListFilters> = {},
): Promise<{ items: ManualVacancyRecord[]; total: number }> => {
  const limit = filters.limit ?? DEFAULT_LIMIT;
  const offset = filters.offset ?? DEFAULT_OFFSET;
  const { db } = await getManualVacancyDatabase();
  const hhId = filters.hhId?.trim();
  const whereParts: string[] = [];
  const whereParams: string[] = [];

  if (hhId) {
    whereParts.push("hh_id LIKE ?");
    whereParams.push(`%${hhId}%`);
  }

  if (filters.status) {
    whereParts.push("status = ?");
    whereParams.push(filters.status);
  }

  const whereSql = whereParts.length > 0
    ? `WHERE ${whereParts.join(" AND ")}`
    : "";

  const totalStatement = db.prepare(
    `SELECT COUNT(*) AS total FROM manual_vacancies ${whereSql}`,
  );
  const itemsStatement = db.prepare(`
      SELECT
      id, hh_id, company_id, url, raw_text, status, title, company, salary, estimated_salary, format, formats_json,
      location, grade, stack_json, tasks_json, requirements_json, nice_to_have_json,
      red_flags_json, summary, match_percent, decision, reason,
      salary_estimate, cover_letter, created_at, updated_at, analyzed_at
    FROM manual_vacancies
    ${whereSql}
    ORDER BY match_percent IS NULL ASC, match_percent DESC, created_at DESC
    LIMIT ? OFFSET ?
  `);

  try {
    totalStatement.bind(whereParams);
    const total = totalStatement.step()
      ? Number(totalStatement.getAsObject().total ?? 0)
      : 0;

    itemsStatement.bind([...whereParams, limit, offset]);
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

export const getManualVacancyStats =
  async (): Promise<ManualVacancyStats> => {
    const { db } = await getManualVacancyDatabase();
    const result = db.exec(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) AS new_count,
        SUM(CASE WHEN status = 'analyzed' THEN 1 ELSE 0 END) AS analyzed_count,
        SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) AS applied_count,
        SUM(CASE WHEN status = 'not_fit' THEN 1 ELSE 0 END) AS not_fit_count,
        SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) AS archived_count,
        SUM(CASE WHEN match_percent IS NOT NULL THEN 1 ELSE 0 END) AS with_match_count,
        AVG(match_percent) AS average_match_percent
      FROM manual_vacancies
    `);

    const row = result[0]?.values[0];
    const average = row?.[7];
    const salaryBuckets = new Map<string, number>([
      ["Не указана", 0],
      ["до 100к", 0],
      ["100-150к", 0],
      ["150-200к", 0],
      ["200-250к", 0],
      ["250-300к", 0],
      ["300к+", 0],
    ]);
    const formatDistribution = new Map<string, number>();
    const gradeDistribution = new Map<string, number>();
    const distributionRows = db.exec(`
      SELECT salary, formats_json, format, grade
      FROM manual_vacancies
    `)[0]?.values ?? [];

    for (const distributionRow of distributionRows) {
      const salary = parseSalaryValue(distributionRow[0]);
      increment(salaryBuckets, getSalaryBucket(salary));

      const formats = parseJsonArray(distributionRow[1]).length > 0
        ? parseJsonArray(distributionRow[1])
        : typeof distributionRow[2] === "string"
          ? [distributionRow[2]]
          : [];

      if (formats.length === 0) {
        increment(formatDistribution, formatLabels.unknown);
      } else {
        for (const format of formats) {
          increment(formatDistribution, formatLabels[format] ?? format);
        }
      }

      const grade = typeof distributionRow[3] === "string"
        ? distributionRow[3]
        : "unknown";
      increment(gradeDistribution, gradeLabels[grade] ?? grade);
    }

    return {
      total: Number(row?.[0] ?? 0),
      new: Number(row?.[1] ?? 0),
      analyzed: Number(row?.[2] ?? 0),
      applied: Number(row?.[3] ?? 0),
      notFit: Number(row?.[4] ?? 0),
      archived: Number(row?.[5] ?? 0),
      withMatch: Number(row?.[6] ?? 0),
      averageMatchPercent:
        typeof average === "number" ? Math.round(average) : null,
      salaryBuckets: mapToBuckets(salaryBuckets),
      formatDistribution: mapToBuckets(formatDistribution),
      gradeDistribution: mapToBuckets(gradeDistribution),
    };
  };

export const getManualVacancyById = async (
  id: string,
): Promise<ManualVacancyRecord | null> => {
  const { db } = await getManualVacancyDatabase();
  const statement = db.prepare(`
      SELECT
      id, hh_id, company_id, url, raw_text, status, title, company, salary, estimated_salary, format, formats_json,
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
        hh_id = ?,
        company_id = ?,
        url = ?,
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
      next.hhId,
      next.companyId,
      next.url,
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
        status = CASE
          WHEN status IN ('applied', 'not_fit', 'archived') THEN status
          ELSE 'analyzed'
        END,
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
      now,
      now,
      id,
    ],
  );

  await persistManualVacancyDatabase();
};

export const saveManualVacancyCoverLetter = async (
  id: string,
  coverLetter: string,
): Promise<void> => {
  const { db } = await getManualVacancyDatabase();
  const now = new Date().toISOString();

  db.run(
    `
      UPDATE manual_vacancies
      SET
        cover_letter = ?,
        updated_at = ?
      WHERE id = ?
    `,
    [
      coverLetter,
      now,
      id,
    ],
  );

  await persistManualVacancyDatabase();
};
