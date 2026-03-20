import { VacancyAnalysis, VacancyDetails } from "../types";

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export const formatVacancyAnalysis = (
  vacancy: VacancyDetails,
  analysis: VacancyAnalysis,
): string => {
  const decisionLabel =
    analysis.decision === "yes" ? "Откликаться" : "Не откликаться";

  return [
    "<b>=== ВАКАНСИЯ ===</b>",
    escapeHtml(vacancy.title),
    `Компания: ${escapeHtml(vacancy.company)}`,
    `ЗП: ${escapeHtml(vacancy.salary)}`,
    "",
    "<b>=== АНАЛИЗ ===</b>",
    `Match: ${analysis.match_percent}%`,
    `Решение: ${decisionLabel}`,
    `Оценка зарплаты: ${escapeHtml(analysis.salary_estimate)}`,
    "",
    "<b>Причина:</b>",
    escapeHtml(analysis.reason),
    "",
    "<b>=== СОПРОВОДИТЕЛЬНОЕ ПИСЬМО ===</b>",
    escapeHtml(analysis.cover_letter),
  ].join("\n");
};
