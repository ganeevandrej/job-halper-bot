import { useEffect, useMemo, useState } from "react";
import { getCompanies } from "./companyApi";
import { Company } from "./companyTypes";
import { createManualVacancy } from "./manualVacancyApi";

type NoticeKind = "success" | "error";

interface Notice {
  kind: NoticeKind;
  text: string;
}

function AddVacancyPage() {
  const [rawText, setRawText] = useState("");
  const [hhId, setHhId] = useState("");
  const [companyHhId, setCompanyHhId] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const selectedCompany = useMemo(
    () =>
      companies.find((item) => item.hhId && item.hhId === companyHhId.trim()) ?? null,
    [companies, companyHhId],
  );

  useEffect(() => {
    setLoadingCompanies(true);

    getCompanies()
      .then(setCompanies)
      .catch((error) => {
        setNotice({
          kind: "error",
          text: error instanceof Error
            ? error.message
            : "Не удалось загрузить список компаний.",
        });
      })
      .finally(() => setLoadingCompanies(false));
  }, []);

  const buildPayload = () => ({
    rawText: rawText.trim(),
    hhId: hhId.trim() || undefined,
    companyId: selectedCompany?.id || undefined,
  });

  const validate = (): boolean => {
    if (rawText.trim().length < 20) {
      setNotice({
        kind: "error",
        text: "Описание вакансии должно быть не короче 20 символов.",
      });
      return false;
    }

    if (!selectedCompany) {
      setNotice({
        kind: "error",
        text: "Выбери компанию по hh id из списка. Если её нет, сначала добавь компанию в табе «Компания».",
      });
      return false;
    }

    return true;
  };

  const resetForm = () => {
    setRawText("");
    setHhId("");
    setCompanyHhId("");
  };

  const handleAdd = async () => {
    if (!validate()) {
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const vacancy = await createManualVacancy(buildPayload());
      resetForm();
      setNotice({
        kind: "success",
        text: `Вакансия добавлена и проверена: ${vacancy.title}. Совпадение: ${vacancy.matchPercent ?? "-"}%.`,
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof Error
          ? error.message
          : "Не удалось добавить и проверить вакансию.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page narrowPage">
      <header className="topbar">
        <div>
          <div className="eyebrow">Вакансии</div>
          <h1>Добавить вакансию</h1>
        </div>
      </header>

      {notice ? (
        <div className={notice.kind === "success" ? "noticeBanner" : "errorBanner"}>
          {notice.text}
        </div>
      ) : null}

      <section className="panel addVacancyPanel">
        <label className="fieldGroup">
          <span className="detailLabel">Описание вакансии</span>
          <textarea
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            placeholder="Вставь полный текст вакансии: описание, задачи, требования, стек, зарплату и формат работы."
            rows={18}
          />
        </label>

        <div className="formGrid">
          <label className="fieldGroup">
            <span className="detailLabel">hh id</span>
            <input
              value={hhId}
              onChange={(event) => setHhId(event.target.value)}
              placeholder="Например: 132247373"
            />
          </label>

          <label className="fieldGroup">
            <span className="detailLabel">hh id компании</span>
            <input
              list="company-hh-options"
              value={companyHhId}
              onChange={(event) => setCompanyHhId(event.target.value)}
              placeholder={loadingCompanies ? "Загружаю компании..." : "Например: 123456"}
            />
            <datalist id="company-hh-options">
              {companies
                .filter((item) => item.hhId)
                .map((item) => (
                  <option
                    key={item.id}
                    value={item.hhId || ""}
                    label={`${item.name}${item.domain ? ` · ${item.domain}` : ""}`}
                  />
                ))}
            </datalist>
            <span className="detailLabel">
              {selectedCompany
                ? `Компания: ${selectedCompany.name}`
                : "Если компании нет в списке, добавь её в табе «Компания»."}
            </span>
          </label>
        </div>

        <div className="formActions">
          <button
            className="primaryButton"
            type="button"
            onClick={() => void handleAdd()}
            disabled={saving}
          >
            {saving ? "Добавляю и проверяю..." : "Добавить"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default AddVacancyPage;
