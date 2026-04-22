import { useEffect, useMemo, useState } from "react";
import {
  analyzeManualVacancy,
  generateManualVacancyCoverLetter,
  getManualVacancies,
  getManualVacancy,
  updateManualVacancy,
} from "./manualVacancyApi";
import {
  ManualVacancy,
  ManualVacancyStatus,
} from "./manualVacancyTypes";

const PAGE_SIZE = 20;

type VacancySortMode = "default" | "company_asc";

const STATUS_LABELS: Record<ManualVacancyStatus, string> = {
  new: "Новая",
  analyzed: "Ожидает",
  applied: "Откликнулся",
  not_fit: "Не подходит",
  archived: "В архиве",
};

const STATUS_FILTER_OPTIONS: Array<{
  label: string;
  value: ManualVacancyStatus | "";
}> = [
  { label: "Все статусы", value: "" },
  { label: STATUS_LABELS.new, value: "new" },
  { label: STATUS_LABELS.analyzed, value: "analyzed" },
  { label: STATUS_LABELS.applied, value: "applied" },
  { label: STATUS_LABELS.not_fit, value: "not_fit" },
  { label: STATUS_LABELS.archived, value: "archived" },
];

const formatList = (items: string[]): string =>
  items.length > 0 ? items.join(", ") : "-";

const DetailList = ({ items }: { items: string[] }) =>
  items.length > 0 ? (
    <ul className="detailList">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  ) : (
    <div>-</div>
  );

