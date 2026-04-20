import { useEffect, useState } from "react";
import { getProfile, updateProfile } from "./profileApi";
import { CandidateProfile } from "./profileTypes";
import TagEditor from "./TagEditor";

function ProfilePage() {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [coverLetterEditing, setCoverLetterEditing] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      setNotice(null);

      try {
        setProfile(await getProfile());
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Не удалось загрузить профиль",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const updateField = <Key extends keyof CandidateProfile>(
    key: Key,
    value: CandidateProfile[Key],
  ) => {
    setProfile((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current,
    );
  };

  const handleSave = async () => {
    if (!profile) {
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const saved = await updateProfile({
        title: profile.title,
        salaryExpectation: profile.salaryExpectation,
        formats: profile.formats,
        location: profile.location,
        hasPhoto: profile.hasPhoto,
        about: profile.about,
        skills: profile.skills,
        experienceText: profile.experienceText,
        educationText: profile.educationText,
        coverLetterInstructions: profile.coverLetterInstructions,
      });
      setProfile(saved);
      setCoverLetterEditing(false);
      if (saved.resumeProcessingStatus === "completed") {
        setNotice("Профиль сохранён, короткая версия резюме обновлена.");
      } else if (saved.resumeProcessingStatus === "failed") {
        setNotice(
          saved.resumeProcessingError
            ? `Профиль сохранён, но короткую версию не удалось обновить: ${saved.resumeProcessingError}`
            : "Профиль сохранён, но короткую версию не удалось обновить.",
        );
      } else {
        setNotice("Профиль сохранён.");
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Не удалось сохранить профиль",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <div className="eyebrow">Profile</div>
          <h1>Профиль</h1>
        </div>
        <button
          className="primaryButton"
          onClick={handleSave}
          disabled={!profile || saving}
        >
          {saving ? "Сохраняю..." : "Сохранить"}
        </button>
      </header>

      {error ? <div className="errorBanner">{error}</div> : null}
      {notice ? <div className="noticeBanner">{notice}</div> : null}
      {loading ? <div className="emptyState">Загружаю профиль...</div> : null}

      {profile ? (
        <section className="profileLayout">
          <div className="panel profileFullWidth">
            <div className="panelHeader">
              <h2>Основная информация</h2>
            </div>

            <div className="profileGrid">
              <label className="fieldGroup">
                <span className="detailLabel">Заголовок</span>
                <input
                  value={profile.title}
                  onChange={(event) => updateField("title", event.target.value)}
                />
              </label>

              <label className="fieldGroup">
                <span className="detailLabel">Зарплатные ожидания</span>
                <input
                  value={profile.salaryExpectation ?? ""}
                  onChange={(event) =>
                    updateField(
                      "salaryExpectation",
                      event.target.value.trim() || null,
                    )
                  }
                />
              </label>

              <label className="fieldGroup">
                <span className="detailLabel">Локация</span>
                <input
                  value={profile.location ?? ""}
                  onChange={(event) =>
                    updateField("location", event.target.value.trim() || null)
                  }
                />
              </label>

              <label className="checkboxField compactCheckbox">
                <input
                  type="checkbox"
                  checked={profile.hasPhoto}
                  onChange={(event) =>
                    updateField("hasPhoto", event.target.checked)
                  }
                />
                <span>Фото есть</span>
              </label>
            </div>

            <label className="fieldGroup">
              <span className="detailLabel">Форматы</span>
              <TagEditor
                value={profile.formats}
                onChange={(value) => updateField("formats", value)}
                placeholder="remote, hybrid"
              />
            </label>

            <label className="fieldGroup">
              <span className="detailLabel">Навыки</span>
              <TagEditor
                value={profile.skills}
                onChange={(value) => updateField("skills", value)}
                placeholder="React, TypeScript"
              />
            </label>
          </div>

          <div className="panel">
            <div className="panelHeader">
              <h2>Опыт работы</h2>
            </div>
            <label className="fieldGroup">
              <span className="detailLabel">Текст опыта</span>
              <textarea
                value={profile.experienceText}
                onChange={(event) =>
                  updateField("experienceText", event.target.value)
                }
                rows={16}
              />
            </label>
          </div>

          <div className="panel">
            <div className="panelHeader">
              <h2>Обо мне</h2>
            </div>
            <label className="fieldGroup">
              <span className="detailLabel">Краткое описание</span>
              <textarea
                value={profile.about}
                onChange={(event) => updateField("about", event.target.value)}
                rows={8}
              />
            </label>
          </div>

          <div className="panel">
            <div className="panelHeader">
              <h2>Образование</h2>
            </div>
            <label className="fieldGroup">
              <span className="detailLabel">Текст образования</span>
              <textarea
                value={profile.educationText}
                onChange={(event) =>
                  updateField("educationText", event.target.value)
                }
                rows={8}
              />
            </label>
          </div>

          <div className="panel">
            <div className="panelHeader">
              <h2>Требования к письму</h2>
              <button
                className="secondaryButton"
                type="button"
                onClick={() => setCoverLetterEditing((current) => !current)}
              >
                {coverLetterEditing ? "Закрыть" : "Редактировать"}
              </button>
            </div>

            <label className="fieldGroup">
              <span className="detailLabel">Prompt-инструкции</span>
              <textarea
                value={profile.coverLetterInstructions}
                onChange={(event) =>
                  updateField("coverLetterInstructions", event.target.value)
                }
                readOnly={!coverLetterEditing}
                rows={14}
              />
            </label>
          </div>
          <div className="panel profileFullWidth">
            <div className="panelHeader">
              <div>
                <h2>Короткая версия резюме</h2>
                <p className="mutedText">
                  Статус: {profile.resumeProcessingStatus}
                  {profile.resumeSummaryUpdatedAt
                    ? `, обновлено ${new Date(profile.resumeSummaryUpdatedAt).toLocaleString()}`
                    : ""}
                </p>
              </div>
              <button
                className="secondaryButton"
                type="button"
                onClick={() => setSummaryModalOpen(true)}
              >
                Краткая версия
              </button>
            </div>

            {profile.resumeProcessingError ? (
              <div className="errorBanner">{profile.resumeProcessingError}</div>
            ) : null}

            <p className="summaryPreview">
              {profile.resumeSummaryText ||
                "Короткая версия появится после успешного сохранения профиля."}
            </p>
          </div>

          {summaryModalOpen ? (
            <div
              className="modalBackdrop"
              role="presentation"
              onClick={() => setSummaryModalOpen(false)}
            >
              <div
                className="modalPanel detailsModalPanel summaryModalPanel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="summary-modal-title"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="modalHeader">
                  <div>
                    <h2 id="summary-modal-title">Краткая версия резюме</h2>
                    <p className="mutedText">
                      Статус: {profile.resumeProcessingStatus}
                      {profile.resumeSummaryUpdatedAt
                        ? `, обновлено ${new Date(profile.resumeSummaryUpdatedAt).toLocaleString()}`
                        : ""}
                    </p>
                  </div>
                  <button
                    className="secondaryButton"
                    type="button"
                    onClick={() => setSummaryModalOpen(false)}
                  >
                    Закрыть
                  </button>
                </div>

                {profile.resumeProcessingError ? (
                  <div className="errorBanner">{profile.resumeProcessingError}</div>
                ) : null}

                <div className="detailBlock">
                  <span className="detailLabel">Выжимка для анализа</span>
                  <pre className="summaryText">
                    {profile.resumeSummaryText ||
                      "Короткая версия пока не сформирована."}
                  </pre>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

export default ProfilePage;
