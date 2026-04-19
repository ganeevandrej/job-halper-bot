import { useEffect, useState } from "react";
import {
  getCompetitorResume,
  getCompetitorResumes,
} from "./competitorResumeApi";
import { CompetitorResume } from "./competitorResumeTypes";

const PAGE_SIZE = 20;

const formatMonths = (value: number | null): string => {
  if (value === null) return "-";
  const years = Math.floor(value / 12);
  const months = value % 12;
  if (years === 0) return `${months} мес.`;
  return months > 0 ? `${years} г. ${months} мес.` : `${years} г.`;
};

const formatDate = (value: string): string => new Date(value).toLocaleString();

const GENDER_LABELS: Record<CompetitorResume["gender"], string> = {
  male: "Мужской",
  female: "Женский",
  unknown: "Не указан",
};

const ListBlock = ({ title, items }: { title: string; items: string[] }) => (
  <div className="detailBlock">
    <span className="detailLabel">{title}</span>
    {items.length > 0 ? (
      <ul className="detailList">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    ) : (
      <div>-</div>
    )}
  </div>
);

function CompetitorResumeListPage() {
  const [items, setItems] = useState<CompetitorResume[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedResume, setSelectedResume] =
    useState<CompetitorResume | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadList = async (nextPage: number) => {
    setListLoading(true);
    setError(null);

    try {
      const result = await getCompetitorResumes(nextPage, PAGE_SIZE);
      setItems(result.items);
      setTotal(result.total);
      if (selectedId && !result.items.some((item) => item.id === selectedId)) {
        setSelectedId(null);
        setSelectedResume(null);
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Не удалось загрузить список резюме.",
      );
    } finally {
      setListLoading(false);
    }
  };

  const loadDetails = async (id: string) => {
    setDetailsLoading(true);
    setError(null);

    try {
      setSelectedResume(await getCompetitorResume(id));
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Не удалось загрузить резюме.",
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

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <div className="eyebrow">Конкуренты</div>
          <h1>Список резюме</h1>
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

          <div className="listMeta">
            <span>Страница {page} / {totalPages}</span>
          </div>

          <div className="vacancyList">
            {items.map((item) => (
              <button
                key={item.id}
                className={`vacancyRow ${selectedId === item.id ? "active" : ""}`}
                type="button"
                onClick={() => setSelectedId(item.id)}
              >
                <div className="vacancyRowTop">
                  <strong>{item.title}</strong>
                  <span className={`statusBadge ${item.isBetterThanMine ? "status-not_fit" : "status-applied"}`}>
                    {item.comparisonScore}%
                  </span>
                </div>
                <div className="vacancyRowMeta">hh id: {item.hhId || "-"}</div>
                <div className="vacancyRowMeta">Пол: {GENDER_LABELS[item.gender]}</div>
                <div className="vacancyRowMeta">Возраст: {item.ageYears ?? "-"} лет</div>
                <div className="vacancyRowMeta">
                  Релевантный опыт: {formatMonths(item.relevantExperienceMonths)}
                </div>
                <div className="vacancyRowMeta">
                  {item.isBetterThanMine ? "Сильнее моего резюме" : "Не сильнее моего резюме"}
                </div>
              </button>
            ))}

            {!listLoading && items.length === 0 ? (
              <div className="emptyState">Резюме пока нет.</div>
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
            <h2>Детали</h2>
            {selectedResume?.url ? (
              <a
                className="primaryButton linkButton"
                href={selectedResume.url}
                target="_blank"
                rel="noreferrer"
              >
                Открыть hh.ru
              </a>
            ) : null}
          </div>

          {detailsLoading ? (
            <div className="emptyState">Загружаю детали...</div>
          ) : null}

          {!detailsLoading && selectedResume ? (
            <div className="detailsContent">
              <div className="detailBlock">
                <h3>{selectedResume.title}</h3>
                <p>hh id: {selectedResume.hhId || "-"}</p>
                <p>Добавлено: {formatDate(selectedResume.createdAt)}</p>
              </div>

              <div className="detailGrid">
                <div>
                  <span className="detailLabel">Пол</span>
                  <div>{GENDER_LABELS[selectedResume.gender]}</div>
                </div>
                <div>
                  <span className="detailLabel">Возраст</span>
                  <div>{selectedResume.ageYears !== null ? `${selectedResume.ageYears} лет` : "-"}</div>
                </div>
                <div>
                  <span className="detailLabel">URL резюме</span>
                  <div>{selectedResume.url || "-"}</div>
                </div>
                <div>
                  <span className="detailLabel">Общий опыт</span>
                  <div>{formatMonths(selectedResume.totalExperienceMonths)}</div>
                </div>
                <div>
                  <span className="detailLabel">Релевантный опыт</span>
                  <div>{formatMonths(selectedResume.relevantExperienceMonths)}</div>
                </div>
                <div>
                  <span className="detailLabel">Нерелевантный опыт</span>
                  <div>{formatMonths(selectedResume.irrelevantExperienceMonths)}</div>
                </div>
                <div>
                  <span className="detailLabel">Фото</span>
                  <div>{selectedResume.hasPhoto ? "есть" : "нет"}</div>
                </div>
                <div>
                  <span className="detailLabel">Зарплата</span>
                  <div>{selectedResume.salaryExpectation || "-"}</div>
                </div>
                <div>
                  <span className="detailLabel">Оценка</span>
                  <div>{selectedResume.comparisonScore}%</div>
                </div>
                <div>
                  <span className="detailLabel">Сильнее моего</span>
                  <div>{selectedResume.isBetterThanMine ? "Да" : "Нет"}</div>
                </div>
              </div>

              <div className="detailBlock">
                <span className="detailLabel">Релевантный опыт кратко</span>
                <pre>{selectedResume.relevantExperienceSummary}</pre>
              </div>

              <div className="detailBlock">
                <span className="detailLabel">Сравнение с моим резюме</span>
                <pre>{selectedResume.comparisonReason}</pre>
              </div>

              <ListBlock title="Ключевые навыки" items={selectedResume.keySkills} />
              <ListBlock title="Сильные стороны" items={selectedResume.strengths} />
              <ListBlock title="Слабые стороны" items={selectedResume.weaknesses} />
            </div>
          ) : null}

          {!detailsLoading && !selectedResume ? (
            <div className="emptyState">Выбери резюме из списка.</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default CompetitorResumeListPage;
