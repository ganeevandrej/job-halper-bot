import { useState } from "react";
import { createManualVacancy } from "./manualVacancyApi";

type NoticeKind = "success" | "error";

interface Notice {
  kind: NoticeKind;
  text: string;
}

function AddVacancyPage() {
  const [rawText, setRawText] = useState("");
  const [hhId, setHhId] = useState("");
  const [company, setCompany] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const buildPayload = () => ({
    rawText: rawText.trim(),
    hhId: hhId.trim() || undefined,
    company: company.trim() || undefined,
  });

  const validate = (): boolean => {
    if (rawText.trim().length < 20) {
      setNotice({
        kind: "error",
        text: "Описание вакансии должно быть не короче 20 символов.",
      });
      return false;
    }

    return true;
  };

  const resetForm = () => {
    setRawText("");
    setHhId("");
    setCompany("");
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
            <span className="detailLabel">Компания</span>
            <input
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              placeholder="Например: Сбер. IT"
            />
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
