import { useEffect, useState } from "react";
import {
  analyzeManualVacancy,
  createAndAnalyzeManualVacancy,
  getManualVacancies,
  getManualVacancy,
  updateManualVacancy,
} from "./manualVacancyApi";
import {
  ManualVacancy,
  ManualVacancyStatus,
} from "./manualVacancyTypes";

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<ManualVacancyStatus, string> = {
  new: "Новая",
  viewed: "Просмотрена",
  rejected: "Отклонена",
  applied: "Откликнулся",
  hidden: "Скрыта",
};

interface DetailsFormState {
  rawText: string;
}

const formatDate = (value: string | null): string => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
};

const getInitialFormState = (vacancy: ManualVacancy): DetailsFormState => ({
  rawText: vacancy.rawText,
});

function ManualVacanciesPage() {
  const [items, setItems] = useState<ManualVacancy[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedVacancy, setSelectedVacancy] =
    useState<ManualVacancy | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rawText, setRawText] = useState("");
  const [salaryOverride, setSalaryOverride] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsForm, setDetailsForm] = useState<DetailsFormState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadList = async (nextPage: number) => {
    setListLoading(true);
    setError(null);

    try {
      const result = await getManualVacancies(nextPage, PAGE_SIZE);
      setItems(result.items);
      setTotal(result.total);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Не удалось загрузить ручные вакансии",
      );
    } finally {
      setListLoading(false);
    }
  };

  const loadDetails = async (id: string) => {
    setDetailsLoading(true);
    setError(null);

    try {
      const vacancy = await getManualVacancy(id);
      setSelectedVacancy(vacancy);

      if (vacancy.status === "new") {
        const updated = await updateManualVacancy(vacancy.id, {
          status: "viewed",
        });
        setSelectedVacancy(updated);
        await loadList(page);
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Не удалось загрузить вакансию",
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    void loadList(page);
  }, [page]);

  useEffect(() => {
    if (selectedId) {
      void loadDetails(selectedId);
    }
  }, [selectedId]);

  const handleAnalyze = async () => {
    if (rawText.trim().length < 20) {
      setError("Вставь текст вакансии минимум на 20 символов");
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const vacancy = await createAndAnalyzeManualVacancy({
        rawText: rawText.trim(),
        salaryOverride: salaryOverride.trim() || undefined,
      });
      setSelectedId(vacancy.id);
      setSelectedVacancy(vacancy);
      setRawText("");
      setSalaryOverride("");
      setPage(1);
      await loadList(1);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Не удалось разобрать и проанализировать вакансию",
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReanalyze = async () => {
    if (!selectedVacancy) {
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const vacancy = await analyzeManualVacancy(selectedVacancy.id);
      setSelectedVacancy(vacancy);
      await loadList(page);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Не удалось проанализировать вакансию заново",
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSetApplied = async () => {
    if (!selectedVacancy) {
      return;
    }

    setStatusUpdating(true);
    setError(null);

    try {
      const vacancy = await updateManualVacancy(selectedVacancy.id, {
        status: "applied",
      });
      setSelectedVacancy(vacancy);
      await loadList(page);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Не удалось отметить отклик",
      );
    } finally {
      setStatusUpdating(false);
    }
  };

  const openDetails = () => {
    if (!selectedVacancy) {
      return;
    }

    setDetailsForm(getInitialFormState(selectedVacancy));
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setDetailsForm(null);
  };

  const updateDetailsField = <Key extends keyof DetailsFormState>(
    key: Key,
    value: DetailsFormState[Key],
  ) => {
    setDetailsForm((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current,
    );
  };

  const saveDetails = async (shouldAnalyze: boolean) => {
    if (!selectedVacancy || !detailsForm) {
      return;
    }

    if (detailsForm.rawText.trim().length < 20) {
      setError("Текст вакансии должен быть минимум 20 символов");
      return;
    }

    setDetailsSaving(true);
    setError(null);

    try {
      let vacancy = await updateManualVacancy(selectedVacancy.id, {
        rawText: detailsForm.rawText.trim(),
      });
      setSelectedVacancy(vacancy);

      if (shouldAnalyze) {
        setAnalyzing(true);
        vacancy = await analyzeManualVacancy(vacancy.id);
        setSelectedVacancy(vacancy);
      }

      await loadList(page);
      closeDetails();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Не удалось сохранить детали",
      );
    } finally {
      setDetailsSaving(false);
      setAnalyzing(false);
    }
  };

  const handleSaveDetails = async () => {
    await saveDetails(false);
  };

  const handleSaveAndAnalyzeDetails = async () => {
    await saveDetails(true);
  };

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <div className="eyebrow">Manual Job Helper</div>
          <h1>Ручной разбор</h1>
        </div>
      </header>

      {error ? <div className="errorBanner">{error}</div> : null}

      <section className="workspace manualWorkspace">
        <div className="panel">
          <div className="panelHeader">
            <h2>Новая вакансия</h2>
          </div>

          <label className="fieldGroup">
            <span className="detailLabel">Текст вакансии</span>
            <textarea
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              placeholder="Вставь сюда всю вакансию целиком: описание, зарплату, стек, задачи и требования."
              rows={14}
            />
          </label>

          <label className="fieldGroup">
            <span className="detailLabel">Зарплата, если хочешь уточнить</span>
            <input
              value={salaryOverride}
              onChange={(event) => setSalaryOverride(event.target.value)}
              placeholder="Например: 180000-250000 руб"
            />
          </label>

          <button
            className="primaryButton wideButton"
            onClick={handleAnalyze}
            disabled={analyzing}
          >
            {analyzing ? "Разбираю и анализирую..." : "Разобрать и проанализировать"}
          </button>

          <div className="manualListHeader">
            <h2>Сохраненные</h2>
            <span>{listLoading ? "Загрузка..." : `Всего: ${total}`}</span>
          </div>

          <div className="vacancyList compactVacancyList">
            {items.map((item) => (
              <button
                key={item.id}
                className={`vacancyRow ${selectedId === item.id ? "active" : ""}`}
                onClick={() => setSelectedId(item.id)}
              >
                <div className="vacancyRowTop">
                  <strong>{item.title}</strong>
                  <span className={`statusBadge status-${item.status}`}>
                    {STATUS_LABELS[item.status]}
                  </span>
                </div>
                <div className="vacancyRowMeta">{item.company}</div>
                <div className="vacancyRowMeta">
                  {item.salary || "Зарплата не указана"}
                </div>
                <div className="vacancyRowMeta">
                  Совпадение: {item.matchPercent ?? "-"}%
                </div>
              </button>
            ))}

            {!listLoading && items.length === 0 ? (
              <div className="emptyState">Ручных вакансий пока нет</div>
            ) : null}
          </div>

          <div className="pagination">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
            >
              Назад
            </button>
            <span>
              Страница {page} / {totalPages}
            </span>
            <button
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page >= totalPages}
            >
              Вперед
            </button>
          </div>
        </div>

        <div className="panel detailsPanel">
          <div className="panelHeader">
            <h2>Результат</h2>
            <div className="detailsActions">
              <button
                className="secondaryButton"
                onClick={openDetails}
                disabled={!selectedVacancy}
              >
                Детали
              </button>
              <button
                className="secondaryButton"
                onClick={handleSetApplied}
                disabled={
                  !selectedVacancy ||
                  statusUpdating ||
                  selectedVacancy.status === "applied"
                }
              >
                Откликнулся
              </button>
              <button
                className="primaryButton"
                onClick={handleReanalyze}
                disabled={!selectedVacancy || analyzing}
              >
                {analyzing ? "Анализирую..." : "Проанализировать заново"}
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
                <div>
                  <span className={`statusBadge status-${selectedVacancy.status}`}>
                    {STATUS_LABELS[selectedVacancy.status]}
                  </span>
                </div>
              </div>

              <div className="detailGrid">
                <div>
                  <span className="detailLabel">Подходит</span>
                  <div>{selectedVacancy.decision === "yes" ? "Да" : selectedVacancy.decision === "no" ? "Нет" : "-"}</div>
                </div>
                <div>
                  <span className="detailLabel">Совпадение</span>
                  <div>{selectedVacancy.matchPercent ?? "-"}%</div>
                </div>
                <div>
                  <span className="detailLabel">Ориентировочная зарплата</span>
                  <div>{selectedVacancy.estimatedSalary || "-"}</div>
                </div>
                <div>
                  <span className="detailLabel">Анализ</span>
                  <div>{formatDate(selectedVacancy.analyzedAt)}</div>
                </div>
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
            <div className="emptyState">
              Вставь вакансию слева или выбери сохраненную
            </div>
          ) : null}
        </div>
      </section>

      {detailsOpen && selectedVacancy && detailsForm ? (
        <div className="modalBackdrop" role="presentation">
          <div className="modalPanel" role="dialog" aria-modal="true">
            <div className="modalHeader">
              <div>
                <div className="eyebrow">Детали вакансии</div>
                <h2>{selectedVacancy.title}</h2>
              </div>
              <button className="iconButton" type="button" onClick={closeDetails}>
                x
              </button>
            </div>

            <label className="fieldGroup">
              <span className="detailLabel">Текст вакансии</span>
              <textarea
                value={detailsForm.rawText}
                onChange={(event) =>
                  updateDetailsField("rawText", event.target.value)
                }
                rows={18}
              />
            </label>

            <div className="modalActions">
              <button
                className="secondaryButton"
                type="button"
                onClick={closeDetails}
                disabled={detailsSaving || analyzing}
              >
                Отмена
              </button>
              <button
                className="secondaryButton"
                type="button"
                onClick={handleSaveDetails}
                disabled={detailsSaving || analyzing}
              >
                {detailsSaving ? "Сохраняю..." : "Сохранить"}
              </button>
              <button
                className="primaryButton"
                type="button"
                onClick={handleSaveAndAnalyzeDetails}
                disabled={detailsSaving || analyzing}
              >
                {analyzing
                  ? "Анализирую..."
                  : detailsSaving
                    ? "Сохраняю..."
                  : "Сохранить и проанализировать"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ManualVacanciesPage;
