import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getCompetitorResumeStats } from "./competitorResumeApi";
import {
  CompetitorResumeStats,
  CompetitorResumeStatsBucket,
} from "./competitorResumeTypes";

const COLORS = ["#135946", "#486a9a", "#d08a2d", "#9b4f46", "#6d756d"];

const hasData = (items: CompetitorResumeStatsBucket[]) =>
  items.some((item) => item.count > 0);

const formatMonths = (value: number | null): string => {
  if (value === null) return "-";
  const years = Math.floor(value / 12);
  const months = value % 12;
  if (years === 0) return `${months} мес.`;
  return months > 0 ? `${years} г. ${months} мес.` : `${years} г.`;
};

const BarBucketChart = ({
  data,
  color,
}: {
  data: CompetitorResumeStatsBucket[];
  color: string;
}) => (
  <div className="chartBox">
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 18, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" name="Резюме" fill={color} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

const PieBucketChart = ({ data }: { data: CompetitorResumeStatsBucket[] }) => (
  <div className="chartBox">
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius={92}
          label={({ name, value }) => `${name}: ${value}`}
        >
          {data.map((entry, index) => (
            <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  </div>
);

const ChartEmptyState = () => (
  <div className="chartEmpty">Недостаточно данных для графика.</div>
);

function CompetitorAnalyticsPage() {
  const [stats, setStats] = useState<CompetitorResumeStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCompetitorResumeStats()
      .then(setStats)
      .catch((nextError) => {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Не удалось загрузить аналитику конкурентов.",
        );
      });
  }, []);

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <div className="eyebrow">Конкуренты</div>
          <h1>Аналитика резюме</h1>
        </div>
      </header>

      {error ? <div className="errorBanner">{error}</div> : null}

      {stats ? (
        <>
          <section className="statsGrid">
            <article className="statCard">
              <span>Всего</span>
              <strong>{stats.total}</strong>
            </article>
            <article className="statCard">
              <span>С фото</span>
              <strong>{stats.withPhoto}</strong>
            </article>
            <article className="statCard">
              <span>Сильнее моего</span>
              <strong>{stats.betterThanMine}</strong>
            </article>
            <article className="statCard">
              <span>Средняя оценка</span>
              <strong>{stats.averageComparisonScore ?? "-"}%</strong>
            </article>
          </section>

          <section className="statsGrid competitorStatsGrid">
            <article className="statCard">
              <span>Средний релевантный опыт</span>
              <strong>{formatMonths(stats.averageRelevantExperienceMonths)}</strong>
            </article>
          </section>

          <section className="analyticsGrid">
            <article className="panel chartPanel">
              <div className="panelHeader">
                <h2>Оценка конкурента</h2>
              </div>
              {hasData(stats.comparisonScoreBuckets) ? (
                <BarBucketChart data={stats.comparisonScoreBuckets} color="#135946" />
              ) : (
                <ChartEmptyState />
              )}
            </article>

            <article className="panel chartPanel">
              <div className="panelHeader">
                <h2>Релевантный опыт</h2>
              </div>
              {hasData(stats.relevantExperienceBuckets) ? (
                <BarBucketChart data={stats.relevantExperienceBuckets} color="#486a9a" />
              ) : (
                <ChartEmptyState />
              )}
            </article>

            <article className="panel chartPanel">
              <div className="panelHeader">
                <h2>Фото</h2>
              </div>
              {hasData(stats.photoDistribution) ? (
                <PieBucketChart data={stats.photoDistribution} />
              ) : (
                <ChartEmptyState />
              )}
            </article>

            <article className="panel chartPanel">
              <div className="panelHeader">
                <h2>Сравнение с моим</h2>
              </div>
              {hasData(stats.betterDistribution) ? (
                <PieBucketChart data={stats.betterDistribution} />
              ) : (
                <ChartEmptyState />
              )}
            </article>
          </section>
        </>
      ) : !error ? (
        <div className="emptyState">Загружаю аналитику конкурентов...</div>
      ) : null}
    </div>
  );
}

export default CompetitorAnalyticsPage;
