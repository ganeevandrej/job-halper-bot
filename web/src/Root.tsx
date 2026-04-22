import {
  lazy,
  Suspense,
  useEffect,
  useState,
} from "react";
import AddCompanyPage from "./AddCompanyPage";
import AddCompetitorResumePage from "./AddCompetitorResumePage";
import AddVacancyPage from "./AddVacancyPage";
import CompanyListPage from "./CompanyListPage";
import CompetitorResumeListPage from "./CompetitorResumeListPage";
import ProfilePage from "./ProfilePage";
import VacancyListPage from "./VacancyListPage";

const AnalyticsPage = lazy(() => import("./AnalyticsPage"));
const CompetitorAnalyticsPage = lazy(() => import("./CompetitorAnalyticsPage"));

type Section = "list" | "add" | "analytics" | "profile";
type Entity = "vacancies" | "competitors" | "companies";

interface RouteState {
  section: Section;
  entity: Entity;
}

const ROUTE_SUFFIXES = [
  "/list/vacancies",
  "/list/resumes",
  "/list/companies",
  "/add/vacancy",
  "/add/resume",
  "/add/company",
  "/analytics/vacancies",
  "/analytics/competitors",
  "/analytics/companies",
  "/add-vacancy",
  "/add-resume",
  "/resumes",
  "/analytics",
  "/competitor-analytics",
  "/profile",
];

const normalizePath = (value: string): string =>
  value.length > 1 ? value.replace(/\/+$/, "") : value;

const getRoute = (): RouteState => {
  const path = normalizePath(window.location.pathname);

  if (path.endsWith("/list/resumes") || path.endsWith("/resumes")) {
    return { section: "list", entity: "competitors" };
  }

  if (path.endsWith("/list/companies")) {
    return { section: "list", entity: "companies" };
  }

  if (path.endsWith("/add/vacancy") || path.endsWith("/add-vacancy")) {
    return { section: "add", entity: "vacancies" };
  }

  if (path.endsWith("/add/resume") || path.endsWith("/add-resume")) {
    return { section: "add", entity: "competitors" };
  }

  if (path.endsWith("/add/company")) {
    return { section: "add", entity: "companies" };
  }

  if (path.endsWith("/analytics/competitors") || path.endsWith("/competitor-analytics")) {
    return { section: "analytics", entity: "competitors" };
  }

  if (path.endsWith("/analytics/companies")) {
    return { section: "analytics", entity: "companies" };
  }

  if (path.endsWith("/analytics/vacancies") || path.endsWith("/analytics")) {
    return { section: "analytics", entity: "vacancies" };
  }

  if (path.endsWith("/profile")) {
    return { section: "profile", entity: "vacancies" };
  }

  return { section: "list", entity: "vacancies" };
};

const getBasePath = (): string => {
  const path = normalizePath(window.location.pathname);
  const suffix = ROUTE_SUFFIXES.find((item) => path.endsWith(item));

  if (!suffix) {
    return path || "/";
  }

  const next = path.slice(0, -suffix.length);
  return next || "/";
};

const joinPath = (basePath: string, suffix: string): string =>
  `${basePath.replace(/\/$/, "")}${suffix}`.replace("//", "/");

const getPath = (section: Section, entity: Entity): string => {
  const basePath = getBasePath();

  if (section === "profile") {
    return joinPath(basePath, "/profile");
  }

  if (section === "list") {
    return joinPath(
      basePath,
      entity === "competitors"
        ? "/list/resumes"
        : entity === "companies"
          ? "/list/companies"
          : "/list/vacancies",
    );
  }

  if (section === "add") {
    return joinPath(
      basePath,
      entity === "competitors"
        ? "/add/resume"
        : entity === "companies"
          ? "/add/company"
          : "/add/vacancy",
    );
  }

  return joinPath(
    basePath,
    entity === "competitors"
      ? "/analytics/competitors"
      : entity === "companies"
        ? "/analytics/companies"
        : "/analytics/vacancies",
  );
};

const SectionTabs = ({
  entity,
  onChange,
}: {
  entity: Entity;
  onChange: (entity: Entity) => void;
}) => (
  <div className="entityTabs">
    <button
      type="button"
      className={entity === "vacancies" ? "active" : ""}
      onClick={() => onChange("vacancies")}
    >
      Вакансии
    </button>
    <button
      type="button"
      className={entity === "competitors" ? "active" : ""}
      onClick={() => onChange("competitors")}
    >
      Конкуренты
    </button>
    <button
      type="button"
      className={entity === "companies" ? "active" : ""}
      onClick={() => onChange("companies")}
    >
      Компании
    </button>
  </div>
);

function Root() {
  const [route, setRoute] = useState<RouteState>(getRoute);

  useEffect(() => {
    const handlePopState = () => setRoute(getRoute());

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (section: Section, entity = route.entity) => {
    const nextRoute: RouteState = {
      section,
      entity: section === "profile" ? "vacancies" : entity,
    };
    const nextPath = getPath(nextRoute.section, nextRoute.entity);

    window.history.pushState({}, "", nextPath);
    setRoute(nextRoute);
  };

  const changeEntity = (entity: Entity) => {
    navigate(route.section, entity);
  };

  const renderSection = () => {
    if (route.section === "profile") {
      return <ProfilePage />;
    }

    if (route.section === "add") {
      if (route.entity === "competitors") {
        return <AddCompetitorResumePage />;
      }

      if (route.entity === "companies") {
        return <AddCompanyPage />;
      }

      return <AddVacancyPage />;
    }

    if (route.section === "analytics") {
      if (route.entity === "competitors") {
        return (
          <Suspense fallback={<div className="emptyState routeFallback">Загружаю аналитику конкурентов...</div>}>
            <CompetitorAnalyticsPage />
          </Suspense>
        );
      }

      if (route.entity === "companies") {
        return (
          <div className="page">
            <div className="emptyState">Для компаний аналитика пока не добавлена.</div>
          </div>
        );
      }

      return (
        <Suspense fallback={<div className="emptyState routeFallback">Загружаю аналитику...</div>}>
          <AnalyticsPage />
        </Suspense>
      );
    }

    if (route.entity === "competitors") {
      return <CompetitorResumeListPage />;
    }

    if (route.entity === "companies") {
      return <CompanyListPage />;
    }

    return <VacancyListPage />;
  };

  return (
    <div className="appShell">
      <aside className="sideNav" aria-label="Основная навигация">
        <div className="sideNavTitle">Job Helper</div>
        <button
          type="button"
          className={route.section === "list" ? "active" : ""}
          onClick={() => navigate("list")}
        >
          Список
        </button>
        <button
          type="button"
          className={route.section === "add" ? "active" : ""}
          onClick={() => navigate("add")}
        >
          Добавить
        </button>
        <button
          type="button"
          className={route.section === "analytics" ? "active" : ""}
          onClick={() => navigate("analytics")}
        >
          Аналитика
        </button>
        <button
          type="button"
          className={route.section === "profile" ? "active" : ""}
          onClick={() => navigate("profile")}
        >
          Профиль
        </button>
      </aside>

      <main className="appMain">
        {route.section !== "profile" ? (
          <SectionTabs entity={route.entity} onChange={changeEntity} />
        ) : null}

        {renderSection()}
      </main>
    </div>
  );
}

export default Root;
