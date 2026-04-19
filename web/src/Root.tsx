import {
  lazy,
  Suspense,
  useEffect,
  useState,
} from "react";
import AddCompetitorResumePage from "./AddCompetitorResumePage";
import AddVacancyPage from "./AddVacancyPage";
import CompetitorResumeListPage from "./CompetitorResumeListPage";
import ProfilePage from "./ProfilePage";
import VacancyListPage from "./VacancyListPage";

const AnalyticsPage = lazy(() => import("./AnalyticsPage"));
const CompetitorAnalyticsPage = lazy(() => import("./CompetitorAnalyticsPage"));

type Section = "list" | "add" | "analytics" | "profile";
type Entity = "vacancies" | "competitors";

interface RouteState {
  section: Section;
  entity: Entity;
}

const ROUTE_SUFFIXES = [
  "/list/vacancies",
  "/list/resumes",
  "/add/vacancy",
  "/add/resume",
  "/analytics/vacancies",
  "/analytics/competitors",
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

  if (path.endsWith("/add/vacancy") || path.endsWith("/add-vacancy")) {
    return { section: "add", entity: "vacancies" };
  }

  if (path.endsWith("/add/resume") || path.endsWith("/add-resume")) {
    return { section: "add", entity: "competitors" };
  }

  if (path.endsWith("/analytics/competitors") || path.endsWith("/competitor-analytics")) {
    return { section: "analytics", entity: "competitors" };
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
      entity === "competitors" ? "/list/resumes" : "/list/vacancies",
    );
  }

  if (section === "add") {
    return joinPath(
      basePath,
      entity === "competitors" ? "/add/resume" : "/add/vacancy",
    );
  }

  return joinPath(
    basePath,
    entity === "competitors" ? "/analytics/competitors" : "/analytics/vacancies",
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
      return route.entity === "competitors" ? (
        <AddCompetitorResumePage />
      ) : (
        <AddVacancyPage />
      );
    }

    if (route.section === "analytics") {
      return route.entity === "competitors" ? (
        <Suspense fallback={<div className="emptyState routeFallback">Загружаю аналитику конкурентов...</div>}>
          <CompetitorAnalyticsPage />
        </Suspense>
      ) : (
        <Suspense fallback={<div className="emptyState routeFallback">Загружаю аналитику...</div>}>
          <AnalyticsPage />
        </Suspense>
      );
    }

    return route.entity === "competitors" ? (
      <CompetitorResumeListPage />
    ) : (
      <VacancyListPage />
    );
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
