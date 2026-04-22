import { fetchJson } from "./fetchJson";
import { Company, CreateCompanyRequest } from "./companyTypes";

export const getCompanies = async (): Promise<Company[]> =>
  fetchJson<Company[]>("/companies");

export const getCompany = async (id: string): Promise<Company> =>
  fetchJson<Company>(`/companies/${id}`);

export const createCompany = async (
  request: CreateCompanyRequest,
): Promise<Company> =>
  fetchJson<Company>("/companies", {
    method: "POST",
    body: JSON.stringify(request),
  });
