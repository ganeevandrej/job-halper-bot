import { fetchVacancyDetailsFromApi } from "../parser/hhApiClient";
import {
  getVacancyById,
  listVacancies,
  saveVacancyAnalysis,
  updateVacancyStatus,
  updateVacancyDescription,
} from "../storage/vacancyRepository";
import { VacancyDetails, VacancyRecord, VacancyStatus } from "../types";
import { analyzeVacancy } from "./analysisService";

export const getVacancies = async (
  page: number,
  pageSize: number,
  statuses?: VacancyStatus[],
): Promise<{
  items: VacancyRecord[];
  total: number;
  page: number;
  pageSize: number;
}> => {
  const limit = Math.max(1, Math.min(pageSize, 100));
  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * limit;
  const result = await listVacancies({ limit, offset, statuses });

  return {
    items: result.items,
    total: result.total,
    page: safePage,
    pageSize: limit,
  };
};

export const getVacancy = async (id: string): Promise<VacancyRecord | null> => {
  const vacancy = await getVacancyById(id);

  if (!vacancy) {
    return null;
  }

  if (vacancy.description) {
    return vacancy;
  }

  const details = await fetchVacancyDetailsFromApi(vacancy.url);
  await updateVacancyDescription(id, details.description);

  return getVacancyById(id);
};

const buildDetails = (vacancy: VacancyRecord): VacancyDetails => ({
  title: vacancy.title,
  company: vacancy.company,
  salary: vacancy.salary,
  description: vacancy.description || "",
  url: vacancy.url,
});

export const analyzeVacancyById = async (
  id: string,
): Promise<VacancyRecord | null> => {
  const vacancy = await getVacancyById(id);

  if (!vacancy) {
    return null;
  }

  let details = buildDetails(vacancy);

  if (!details.description) {
    const apiDetails = await fetchVacancyDetailsFromApi(vacancy.url);
    await updateVacancyDescription(id, apiDetails.description);
    details = apiDetails;
  }

  const analysis = await analyzeVacancy(details);
  await saveVacancyAnalysis(id, analysis);

  return getVacancyById(id);
};

export const setVacancyStatus = async (
  id: string,
  status: VacancyStatus,
): Promise<VacancyRecord | null> => {
  const vacancy = await getVacancyById(id);

  if (!vacancy) {
    return null;
  }

  await updateVacancyStatus(id, status);
  return getVacancyById(id);
};
