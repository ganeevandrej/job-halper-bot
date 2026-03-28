export interface SearchParams {
  text: string;
  area: string;
  per_page?: number;
  page?: number;
}

export interface NormalizedVacancy {
  id: string;
  title: string;
  company: string;
  url: string;
  salary?: string;
  snippet?: string;
}
