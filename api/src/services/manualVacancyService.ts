import { randomUUID } from "crypto";
import {
  createManualVacancy,
  getManualVacancyById,
  hasManualVacancyWithHhId,
  listManualVacancies,
  saveManualVacancyAnalysis,
  updateManualVacancy,
} from "../storage/manualVacancyRepository";
import { VacancyDetails } from "../types";
import {
  ManualVacancyRecord,
  UpdateManualVacancyInput,
} from "../types/manualVacancy";
import { analyzeVacancy } from "./analysisService";
import { extractManualVacancyFields } from "./manualVacancyExtractionService";

const FALLBACK_VALUE = "Unknown";

interface CreateManualVacancyOptions {
  salaryOverride?: string;
  hhId?: string;
  url?: string;
  company?: string;
}

export class ManualVacancyDuplicateHhIdError extends Error {
  constructor(readonly hhId: string) {
    super(`Manual vacancy with hhId ${hhId} already exists`);
    this.name = "ManualVacancyDuplicateHhIdError";
  }
}

const buildHhVacancyUrl = (hhId?: string): string | null => {
  const normalized = hhId?.trim();
  return normalized ? `https://hh.ru/vacancy/${normalized}` : null;
};

const buildDescriptionForAnalysis = (
  vacancy: ManualVacancyRecord,
): string => [
  vacancy.summary,
  "",
  "Stated salary:",
  vacancy.salary ?? FALLBACK_VALUE,
  "",
  "Estimated salary:",
  vacancy.estimatedSalary ?? FALLBACK_VALUE,
  "",
  "Formats:",
  vacancy.formats.join(", ") || FALLBACK_VALUE,
  "",
  "Stack:",
  vacancy.stack.join(", ") || FALLBACK_VALUE,
  "",
  "Tasks:",
  vacancy.tasks.map((item) => `- ${item}`).join("\n") || FALLBACK_VALUE,
  "",
  "Requirements:",
  vacancy.requirements.map((item) => `- ${item}`).join("\n") || FALLBACK_VALUE,
  "",
  "Nice to have:",
  vacancy.niceToHave.map((item) => `- ${item}`).join("\n") || FALLBACK_VALUE,
  "",
  "Red flags:",
  vacancy.redFlags.map((item) => `- ${item}`).join("\n") || FALLBACK_VALUE,
  "",
  "Raw vacancy text:",
  vacancy.rawText,
].join("\n");

const buildVacancyDetails = (vacancy: ManualVacancyRecord): VacancyDetails => ({
  title: vacancy.title,
  company: vacancy.company,
  salary: vacancy.salary ?? "Not specified",
  description: buildDescriptionForAnalysis(vacancy),
  url: vacancy.url ?? "",
});

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
  const company = options.company?.trim() || parsed.company;
  const record: ManualVacancyRecord = {
    id: randomUUID(),
    hhId: hhId || null,
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
  return record;
};

export const createAndAnalyzeManualVacancy = async (
  rawText: string,
  options: CreateManualVacancyOptions = {},
): Promise<ManualVacancyRecord> => {
  const record = await createManualVacancyFromText(rawText, options);
  const analyzed = await analyzeManualVacancyById(record.id);

  if (!analyzed) {
    throw new Error("Created manual vacancy was not found for analysis");
  }

  return analyzed;
};

export const getManualVacancies = async (
  page: number,
  pageSize: number,
): Promise<{
  items: ManualVacancyRecord[];
  total: number;
  page: number;
  pageSize: number;
}> => {
  const limit = Math.max(1, Math.min(pageSize, 100));
  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * limit;
  const result = await listManualVacancies({ limit, offset });

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

  const analysis = await analyzeVacancy(buildVacancyDetails(vacancy));
  await saveManualVacancyAnalysis(id, {
    matchPercent: analysis.match_percent,
    decision: analysis.decision,
    reason: analysis.reason,
    salaryEstimate: analysis.salary_estimate,
    coverLetter: analysis.cover_letter,
  });

  return getManualVacancyById(id);
};
