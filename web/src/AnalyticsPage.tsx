import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getManualVacancyStats } from "./manualVacancyApi";
import {
  ManualVacancyStats,
  ManualVacancyStatsBucket,
} from "./manualVacancyTypes";

const statRows = (stats: ManualVacancyStats) => [
  { label: "Новые", value: stats.new },
  { label: "Ожидают", value: stats.analyzed },
  { label: "Откликнулся", value: stats.applied },
  { label: "Не подходят", value: stats.notFit },
  { label: "В архиве", value: stats.archived },
];

const COLORS = ["#135946", "#327b69", "#d08a2d", "#486a9a", "#9b4f46", "#6d756d"];

const hasData = (items: ManualVacancyStatsBucket[]): boolean =>
  items.some((item) => item.count > 0);

const ChartEmptyState = () => (
  <div className="chartEmpty">Недостаточно данных для графика.</div>
);

const SalaryChart = ({ data }: { data: ManualVacancyStatsBucket[] }) => (
  <div className="chartBox">
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 18, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" name="Вакансий" fill="#135946" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

const GradeChart = ({ data }: { data: ManualVacancyStatsBucket[] }) => (
  <div className="chartBox">
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 10, right: 18, left: 18, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} />
        <YAxis type="category" dataKey="label" width={90} />
        <Tooltip />
        <Bar dataKey="count" name="Вакансий" fill="#486a9a" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

const FormatChart = ({ data }: { data: ManualVacancyStatsBucket[] }) => (
  <div className="chartBox">
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius={96}
          label={({ name, value }) => `${name}: ${value}`}
        >
          {data.map((entry, index) => (
            <Cell
              key={entry.label}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  </div>
);

function AnalyticsPage() {
  const [stats, setStats] = useState<ManualVacancyStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getManualVacancyStats()
      .then(setStats)
      .catch((nextError) => {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Не удалось загрузить аналитику.",
        );
      });
  }, []);

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <div className="eyebrow">Вакансии</div>
          <h1>Аналитика</h1>
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
              <span>С совпадением</span>
              <strong>{stats.withMatch}</strong>
            </article>
            <article className="statCard">
              <span>Среднее совпадение</span>
              <strong>{stats.averageMatchPercent ?? "-"}%</strong>
            </article>
            <article className="statCard">
              <span>Откликов</span>
              <strong>{stats.applied}</strong>
            </article>
          </section>

          <section className="panel analyticsPanel">
            <div className="panelHeader">
              <h2>Статусы</h2>
            </div>
            <div className="statusGrid">
              {statRows(stats).map((row) => (
                <div className="statusMetric" key={row.label}>
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="analyticsGrid">
            <article className="panel chartPanel">
              <div className="panelHeader">
                <h2>Зарплата</h2>
              </div>
              {hasData(stats.salaryBuckets) ? (
                <SalaryChart data={stats.salaryBuckets} />
              ) : (
                <ChartEmptyState />
              )}
            </article>

            <article className="panel chartPanel">
              <div className="panelHeader">
                <h2>Формат работы</h2>
              </div>
              {hasData(stats.formatDistribution) ? (
                <FormatChart data={stats.formatDistribution} />
              ) : (
                <ChartEmptyState />
              )}
            </article>

            <article className="panel chartPanel wideChartPanel">
              <div className="panelHeader">
                <h2>Грейд</h2>
              </div>
              {hasData(stats.gradeDistribution) ? (
                <GradeChart data={stats.gradeDistribution} />
              ) : (
                <ChartEmptyState />
              )}
            </article>
          </section>
        </>
      ) : !error ? (
        <div className="emptyState">Загружаю аналитику...</div>
      ) : null}
    </div>
  );
}

export default AnalyticsPage;
