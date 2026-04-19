import { useEffect, useState } from "react";
import App from "./App";
import ManualVacanciesPage from "./ManualVacanciesPage";
import ProfilePage from "./ProfilePage";

type Route = "hh" | "manual" | "profile";

const getRoute = (): Route => {
  if (window.location.pathname.endsWith("/manual-vacancies")) {
    return "manual";
  }

  if (window.location.pathname.endsWith("/profile")) {
    return "profile";
  }

  return "hh";
};

const getBasePath = (): string =>
  window.location.pathname
    .replace(/\/manual-vacancies\/?$/, "")
    .replace(/\/profile\/?$/, "") || "/";

const getManualPath = (): string =>
  `${getBasePath().replace(/\/$/, "")}/manual-vacancies`.replace("//", "/");

const getProfilePath = (): string =>
  `${getBasePath().replace(/\/$/, "")}/profile`.replace("//", "/");

const getHhPath = (): string =>
  getBasePath();

function Root() {
  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    const handlePopState = () => setRoute(getRoute());

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (nextRoute: Route) => {
    const nextPath = nextRoute === "manual"
      ? getManualPath()
      : nextRoute === "profile"
        ? getProfilePath()
        : getHhPath();
    window.history.pushState({}, "", nextPath);
    setRoute(nextRoute);
  };

  return (
    <>
      <nav className="appNav">
        <button
          type="button"
          className={route === "hh" ? "active" : ""}
          onClick={() => navigate("hh")}
        >
          HH API
        </button>
        <button
          type="button"
          className={route === "manual" ? "active" : ""}
          onClick={() => navigate("manual")}
        >
          Ручной ввод
        </button>
        <button
          type="button"
          className={route === "profile" ? "active" : ""}
          onClick={() => navigate("profile")}
        >
          Профиль
        </button>
      </nav>

      {route === "manual" ? (
        <ManualVacanciesPage />
      ) : route === "profile" ? (
        <ProfilePage />
      ) : (
        <App />
      )}
    </>
  );
}

export default Root;
