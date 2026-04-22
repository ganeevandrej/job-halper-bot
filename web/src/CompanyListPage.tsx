import { useEffect, useState } from "react";
import { getCompanies, getCompany } from "./companyApi";
import { Company } from "./companyTypes";

const formatList = (items: string[]): string =>
  items.length > 0 ? items.join(", ") : "-";

function CompanyListPage() {
  const [items, setItems] = useState<Company[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    getCompanies()
      .then(setItems)
      .catch((nextError) => {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Не удалось загрузить компании.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    setDetailsLoading(true);
    setError(null);

    getCompany(selectedId)
      .then(setSelectedCompany)
      .catch((nextError) => {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Не удалось загрузить компанию.",
        );
      })
      .finally(() => setDetailsLoading(false));
  }, [selectedId]);

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <div className="eyebrow">Компании</div>
          <h1>Список компаний</h1>
        </div>
      </header>

      {error ? <div className="errorBanner">{error}</div> : null}

      <section className="workspace">
        <div className="panel">
          <div className="panelHeader">
            <h2>Список</h2>
            <span className="listMeta">{loading ? "Загрузка..." : `Всего: ${items.length}`}</span>
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
                  <strong>{item.name}</strong>
                </div>
                <div className="vacancyRowMeta">hh id: {item.hhId || "-"}</div>
                <div className="vacancyRowMeta">{item.domain || "-"}</div>
              </button>
            ))}

            {!loading && items.length === 0 ? (
              <div className="emptyState">Компании не найдены.</div>
            ) : null}
          </div>
        </div>

        <div className="panel detailsPanel">
          <div className="panelHeader">
            <h2>Детали</h2>
          </div>

          {detailsLoading ? <div className="emptyState">Загружаю детали...</div> : null}

          {!detailsLoading && selectedCompany ? (
            <div className="detailsContent">
              <div className="detailBlock">
                <h3>{selectedCompany.name}</h3>
                <p>hh id: {selectedCompany.hhId || "-"}</p>
              </div>

              <div className="detailGrid">
                <div>
                  <span className="detailLabel">Домен</span>
                  <div>{selectedCompany.domain || "-"}</div>
                </div>
                <div>
                  <span className="detailLabel">Тип продукта</span>
                  <div>{selectedCompany.productType || "-"}</div>
                </div>
                <div>
                  <span className="detailLabel">Кратко</span>
                  <div>{selectedCompany.shortPitch || "-"}</div>
                </div>
                <div>
                  <span className="detailLabel">Техуровень</span>
                  <div>{selectedCompany.techLevel || "-"}</div>
                </div>
              </div>

              <div className="detailBlock">
                <span className="detailLabel">Что цепляет</span>
                <pre>{formatList(selectedCompany.highlights)}</pre>
              </div>

              <div className="detailBlock">
                <span className="detailLabel">Короткий обзор для письма</span>
                <pre>{selectedCompany.summary || "-"}</pre>
              </div>
            </div>
          ) : null}

          {!detailsLoading && !selectedCompany ? (
            <div className="emptyState">Выбери компанию из списка.</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default CompanyListPage;
