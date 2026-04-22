export interface Company {
  id: string;
  hhId: string | null;
  rawText: string;
  name: string;
  domain: string | null;
  productType: string | null;
  shortPitch: string | null;
  highlights: string[];
  techLevel: string | null;
  summary: string | null;
  structuredJson: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyRequest {
  rawText: string;
  hhId?: string;
}
