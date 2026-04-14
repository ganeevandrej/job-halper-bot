import { useEffect, useState } from "react";
import {
  analyzeVacancy,
  getStats,
  getVacancies,
  getVacancy,
  runSearch,
  updateVacancyStatus,
} from "./api";
import { Vacancy, VacancyStats, VacancyStatus } from "./types";

const PAGE_SIZE = 20;
const DEFAULT_STATUSES: VacancyStatus[] = ["new", "viewed"];

const STATUS_OPTIONS: Array<{ label: string; value: VacancyStatus }> = [
  { label: "Новые", value: "new" },
  { label: "Просмотрены", value: "viewed" },
  { label: "Отклонены", value: "rejected" },
  { label: "Откликнулся", value: "applied" },
  { label: "Скрытые", value: "hidden" },
];

const STATUS_LABELS: Record<VacancyStatus, string> = {
  new: "Новая",
  viewed: "Просмотрена",
  rejected: "Отклонена",
  applied: "Откликнулся",
  hidden: "Скрыта",
};

const formatDate = (value: string | null): string => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
};

const getInitialVacancyId = (): string | null =>
  new URLSearchParams(window.location.search).get("vacancyId");

function App() {
  const [items, setItems] = useState<Vacancy[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(getInitialVacancyId);
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);
  const [stats, setStats] = useState<VacancyStats | null>(null);
  const [page, setPage] = useState(1);
  const [statuses, setStatuses] = useState<VacancyStatus[]>(DEFAULT_STATUSES);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadStats = async () => {
    setStats(await getStats());
  };

  const loadList = async (nextPage: number, nextStatuses: VacancyStatus[]) => {
    setListLoading(true);
    setError(null);

    try {
      const result = await getVacancies(nextPage, PAGE_SIZE, nextStatuses);
      setItems(result.items);
      setTotal(result.total);

      if (result.items.length === 0) {
        setSelectedId(null);
        setSelectedVacancy(null);
        return;
      }

      if (selectedId && !result.items.some((item) => item.id === selectedId)) {
        setSelectedId(null);
        setSelectedVacancy(null);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить вакансии");
    } finally {
      setListLoading(false);
    }
  };

  const syncAfterChange = async (vacancy?: Vacancy | null) => {
    if (vacancy) {
      setSelectedVacancy(vacancy);
      setSelectedId(vacancy.status === "hidden" && !statuses.includes("hidden") ? null : vacancy.id);
    }

    await loadStats();
    await loadList(page, statuses);
  };

  const markViewedIfNeeded = async (vacancy: Vacancy) => {
    if (vacancy.status !== "new") {
      setSelectedVacancy(vacancy);
      return;
    }

    try {
      const updated = await updateVacancyStatus(vacancy.id, "viewed");
      setSelectedVacancy(updated);
      await loadStats();
      await loadList(page, statuses);
    } catch {
      setSelectedVacancy(vacancy);
    }
  };

  const loadVacancyDetails = async (id: string) => {
    setDetailsLoading(true);
    setError(null);

    try {
      const vacancy = await getVacancy(id);
      await markViewedIfNeeded(vacancy);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить вакансию");
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    void loadStats();
  }, []);

  useEffect(() => {
    void loadList(page, statuses);
  }, [page, statuses]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("vacancyId", selectedId);
    window.history.replaceState({}, "", url.toString());

    void loadVacancyDetails(selectedId);
  }, [selectedId]);

  const handleRunSearch = async () => {
    setSearching(true);
    setError(null);

    try {
      await runSearch();
      await loadStats();
      await loadList(1, statuses);
      setPage(1);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось выполнить поиск");
    } finally {
      setSearching(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedId) {
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const vacancy = await analyzeVacancy(selectedId);
      await syncAfterChange(vacancy);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось выполнить анализ");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleStatusChange = async (nextStatus: VacancyStatus) => {
    if (!selectedVacancy) {
      return;
    }

    setStatusUpdating(true);
    setError(null);

    try {
      const vacancy = await updateVacancyStatus(selectedVacancy.id, nextStatus);
      await syncAfterChange(vacancy);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось обновить статус");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleHide = async (event: React.MouseEvent, vacancyId: string) => {
    event.stopPropagation();
    setStatusUpdating(true);
    setError(null);

    try {
      const vacancy = await updateVacancyStatus(vacancyId, "hidden");

      if (selectedId === vacancyId) {
        setSelectedVacancy(null);
      }

      await syncAfterChange(vacancy);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось скрыть вакансию");
    } finally {
      setStatusUpdating(false);
    }
  };

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <div className="eyebrow">Job Helper</div>
          <h1>Вакансии</h1>
        </div>
        <button className="primaryButton" onClick={handleRunSearch} disabled={searching}>
          {searching ? "Ищу..." : "Запустить поиск"}
        </button>
      </header>

      <section className="statsGrid">
        <article className="statCard">
          <span>Всего</span>
          <strong>{stats?.total ?? "-"}</strong>
        </article>
        <article className="statCard">
          <span>Новые</span>
          <strong>{stats?.new ?? "-"}</strong>
        </article>
        <article className="statCard">
          <span>Просмотрены</span>
          <strong>{stats?.viewed ?? "-"}</strong>
        </article>
        <article className="statCard">
          <span>Откликнулся</span>
          <strong>{stats?.applied ?? "-"}</strong>
        </article>
      </section>

      {error ? <div className="errorBanner">{error}</div> : null}

      <section className="workspace">
        <div className="panel">
          <div className="panelHeader">
            <h2>Список</h2>
            <select
              multiple
              size={5}
              value={statuses}
              onChange={(event ) => {
                const nextStatuses = Array.from(event.target.selectedOptions).map(
                  (option) => option.value as VacancyStatus,
                );
                setPage(1);
                setStatuses(nextStatuses.length > 0 ? nextStatuses : DEFAULT_STATUSES);
              }}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="listMeta">
            <span>{listLoading ? "Загрузка..." : `Вакансий: ${total}`}</span>
            <span>
              Страница {page} / {totalPages}
            </span>
          </div>

          <div className="vacancyList">
            {items.map((item) => (
              <button
                key={item.id}
                className={`vacancyRow ${selectedId === item.id ? "active" : ""}`}
                onClick={() => setSelectedId(item.id)}
              >
                <div className="vacancyRowTop">
                  <strong>{item.title}</strong>
                  <div className="rowActions">
                    <span className={`statusBadge status-${item.status}`}>
                      {STATUS_LABELS[item.status]}
                    </span>
                    <a
                      className="iconButton"
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      title="Открыть на hh.ru"
                    >
                      ↗
                    </a>
                    <button
                      className="iconButton"
                      type="button"
                      onClick={(event) => void handleHide(event, item.id)}
                      title="Скрыть"
                      disabled={statusUpdating}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="vacancyRowMeta">{item.company}</div>
                <div className="vacancyRowMeta">{item.salary}</div>
              </button>
            ))}

            {!listLoading && items.length === 0 ? (
              <div className="emptyState">Вакансии не найдены</div>
            ) : null}
          </div>

          <div className="pagination">
            <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>
              Назад
            </button>
            <button
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
            <button
              className="primaryButton"
              onClick={handleAnalyze}
              disabled={!selectedId || analyzing}
            >
              {analyzing ? "Анализирую..." : "Анализировать"}
            </button>
          </div>

          {detailsLoading ? <div className="emptyState">Загружаю детали...</div> : null}

          {!detailsLoading && selectedVacancy ? (
            <div className="detailsContent">
              <div className="detailBlock">
                <h3>{selectedVacancy.title}</h3>
                <p>{selectedVacancy.company}</p>
                <p>{selectedVacancy.salary}</p>
                <a href={selectedVacancy.url} target="_blank" rel="noreferrer">
                  Открыть на hh.ru
                </a>
              </div>

              <div className="detailGrid">
                <div>
                  <span className="detailLabel">Статус</span>
                  <select
                    value={selectedVacancy.status}
                    onChange={(event) =>
                      void handleStatusChange(event.target.value as VacancyStatus)
                    }
                    disabled={statusUpdating}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="detailLabel">Создана</span>
                  <div>{formatDate(selectedVacancy.createdAt)}</div>
                </div>
                <div>
                  <span className="detailLabel">Анализ</span>
                  <div>{formatDate(selectedVacancy.analyzedAt)}</div>
                </div>
                <div>
                  <span className="detailLabel">Решение LLM</span>
                  <div>{selectedVacancy.decision || "-"}</div>
                </div>
              </div>

              <div className="detailBlock">
                <span className="detailLabel">Описание</span>
                <pre>{selectedVacancy.description || "Описание пока не загружено"}</pre>
              </div>

              <div className="detailBlock">
                <span className="detailLabel">Совпадение</span>
                <div>{selectedVacancy.matchPercent ?? "-"}</div>
              </div>

              <div className="detailBlock">
                <span className="detailLabel">Причина</span>
                <pre>{selectedVacancy.reason || "-"}</pre>
              </div>

              <div className="detailBlock">
                <span className="detailLabel">Оценка зарплаты</span>
                <pre>{selectedVacancy.salaryEstimate || "-"}</pre>
              </div>

              <div className="detailBlock">
                <span className="detailLabel">Сопроводительное письмо</span>
                <pre>{selectedVacancy.coverLetter || "-"}</pre>
              </div>
            </div>
          ) : null}

          {!detailsLoading && !selectedVacancy ? (
            <div className="emptyState">Выбери вакансию из списка</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default App;
