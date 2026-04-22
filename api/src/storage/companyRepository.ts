import { CompanyRecord } from "../types/company";
import {
  getManualVacancyDatabase,
  persistManualVacancyDatabase,
} from "./manualVacancyDatabase";

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

const mapNullableString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

const mapRowToCompany = (row: Record<string, unknown>): CompanyRecord => ({
  id: String(row.id),
  hhId: mapNullableString(row.hh_id),
  rawText: String(row.raw_text),
  name: String(row.name),
  domain: mapNullableString(row.domain),
  productType: mapNullableString(row.product_type),
  shortPitch: mapNullableString(row.short_pitch),
  highlights: parseJsonArray(row.highlights_json),
  techLevel: mapNullableString(row.tech_level),
  summary: mapNullableString(row.summary),
  structuredJson: mapNullableString(row.structured_json),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

export const createCompany = async (company: CompanyRecord): Promise<void> => {
  const { db } = await getManualVacancyDatabase();

  db.run(
    `
      INSERT INTO companies (
        id, hh_id, raw_text, name, domain, product_type, short_pitch,
        highlights_json, tech_level, summary, structured_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      company.id,
      company.hhId,
      company.rawText,
      company.name,
      company.domain,
      company.productType,
      company.shortPitch,
      stringifyJsonArray(company.highlights),
      company.techLevel,
      company.summary,
      company.structuredJson,
      company.createdAt,
      company.updatedAt,
    ],
  );

  await persistManualVacancyDatabase();
};

export const getCompanyById = async (
  id: string,
): Promise<CompanyRecord | null> => {
  const { db } = await getManualVacancyDatabase();
  const statement = db.prepare(`
    SELECT
      id, hh_id, raw_text, name, domain, product_type, short_pitch,
      highlights_json, tech_level, summary, structured_json, created_at, updated_at
    FROM companies
    WHERE id = ?
    LIMIT 1
  `);

  try {
    statement.bind([id]);

    if (!statement.step()) {
      return null;
    }

    return mapRowToCompany(statement.getAsObject());
  } finally {
    statement.free();
  }
};

export const getCompanyByHhId = async (
  hhId: string,
): Promise<CompanyRecord | null> => {
  const normalized = hhId.trim();

  if (!normalized) {
    return null;
  }

  const { db } = await getManualVacancyDatabase();
  const statement = db.prepare(`
    SELECT
      id, hh_id, raw_text, name, domain, product_type, short_pitch,
      highlights_json, tech_level, summary, structured_json, created_at, updated_at
    FROM companies
    WHERE hh_id = ?
    LIMIT 1
  `);

  try {
    statement.bind([normalized]);

    if (!statement.step()) {
      return null;
    }

    return mapRowToCompany(statement.getAsObject());
  } finally {
    statement.free();
  }
};

export const listCompanies = async (): Promise<CompanyRecord[]> => {
  const { db } = await getManualVacancyDatabase();
  const statement = db.prepare(`
    SELECT
      id, hh_id, raw_text, name, domain, product_type, short_pitch,
      highlights_json, tech_level, summary, structured_json, created_at, updated_at
    FROM companies
    ORDER BY updated_at DESC, created_at DESC
  `);

  try {
    const items: CompanyRecord[] = [];

    while (statement.step()) {
      items.push(mapRowToCompany(statement.getAsObject()));
    }

    return items;
  } finally {
    statement.free();
  }
};