function VacancyListPage() {
  const [items, setItems] = useState<ManualVacancy[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedVacancy, setSelectedVacancy] = useState<ManualVacancy | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hhIdDraft, setHhIdDraft] = useState("");
  const [hhIdFilter, setHhIdFilter] = useState("");
  const [statusDraft, setStatusDraft] = useState<ManualVacancyStatus | "">("");
  const [statusFilter, setStatusFilter] = useState<ManualVacancyStatus | "">("");
  const [sortMode, setSortMode] = useState<VacancySortMode>("default");
  const [listLoading, setListLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingCoverLetter, setGeneratingCoverLetter] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const visibleItems = useMemo(() => {
    if (sortMode === "default") {
      return items;
    }

    return [...items].sort((left, right) => {
      const companyCompare = left.company.localeCompare(right.company, "ru", {
        sensitivity: "base",
      });

      if (companyCompare !== 0) {
        return companyCompare;
      }

      return left.title.localeCompare(right.title, "ru", {
        sensitivity: "base",
      });
    });
  }, [items, sortMode]);

  const loadList = async (
    nextPage: number,
    nextHhId: string,
    nextStatus: ManualVacancyStatus | "",
  ) => {
    setListLoading(true);
    setError(null);

    try {
      const result = await getManualVacancies(
        nextPage,
        PAGE_SIZE,
        nextHhId,
        nextStatus,
      );
      setItems(result.items);
      setTotal(result.total);

      if (selectedId && !result.items.some((item) => item.id === selectedId)) {
        setSelectedId(null);
        setSelectedVacancy(null);
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Не удалось загрузить список вакансий.",
      );
    } finally {
      setListLoading(false);
    }
  };

  const loadDetails = async (id: string) => {
    setDetailsLoading(true);
    setError(null);

    try {
      setSelectedVacancy(await getManualVacancy(id));
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Не удалось загрузить вакансию.",
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    void loadList(page, hhIdFilter, statusFilter);
  }, [page, hhIdFilter, statusFilter]);

  useEffect(() => {
    if (selectedId) {
      void loadDetails(selectedId);
    }
  }, [selectedId]);

  const applyFilter = () => {
    setPage(1);
    setHhIdFilter(hhIdDraft.trim());
    setStatusFilter(statusDraft);
  };

  const clearFilter = () => {
    setHhIdDraft("");
    setStatusDraft("");
    setPage(1);
    setHhIdFilter("");
    setStatusFilter("");
  };

  const updateStatus = async (status: ManualVacancyStatus) => {
    if (!selectedVacancy) {
      return;
    }

    setStatusUpdating(true);
    setError(null);

    try {
      const vacancy = await updateManualVacancy(selectedVacancy.id, { status });
      setSelectedVacancy(vacancy);
      await loadList(page, hhIdFilter, statusFilter);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Не удалось обновить статус вакансии.",
      );
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedVacancy) {
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const vacancy = await analyzeManualVacancy(selectedVacancy.id);
      setSelectedVacancy(vacancy);
      await loadList(page, hhIdFilter, statusFilter);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Не удалось проанализировать вакансию.",
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!selectedVacancy) {
      return;
    }

    setGeneratingCoverLetter(true);
    setError(null);

    try {
      const vacancy = await generateManualVacancyCoverLetter(selectedVacancy.id);
      setSelectedVacancy(vacancy);
      await loadList(page, hhIdFilter, statusFilter);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Не удалось составить сопроводительное письмо.",
      );
    } finally {
      setGeneratingCoverLetter(false);
    }
  };

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <div className="eyebrow">Вакансии</div>
          <h1>Список вакансий</h1>
        </div>
      </header>

      {error ? <div className="errorBanner">{error}</div> : null}

      <section className="workspace">
        <div className="panel">
          <div className="panelHeader">
            <h2>Список</h2>
            <span className="listMeta">
              {listLoading ? "Загрузка..." : `Всего: ${total}`}
            </span>
          </div>

          <div className="filterBar">
            <input
              value={hhIdDraft}
              onChange={(event) => setHhIdDraft(event.target.value)}
              placeholder="Фильтр по hh id"
            />
            <select
              value={statusDraft}
              onChange={(event) =>
                setStatusDraft(event.target.value as ManualVacancyStatus | "")
              }
            >
              {STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={sortMode}
              onChange={(event) =>
                setSortMode(event.target.value as VacancySortMode)
              }
            >
              <option value="default">По умолчанию</option>
              <option value="company_asc">Компания А-Я</option>
            </select>
            <button className="secondaryButton" type="button" onClick={applyFilter}>
              Найти
            </button>
            <button className="secondaryButton" type="button" onClick={clearFilter}>
              Сбросить
            </button>
          </div>

          <div className="listMeta">
            <span>
              {sortMode === "company_asc"
                ? "Список отсортирован по названию компании."
                : "По умолчанию выше вакансии с большим совпадением."}
            </span>
            <span>Страница {page} / {totalPages}</span>
          </div>

          <div className="vacancyList">
            {visibleItems.map((item) => (
              <button
                key={item.id}
                className={`vacancyRow ${selectedId === item.id ? "active" : ""}`}
                type="button"
                onClick={() => setSelectedId(item.id)}
              >
                <div className="vacancyRowTop">
                  <strong>{item.title}</strong>
                  <span className={`statusBadge status-${item.status}`}>
                    {STATUS_LABELS[item.status]}
                  </span>
                </div>
                <div className="vacancyRowMeta">{item.company}</div>
                <div className="vacancyRowMeta">hh id: {item.hhId || "-"}</div>
                <div className="vacancyRowMeta">company id: {item.companyId || "-"}</div>
                <div className="vacancyRowMeta">
                  Совпадение: {item.matchPercent ?? "-"}%
                </div>
              </button>
            ))}

            {!listLoading && visibleItems.length === 0 ? (
              <div className="emptyState">Вакансии не найдены.</div>
            ) : null}
          </div>

          <div className="pagination">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
            >
              Назад
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
            >
              Вперед
            </button>
          </div>
        </div>

        <div className="panel detailsPanel">
          <div className="panelHeader">
            <h2>Детали</h2>
            <div className="detailsActions">
              <button
                className="secondaryButton"
                type="button"
                onClick={() => void updateStatus("applied")}
                disabled={
                  !selectedVacancy ||
                  statusUpdating ||
                  selectedVacancy.status === "applied"
                }
              >
                Откликнулся
              </button>
              <button
                className="secondaryButton"
                type="button"
                onClick={() => void updateStatus("not_fit")}
                disabled={
                  !selectedVacancy ||
                  statusUpdating ||
                  selectedVacancy.status === "not_fit"
                }
              >
                Не подходит
              </button>
              <button
                className="secondaryButton"
                type="button"
                onClick={() => void updateStatus("archived")}
                disabled={
                  !selectedVacancy ||
                  statusUpdating ||
                  selectedVacancy.status === "archived"
                }
              >
                В архив
              </button>
              <button
                className="primaryButton"
                type="button"
                onClick={() => void handleAnalyze()}
                disabled={!selectedVacancy || analyzing}
              >
                {analyzing ? "Анализирую..." : "Проверить совместимость заново"}
              </button>
              <button
                className="primaryButton"
                type="button"
                onClick={() => void handleGenerateCoverLetter()}
                disabled={!selectedVacancy || generatingCoverLetter}
              >
                {generatingCoverLetter
                  ? "Составляю письмо..."
                  : selectedVacancy?.coverLetter
                    ? "Составить письмо заново"
                    : "Составить письмо"}
              </button>
            </div>
          </div>

          {detailsLoading ? (
            <div className="emptyState">Загружаю детали...</div>
          ) : null}

          {!detailsLoading && selectedVacancy ? (
            <div className="detailsContent">
              <div className="detailBlock">
                <h3>{selectedVacancy.title}</h3>
                <p>{selectedVacancy.company}</p>
                <p>{selectedVacancy.salary || "Зарплата не указана"}</p>
                {selectedVacancy.url ? (
                  <a href={selectedVacancy.url} target="_blank" rel="noreferrer">
                    Открыть на hh.ru
                  </a>
                ) : null}
              </div>

              <div className="detailGrid">
                <div>
                  <span className="detailLabel">Компания</span>
                  <div>{selectedVacancy.company}</div>
                </div>
                <div>
                  <span className="detailLabel">hh id</span>
                  <div>{selectedVacancy.hhId || "-"}</div>
                </div>
                <div>
                  <span className="detailLabel">company id</span>
                  <div>{selectedVacancy.companyId || "-"}</div>
                </div>
                <div>
                  <span className="detailLabel">Совпадение</span>
                  <div>{selectedVacancy.matchPercent ?? "-"}%</div>
                </div>
                <div>
                  <span className="detailLabel">Подходит</span>
                  <div>
                    {selectedVacancy.decision === "yes"
                      ? "Да"
                      : selectedVacancy.decision === "no"
                        ? "Нет"
                        : "-"}
                  </div>
                </div>
                <div>
                  <span className="detailLabel">Город</span>
                  <div>{selectedVacancy.location || "-"}</div>
                </div>
                <div>
                  <span className="detailLabel">Формат</span>
                  <div>{formatList(selectedVacancy.formats)}</div>
                </div>
                <div>
                  <span className="detailLabel">Грейд</span>
                  <div>{selectedVacancy.grade}</div>
                </div>
              </div>

              <div className="detailBlock">
                <span className="detailLabel">Стек</span>
                <div className="tagRow">
                  {selectedVacancy.stack.length > 0
                    ? selectedVacancy.stack.map((item) => (
                        <span className="detailTag" key={item}>
                          {item}
                        </span>
                      ))
                    : "-"}
                </div>
              </div>

              <div className="detailBlock">
                <span className="detailLabel">Задачи</span>
                <DetailList items={selectedVacancy.tasks} />
              </div>

              <div className="detailBlock">
                <span className="detailLabel">Требования</span>
                <DetailList items={selectedVacancy.requirements} />
              </div>

              <div className="detailBlock">
                <span className="detailLabel">Причина</span>
                <pre>{selectedVacancy.reason || "-"}</pre>
              </div>

              <div className="detailBlock">
                <span className="detailLabel">Оценка зарплаты</span>
                <pre>{selectedVacancy.salaryEstimate || selectedVacancy.estimatedSalary || "-"}</pre>
              </div>

              <div className="detailBlock">
                <span className="detailLabel">Сопроводительное письмо</span>
                <pre>{selectedVacancy.coverLetter || "-"}</pre>
              </div>
            </div>
          ) : null}

          {!detailsLoading && !selectedVacancy ? (
            <div className="emptyState">Выбери вакансию из списка.</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default VacancyListPage;
