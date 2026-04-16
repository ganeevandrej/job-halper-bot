import { randomUUID } from "crypto";
import {
  createManualVacancy,
  getManualVacancyById,
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
  url: "",
});

export const createAndAnalyzeManualVacancy = async (
  rawText: string,
  salaryOverride?: string,
): Promise<ManualVacancyRecord> => {
  const now = new Date().toISOString();
  const parsed = await extractManualVacancyFields(rawText, salaryOverride);
  const initialRecord: ManualVacancyRecord = {
    id: randomUUID(),
    rawText,
    status: "new",
    ...parsed,
    matchPercent: null,
    decision: null,
    reason: null,
    salaryEstimate: null,
    coverLetter: null,
    createdAt: now,
    updatedAt: now,
    analyzedAt: null,
  };

  const analysis = await analyzeVacancy(buildVacancyDetails(initialRecord));
  const analyzedAt = new Date().toISOString();
  const record: ManualVacancyRecord = {
    ...initialRecord,
    estimatedSalary: analysis.salary_estimate,
    matchPercent: analysis.match_percent,
    decision: analysis.decision,
    reason: analysis.reason,
    salaryEstimate: analysis.salary_estimate,
    coverLetter: analysis.cover_letter,
    updatedAt: analyzedAt,
    analyzedAt,
  };

  await createManualVacancy(record);
  return record;
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

  const parsed = await extractManualVacancyFields(vacancy.rawText);
  await updateManualVacancy(id, parsed);

  const updatedVacancy = await getManualVacancyById(id);

  if (!updatedVacancy) {
    return null;
  }

  const analysis = await analyzeVacancy(buildVacancyDetails(updatedVacancy));
  await saveManualVacancyAnalysis(id, {
    matchPercent: analysis.match_percent,
    decision: analysis.decision,
    reason: analysis.reason,
    salaryEstimate: analysis.salary_estimate,
    coverLetter: analysis.cover_letter,
  });

  return getManualVacancyById(id);
};
