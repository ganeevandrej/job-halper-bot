import { useEffect, useState, type MouseEvent } from "react";
import {
  analyzeManualVacancy,
  createManualVacancy,
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
  analyzed: "Проанализирована",
  applied: "Откликнулся",
  not_fit: "Не подхожу",
  archived: "В архиве",
};

interface EditFormState {
  rawText: string;
}

const formatDate = (value: string | null): string => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
};

const getInitialEditFormState = (vacancy: ManualVacancy): EditFormState => ({
  rawText: vacancy.rawText,
});

const formatList = (items: string[]): string =>
  items.length > 0 ? items.join(", ") : "-";

const closeOnBackdropMouseDown = (
  event: MouseEvent<HTMLDivElement>,
  close: () => void,
) => {
  if (event.target === event.currentTarget) {
    close();
  }
};

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

function ManualVacanciesPage() {
  const [items, setItems] = useState<ManualVacancy[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedVacancy, setSelectedVacancy] =
    useState<ManualVacancy | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rawText, setRawText] = useState("");
  const [company, setCompany] = useState("");
  const [hhId, setHhId] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
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
      const vacancy = await createManualVacancy({
        rawText: rawText.trim(),
        company: company.trim() || undefined,
        hhId: hhId.trim() || undefined,
      });
      setSelectedId(vacancy.id);
      setSelectedVacancy(vacancy);
      setRawText("");
      setCompany("");
      setHhId("");
      setPage(1);
      await loadList(1);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Не удалось добавить вакансию",
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

  const handleSetNotFit = async () => {
    if (!selectedVacancy) {
      return;
    }

    setStatusUpdating(true);
    setError(null);

    try {
      const vacancy = await updateManualVacancy(selectedVacancy.id, {
        status: "not_fit",
      });
      setSelectedVacancy(vacancy);
      await loadList(page);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Не удалось отметить вакансию как неподходящую",
      );
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleSetArchived = async () => {
    if (!selectedVacancy) {
      return;
    }

    setStatusUpdating(true);
    setError(null);

    try {
      const vacancy = await updateManualVacancy(selectedVacancy.id, {
        status: "archived",
      });
      setSelectedVacancy(vacancy);
      await loadList(page);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Не удалось отправить вакансию в архив",
      );
    } finally {
      setStatusUpdating(false);
    }
  };

  const openDetails = () => {
    if (!selectedVacancy) {
      return;
    }

    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
  };

  const openEdit = () => {
    if (!selectedVacancy) {
      return;
    }

    setEditForm(getInitialEditFormState(selectedVacancy));
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditForm(null);
  };

  const updateEditField = <Key extends keyof EditFormState>(
    key: Key,
    value: EditFormState[Key],
  ) => {
    setEditForm((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current,
    );
  };

  const saveEdit = async (shouldAnalyze: boolean) => {
    if (!selectedVacancy || !editForm) {
      return;
    }

    if (editForm.rawText.trim().length < 20) {
      setError("Текст вакансии должен быть минимум 20 символов");
      return;
    }

    setEditSaving(true);
    setError(null);

    try {
      let vacancy = await updateManualVacancy(selectedVacancy.id, {
        rawText: editForm.rawText.trim(),
      });
      setSelectedVacancy(vacancy);

      if (shouldAnalyze) {
        setAnalyzing(true);
        vacancy = await analyzeManualVacancy(vacancy.id);
        setSelectedVacancy(vacancy);
      }

      await loadList(page);
      closeEdit();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Не удалось сохранить детали",
      );
    } finally {
      setEditSaving(false);
      setAnalyzing(false);
    }
  };

  const handleSaveEdit = async () => {
    await saveEdit(false);
  };

  const handleSaveAndAnalyzeEdit = async () => {
    await saveEdit(true);
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
            <span className="detailLabel">hh id</span>
            <input
              value={hhId}
              onChange={(event) => setHhId(event.target.value)}
              placeholder="Например: 131781465"
            />
          </label>

          <label className="fieldGroup">
            <span className="detailLabel">Компания</span>
            <input
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              placeholder="Например: ООО Логинет РУс"
            />
          </label>

          <button
            className="primaryButton wideButton"
            onClick={handleAnalyze}
            disabled={analyzing}
          >
            {analyzing ? "Добавляю..." : "Добавить вакансию"}
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
                onClick={openEdit}
                disabled={!selectedVacancy}
              >
                Редактировать
              </button>
              <a
                className={`secondaryButton linkButton ${
                  selectedVacancy?.url ? "" : "disabled"
                }`}
                href={selectedVacancy?.url || undefined}
                target="_blank"
                rel="noreferrer"
                aria-disabled={!selectedVacancy?.url}
              >
                Открыть в hh.ru
              </a>
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
                className="secondaryButton"
                onClick={handleSetNotFit}
                disabled={
                  !selectedVacancy ||
                  statusUpdating ||
                  selectedVacancy.status === "not_fit"
                }
              >
                Не подхожу
              </button>
              <button
                className="secondaryButton"
                onClick={handleSetArchived}
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
                onClick={handleReanalyze}
                disabled={!selectedVacancy || analyzing}
              >
                {analyzing ? "Проверяю..." : "Проверить совпадение"}
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

      {detailsOpen && selectedVacancy ? (
        <div
          className="modalBackdrop"
          role="presentation"
          onMouseDown={(event) => closeOnBackdropMouseDown(event, closeDetails)}
        >
          <div className="modalPanel detailsModalPanel" role="dialog" aria-modal="true">
            <div className="modalHeader">
              <div>
                <div className="eyebrow">Детали вакансии</div>
                <h2>{selectedVacancy.title}</h2>
              </div>
              <button className="iconButton" type="button" onClick={closeDetails}>
                x
              </button>
            </div>

            <div className="detailGrid">
              <div>
                <span className="detailLabel">hh id</span>
                <div>{selectedVacancy.hhId || "-"}</div>
              </div>
              <div>
                <span className="detailLabel">Компания</span>
                <div>{selectedVacancy.company}</div>
              </div>
              <div>
                <span className="detailLabel">Статус</span>
                <div>{STATUS_LABELS[selectedVacancy.status]}</div>
              </div>
              <div>
                <span className="detailLabel">Зарплата</span>
                <div>{selectedVacancy.salary || "-"}</div>
              </div>
              <div>
                <span className="detailLabel">Оценка зарплаты</span>
                <div>{selectedVacancy.estimatedSalary || "-"}</div>
              </div>
              <div>
                <span className="detailLabel">Формат</span>
                <div>{formatList(selectedVacancy.formats)}</div>
              </div>
              <div>
                <span className="detailLabel">Локация</span>
                <div>{selectedVacancy.location}</div>
              </div>
              <div>
                <span className="detailLabel">Грейд</span>
                <div>{selectedVacancy.grade}</div>
              </div>
              <div>
                <span className="detailLabel">Анализ</span>
                <div>{formatDate(selectedVacancy.analyzedAt)}</div>
              </div>
              <div>
                <span className="detailLabel">Создана</span>
                <div>{formatDate(selectedVacancy.createdAt)}</div>
              </div>
              <div>
                <span className="detailLabel">Обновлена</span>
                <div>{formatDate(selectedVacancy.updatedAt)}</div>
              </div>
              <div>
                <span className="detailLabel">Совпадение</span>
                <div>{selectedVacancy.matchPercent ?? "-"}%</div>
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
              <span className="detailLabel">Будет плюсом</span>
              <DetailList items={selectedVacancy.niceToHave} />
            </div>
            <div className="detailBlock">
              <span className="detailLabel">Красные флаги</span>
              <DetailList items={selectedVacancy.redFlags} />
            </div>
            <div className="modalActions">
              <button
                className="secondaryButton"
                type="button"
                onClick={closeDetails}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editOpen && selectedVacancy && editForm ? (
        <div
          className="modalBackdrop"
          role="presentation"
          onMouseDown={(event) => closeOnBackdropMouseDown(event, closeEdit)}
        >
          <div className="modalPanel detailsModalPanel editModalPanel" role="dialog" aria-modal="true">
            <div className="modalHeader">
              <div>
                <div className="eyebrow">Редактирование вакансии</div>
                <h2>{selectedVacancy.title}</h2>
              </div>
              <button className="iconButton" type="button" onClick={closeEdit}>
                x
              </button>
            </div>

            <label className="fieldGroup">
              <span className="detailLabel">Текст вакансии</span>
              <textarea
                value={editForm.rawText}
                onChange={(event) =>
                  updateEditField("rawText", event.target.value)
                }
                rows={18}
              />
            </label>

            <div className="modalActions">
              <button
                className="secondaryButton"
                type="button"
                onClick={closeEdit}
                disabled={editSaving || analyzing}
              >
                Отмена
              </button>
              <button
                className="secondaryButton"
                type="button"
                onClick={handleSaveEdit}
                disabled={editSaving || analyzing}
              >
                {editSaving ? "Сохраняю..." : "Сохранить"}
              </button>
              <button
                className="primaryButton"
                type="button"
                onClick={handleSaveAndAnalyzeEdit}
                disabled={editSaving || analyzing}
              >
                {analyzing
                  ? "Анализирую..."
                  : editSaving
                    ? "Сохраняю..."
                  : "Сохранить и проверить совпадение"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ManualVacanciesPage;
