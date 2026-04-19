import {
  CompetitorResumeListFilters,
  CompetitorResumeListResult,
  CompetitorResumeRecord,
  CompetitorResumeStats,
} from "../types/competitorResume";
import {
  getProfileDatabase,
  persistProfileDatabase,
} from "./profileDatabase";

const stringifyJsonArray = (items: string[]): string =>
  JSON.stringify(items.map((item) => item.trim()).filter(Boolean));

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

const nullableNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;

const mapRowToRecord = (row: Record<string, unknown>): CompetitorResumeRecord => ({
  id: String(row.id),
  hhId: typeof row.hh_id === "string" && row.hh_id ? row.hh_id : null,
  rawText: String(row.raw_text),
  hasPhoto: Boolean(row.has_photo),
  title: String(row.title),
  totalExperienceMonths: nullableNumber(row.total_experience_months),
  relevantExperienceMonths: nullableNumber(row.relevant_experience_months),
  irrelevantExperienceMonths: nullableNumber(row.irrelevant_experience_months),
  relevantExperienceSummary: String(row.relevant_experience_summary),
  salaryExpectation:
    typeof row.salary_expectation === "string" && row.salary_expectation
      ? row.salary_expectation
      : null,
  keySkills: parseJsonArray(row.key_skills_json),
  strengths: parseJsonArray(row.strengths_json),
  weaknesses: parseJsonArray(row.weaknesses_json),
  isBetterThanMine: Boolean(row.is_better_than_mine),
  comparisonScore: Number(row.comparison_score ?? 0),
  comparisonReason: String(row.comparison_reason),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

export const hasCompetitorResumeWithHhId = async (
  hhId: string,
): Promise<boolean> => {
  const normalized = hhId.trim();

  if (!normalized) {
    return false;
  }

  const { db } = await getProfileDatabase();
  const statement = db.prepare(
    "SELECT 1 FROM competitor_resumes WHERE hh_id = ? LIMIT 1",
  );

  try {
    statement.bind([normalized]);
    return statement.step();
  } finally {
    statement.free();
  }
};

export const createCompetitorResumeRecord = async (
  record: CompetitorResumeRecord,
): Promise<void> => {
  const { db } = await getProfileDatabase();

  db.run(
    `
      INSERT INTO competitor_resumes (
        id, hh_id, raw_text, has_photo, title, total_experience_months,
        relevant_experience_months, irrelevant_experience_months,
        relevant_experience_summary, salary_expectation, key_skills_json,
        strengths_json, weaknesses_json, is_better_than_mine, comparison_score,
        comparison_reason, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      record.id,
      record.hhId,
      record.rawText,
      record.hasPhoto ? 1 : 0,
      record.title,
      record.totalExperienceMonths,
      record.relevantExperienceMonths,
      record.irrelevantExperienceMonths,
      record.relevantExperienceSummary,
      record.salaryExpectation,
      stringifyJsonArray(record.keySkills),
      stringifyJsonArray(record.strengths),
      stringifyJsonArray(record.weaknesses),
      record.isBetterThanMine ? 1 : 0,
      record.comparisonScore,
      record.comparisonReason,
      record.createdAt,
      record.updatedAt,
    ],
  );

  await persistProfileDatabase();
};

export const getCompetitorResumeById = async (
  id: string,
): Promise<CompetitorResumeRecord | null> => {
  const { db } = await getProfileDatabase();
  const statement = db.prepare(`
    SELECT
      id, hh_id, raw_text, has_photo, title, total_experience_months,
      relevant_experience_months, irrelevant_experience_months,
      relevant_experience_summary, salary_expectation, key_skills_json,
      strengths_json, weaknesses_json, is_better_than_mine, comparison_score,
      comparison_reason, created_at, updated_at
    FROM competitor_resumes
    WHERE id = ?
    LIMIT 1
  `);

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

export const listCompetitorResumes = async (
  filters: Partial<CompetitorResumeListFilters> = {},
): Promise<CompetitorResumeListResult> => {
  const limit = filters.limit ?? DEFAULT_LIMIT;
  const offset = filters.offset ?? DEFAULT_OFFSET;
  const { db } = await getProfileDatabase();
  const totalStatement = db.prepare(
    "SELECT COUNT(*) AS total FROM competitor_resumes",
  );
  const itemsStatement = db.prepare(`
    SELECT
      id, hh_id, raw_text, has_photo, title, total_experience_months,
      relevant_experience_months, irrelevant_experience_months,
      relevant_experience_summary, salary_expectation, key_skills_json,
      strengths_json, weaknesses_json, is_better_than_mine, comparison_score,
      comparison_reason, created_at, updated_at
    FROM competitor_resumes
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `);

  try {
    const total = totalStatement.step()
      ? Number(totalStatement.getAsObject().total ?? 0)
      : 0;
    itemsStatement.bind([limit, offset]);
    const items: CompetitorResumeRecord[] = [];

    while (itemsStatement.step()) {
      items.push(mapRowToRecord(itemsStatement.getAsObject()));
    }

    return { items, total };
  } finally {
    totalStatement.free();
    itemsStatement.free();
  }
};

const increment = (map: Map<string, number>, label: string): void => {
  map.set(label, (map.get(label) ?? 0) + 1);
};

const mapToBuckets = (map: Map<string, number>) =>
  Array.from(map.entries()).map(([label, count]) => ({ label, count }));

const getExperienceBucket = (months: number | null): string => {
  if (months === null) return "Не указано";
  if (months < 12) return "до 1 года";
  if (months < 24) return "1-2 года";
  if (months < 36) return "2-3 года";
  if (months < 60) return "3-5 лет";
  return "5+ лет";
};

const getScoreBucket = (score: number): string => {
  if (score < 40) return "0-39";
  if (score < 60) return "40-59";
  if (score < 75) return "60-74";
  if (score < 90) return "75-89";
  return "90-100";
};

export const getCompetitorResumeStats =
  async (): Promise<CompetitorResumeStats> => {
    const { db } = await getProfileDatabase();
    const result = db.exec(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN has_photo = 1 THEN 1 ELSE 0 END) AS with_photo,
        SUM(CASE WHEN is_better_than_mine = 1 THEN 1 ELSE 0 END) AS better_than_mine,
        AVG(comparison_score) AS average_comparison_score,
        AVG(relevant_experience_months) AS average_relevant_experience_months
      FROM competitor_resumes
    `);
    const row = result[0]?.values[0];
    const averageComparisonScore = row?.[3];
    const averageRelevantExperienceMonths = row?.[4];
    const comparisonScoreBuckets = new Map<string, number>([
      ["0-39", 0],
      ["40-59", 0],
      ["60-74", 0],
      ["75-89", 0],
      ["90-100", 0],
    ]);
    const relevantExperienceBuckets = new Map<string, number>([
      ["Не указано", 0],
      ["до 1 года", 0],
      ["1-2 года", 0],
      ["2-3 года", 0],
      ["3-5 лет", 0],
      ["5+ лет", 0],
    ]);
    const photoDistribution = new Map<string, number>([
      ["С фото", 0],
      ["Без фото", 0],
    ]);
    const betterDistribution = new Map<string, number>([
      ["Сильнее моего", 0],
      ["Не сильнее", 0],
    ]);
    const rows = db.exec(`
      SELECT comparison_score, relevant_experience_months, has_photo, is_better_than_mine
      FROM competitor_resumes
    `)[0]?.values ?? [];

    for (const statsRow of rows) {
      const score = Number(statsRow[0] ?? 0);
      const relevantMonths = nullableNumber(statsRow[1]);
      increment(comparisonScoreBuckets, getScoreBucket(score));
      increment(relevantExperienceBuckets, getExperienceBucket(relevantMonths));
      increment(photoDistribution, Number(statsRow[2] ?? 0) === 1 ? "С фото" : "Без фото");
      increment(
        betterDistribution,
        Number(statsRow[3] ?? 0) === 1 ? "Сильнее моего" : "Не сильнее",
      );
    }

    return {
      total: Number(row?.[0] ?? 0),
      withPhoto: Number(row?.[1] ?? 0),
      betterThanMine: Number(row?.[2] ?? 0),
      averageComparisonScore:
        typeof averageComparisonScore === "number"
          ? Math.round(averageComparisonScore)
          : null,
      averageRelevantExperienceMonths:
        typeof averageRelevantExperienceMonths === "number"
          ? Math.round(averageRelevantExperienceMonths)
          : null,
      comparisonScoreBuckets: mapToBuckets(comparisonScoreBuckets),
      relevantExperienceBuckets: mapToBuckets(relevantExperienceBuckets),
      photoDistribution: mapToBuckets(photoDistribution),
      betterDistribution: mapToBuckets(betterDistribution),
    };
  };
