import { randomUUID } from "crypto";
import {
  createCompany,
  getCompanyByHhId,
  getCompanyById,
  listCompanies,
} from "../storage/companyRepository";
import { CompanyRecord } from "../types/company";
import { extractCompanyProfile } from "./analysisService";

interface CreateCompanyOptions {
  hhId?: string;
}

export class CompanyDuplicateHhIdError extends Error {
  constructor(readonly hhId: string) {
    super(`Компания с hh id ${hhId} уже есть в базе`);
    this.name = "CompanyDuplicateHhIdError";
  }
}

export const createCompanyFromText = async (
  rawText: string,
  options: CreateCompanyOptions = {},
): Promise<CompanyRecord> => {
  const hhId = options.hhId?.trim();

  if (hhId && await getCompanyByHhId(hhId)) {
    throw new CompanyDuplicateHhIdError(hhId);
  }

  const parsed = await extractCompanyProfile(rawText);
  const now = new Date().toISOString();
  const record: CompanyRecord = {
    id: randomUUID(),
    hhId: hhId || null,
    rawText,
    name: parsed.name,
    domain: parsed.domain,
    productType: parsed.product_type,
    shortPitch: parsed.short_pitch,
    highlights: parsed.highlights,
    techLevel: parsed.tech_level,
    summary: parsed.summary,
    structuredJson: JSON.stringify(parsed, null, 2),
    createdAt: now,
    updatedAt: now,
  };

  await createCompany(record);

  return record;
};

export const getCompany = async (id: string): Promise<CompanyRecord | null> =>
  getCompanyById(id);

export const getCompanies = async (): Promise<CompanyRecord[]> => listCompanies();
