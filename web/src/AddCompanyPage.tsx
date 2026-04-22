import { useState } from "react";
import { createCompany } from "./companyApi";

type NoticeKind = "success" | "error";

interface Notice {
  kind: NoticeKind;
  text: string;
}

function AddCompanyPage() {
  const [rawText, setRawText] = useState("");
  const [hhId, setHhId] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const validate = (): boolean => {
    if (rawText.trim().length < 20) {
      setNotice({
        kind: "error",
        text: "Описание компании должно быть не короче 20 символов.",
      });
      return false;
    }

    if (!hhId.trim()) {
      setNotice({
        kind: "error",
        text: "Укажи hh id компании.",
      });
      return false;
    }

    return true;
  };

  const resetForm = () => {
    setRawText("");
    setHhId("");
  };

  const handleAdd = async () => {
    if (!validate()) {
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const company = await createCompany({
        rawText: rawText.trim(),
        hhId: hhId.trim(),
      });

      resetForm();
      setNotice({
        kind: "success",
        text: `Компания добавлена: ${company.name}. Короткий обзор для письма сохранён.`,
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof Error
          ? error.message
          : "Не удалось добавить компанию.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page narrowPage">
      <header className="topbar">
        <div>
          <div className="eyebrow">Компании</div>
          <h1>Добавить компанию</h1>
        </div>
      </header>

      {notice ? (
        <div className={notice.kind === "success" ? "noticeBanner" : "errorBanner"}>
          {notice.text}
        </div>
      ) : null}

      <section className="panel addVacancyPanel">
        <label className="fieldGroup">
          <span className="detailLabel">Описание компании</span>
          <textarea
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            placeholder="Вставь описание компании, заметки о продукте, домене, масштабе, технологиях и том, чем она зацепила."
            rows={18}
          />
        </label>

        <div className="formGrid">
          <label className="fieldGroup">
            <span className="detailLabel">hh id компании</span>
            <input
              value={hhId}
              onChange={(event) => setHhId(event.target.value)}
              placeholder="Например: 123456"
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
            {saving ? "Добавляю и разбираю..." : "Добавить"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default AddCompanyPage;
