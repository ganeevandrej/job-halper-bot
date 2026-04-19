export interface SearchConfig {
  label: string;
  url: string;
}

export const SEARCH_CONFIGS: SearchConfig[] = [
  {
    label: "Вся Россия, удаленка",
    url: "https://hh.ru/search/vacancy?area=113&remote_work=1&no_magic=true&search_field=name&search_field=company_name&search_field=description&enable_snippets=false&text=%28NAME%3AFrontend+OR+NAME%3A%D0%A4%D1%80%D0%BE%D0%BD%D1%82%D0%B5%D0%BD%D0%B4+OR+NAME%3AReact+OR+NAME%3AJS+OR+NAME%3AJavaScript%29+AND+%28DESCRIPTION%3AReact+OR+DESCRIPTION%3ANext%29&excluded_text=Senior%2C+1C&professional_role=96",
  },
  {
    label: "Санкт-Петербург, любой формат",
    url: "https://hh.ru/search/vacancy?area=2&no_magic=true&search_field=name&search_field=company_name&search_field=description&enable_snippets=false&text=%28NAME%3AFrontend+OR+NAME%3A%D0%A4%D1%80%D0%BE%D0%BD%D1%82%D0%B5%D0%BD%D0%B4+OR+NAME%3AReact+OR+NAME%3AJS+OR+NAME%3AJavaScript%29+AND+%28DESCRIPTION%3AReact+OR+DESCRIPTION%3ANext%29&excluded_text=Senior%2C+1C&label=not_from_agency&professional_role=96",
  },
  {
    label: "Москва, любой формат",
    url: "https://hh.ru/search/vacancy?area=1&no_magic=true&search_field=name&search_field=company_name&search_field=description&enable_snippets=false&text=%28NAME%3AFrontend+OR+NAME%3A%D0%A4%D1%80%D0%BE%D0%BD%D1%82%D0%B5%D0%BD%D0%B4+OR+NAME%3AReact+OR+NAME%3AJS+OR+NAME%3AJavaScript%29+AND+%28DESCRIPTION%3AReact+OR+DESCRIPTION%3ANext%29&excluded_text=Senior%2C+1C&label=not_from_agency&professional_role=96",
  },
];
