import { useState } from "react";
import { createCompetitorResume } from "./competitorResumeApi";

type NoticeKind = "success" | "error";

interface Notice {
  kind: NoticeKind;
  text: string;
}

function AddCompetitorResumePage() {
  const [rawText, setRawText] = useState("");
  const [hhId, setHhId] = useState("");
  const [hasPhoto, setHasPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const handleSubmit = async () => {
    if (rawText.trim().length < 50) {
      setNotice({
        kind: "error",
        text: "Описание резюме должно быть не короче 50 символов.",
      });
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const resume = await createCompetitorResume({
        rawText: rawText.trim(),
        hhId: hhId.trim() || undefined,
        hasPhoto,
      });
      setRawText("");
      setHhId("");
      setHasPhoto(false);
      setNotice({
        kind: "success",
        text: `Резюме добавлено: ${resume.title}.`,
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof Error
          ? error.message
          : "Не удалось добавить резюме конкурента.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page narrowPage">
      <header className="topbar">
        <div>
          <div className="eyebrow">Конкуренты</div>
          <h1>Добавить конкурента</h1>
        </div>
      </header>

      {notice ? (
        <div className={notice.kind === "success" ? "noticeBanner" : "errorBanner"}>
          {notice.text}
        </div>
      ) : null}

      <section className="panel addVacancyPanel">
        <label className="fieldGroup">
          <span className="detailLabel">Описание резюме</span>
          <textarea
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            placeholder="Вставь полный текст резюме конкурента с hh.ru: заголовок, опыт, навыки, образование, зарплатные ожидания."
            rows={18}
          />
        </label>

        <label className="fieldGroup">
          <span className="detailLabel">hh id резюме</span>
          <input
            value={hhId}
            onChange={(event) => setHhId(event.target.value)}
            placeholder="Например: 123456789"
          />
        </label>

        <label className="checkboxField">
          <input
            type="checkbox"
            checked={hasPhoto}
            onChange={(event) => setHasPhoto(event.target.checked)}
          />
          Есть фото в профиле
        </label>

        <div className="formActions">
          <button
            className="primaryButton"
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
          >
            {saving ? "Анализирую и сохраняю..." : "Добавить"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default AddCompetitorResumePage;
