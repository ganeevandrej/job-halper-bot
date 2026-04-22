import { randomUUID } from "crypto";
import {
  createManualVacancy,
  getManualVacancyById,
  hasManualVacancyWithHhId,
  listManualVacancies,
  saveManualVacancyAnalysis,
  saveManualVacancyCoverLetter,
  updateManualVacancy,
} from "../storage/manualVacancyRepository";
import { getCompanyById } from "../storage/companyRepository";
import {
  ManualVacancyRecord,
  ManualVacancyStatus,
  UpdateManualVacancyInput,
} from "../types/manualVacancy";
import {
  analyzeVacancyFit,
  generateVacancyCoverLetter,
} from "./analysisService";
import { extractManualVacancyFields } from "./manualVacancyExtractionService";

interface CreateManualVacancyOptions {
  salaryOverride?: string;
  hhId?: string;
  companyId?: string;
  url?: string;
}

export class ManualVacancyDuplicateHhIdError extends Error {
  constructor(readonly hhId: string) {
    super(`Вакансия с hh id ${hhId} уже есть в списке`);
    this.name = "ManualVacancyDuplicateHhIdError";
  }
}

const buildHhVacancyUrl = (hhId?: string): string | null => {
  const normalized = hhId?.trim();
  return normalized ? `https://hh.ru/vacancy/${normalized}` : null;
};

export const createManualVacancyFromText = async (
  rawText: string,
  options: CreateManualVacancyOptions = {},
): Promise<ManualVacancyRecord> => {
  const hhId = options.hhId?.trim();

  if (hhId && await hasManualVacancyWithHhId(hhId)) {
    throw new ManualVacancyDuplicateHhIdError(hhId);
  }

  const now = new Date().toISOString();
  const parsed = await extractManualVacancyFields(rawText, options.salaryOverride);
  const linkedCompany = options.companyId ? await getCompanyById(options.companyId) : null;
  const company = linkedCompany?.name || parsed.company;
  const record: ManualVacancyRecord = {
    id: randomUUID(),
    hhId: hhId || null,
    companyId: linkedCompany?.id || null,
    url: options.url?.trim() || buildHhVacancyUrl(hhId),
    rawText,
    status: "new",
    ...parsed,
    company,
    matchPercent: null,
    decision: null,
    reason: null,
    salaryEstimate: null,
    coverLetter: null,
    createdAt: now,
    updatedAt: now,
    analyzedAt: null,
  };

  await createManualVacancy(record);
  const analyzed = await analyzeManualVacancyById(record.id);

  if (!analyzed) {
    throw new Error("Вакансия добавлена, но не найдена для анализа");
  }

  return analyzed;
};

export const createAndAnalyzeManualVacancy = async (
  rawText: string,
  options: CreateManualVacancyOptions = {},
): Promise<ManualVacancyRecord> => {
  return createManualVacancyFromText(rawText, options);
};

export const getManualVacancies = async (
  page: number,
  pageSize: number,
  hhId?: string,
  status?: ManualVacancyStatus,
): Promise<{
  items: ManualVacancyRecord[];
  total: number;
  page: number;
  pageSize: number;
}> => {
  const limit = Math.max(1, Math.min(pageSize, 100));
  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * limit;
  const result = await listManualVacancies({ limit, offset, hhId, status });

  return {
    items: result.items,
    total: result.total,
    page: safePage,
    pageSize: limit,
  };
};

export const getManualVacancy = async (
  id: string,
): Promise<ManualVacancyRecord | null> => getManualVacancyById(id);

export const updateManualVacancyById = async (
  id: string,
  input: UpdateManualVacancyInput,
): Promise<ManualVacancyRecord | null> => {
  const vacancy = await getManualVacancyById(id);

  if (!vacancy) {
    return null;
  }

  await updateManualVacancy(id, input);
  return getManualVacancyById(id);
};

export const analyzeManualVacancyById = async (
  id: string,
): Promise<ManualVacancyRecord | null> => {
  const vacancy = await getManualVacancyById(id);

  if (!vacancy) {
    return null;
  }

  const analysis = await analyzeVacancyFit(vacancy.rawText);
  await saveManualVacancyAnalysis(id, {
    matchPercent: analysis.match_percent,
    decision: analysis.decision,
    reason: analysis.reason,
    salaryEstimate: analysis.salary_estimate,
  });

  return getManualVacancyById(id);
};

export const generateManualVacancyCoverLetterById = async (
  id: string,
): Promise<ManualVacancyRecord | null> => {
  let vacancy = await getManualVacancyById(id);

  if (!vacancy) {
    return null;
  }

  if (
    vacancy.matchPercent === null ||
    !vacancy.decision ||
    !vacancy.reason ||
    !vacancy.salaryEstimate
  ) {
    vacancy = await analyzeManualVacancyById(id);
  }

  if (!vacancy) {
    return null;
  }

  const coverLetter = await generateVacancyCoverLetter(vacancy.rawText, {
    match_percent: vacancy.matchPercent ?? 0,
    decision: vacancy.decision ?? "no",
    reason: vacancy.reason ?? "",
    salary_estimate: vacancy.salaryEstimate ?? vacancy.estimatedSalary ?? "",
  }, vacancy.companyId ? await getCompanyById(vacancy.companyId) : null);

  await saveManualVacancyCoverLetter(id, coverLetter.cover_letter);

  return getManualVacancyById(id);
};
