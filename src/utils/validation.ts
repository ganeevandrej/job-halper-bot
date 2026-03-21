export const isHhVacancyUrl = (value: string): boolean => {
  try {
    const url = new URL(value.trim());
    const allowedHosts = new Set([
      "hh.ru",
      "www.hh.ru",
      "spb.hh.ru",
      "ekaterinburg.hh.ru",
      "remote.hh.ru",
    ]);

    return allowedHosts.has(url.hostname) && /\/vacancy\/\d+/.test(url.pathname);
  } catch {
    return false;
  }
};

export const extractHhVacancyId = (value: string): string | null => {
  try {
    const url = new URL(value.trim());
    const match = url.pathname.match(/\/vacancy\/(\d+)/);
    return match?.[1] || null;
  } catch {
    return null;
  }
};
