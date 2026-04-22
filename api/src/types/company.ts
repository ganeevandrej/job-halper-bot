export interface CompanyProfileFields {
  name: string;
  domain: string | null;
  productType: string | null;
  shortPitch: string | null;
  highlights: string[];
  techLevel: string | null;
}

export interface CompanyRecord extends CompanyProfileFields {
  id: string;
  hhId: string | null;
  rawText: string;
  summary: string | null;
  structuredJson: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyRequest {
  rawText: string;
  hhId?: string;
}
