import fs from "fs";
import path from "path";
import initSqlJs, { Database, SqlJsStatic } from "sql.js";
import { env } from "../utils/env";

interface ManualVacancyDatabaseContext {
  db: Database;
  filePath: string;
}

let sqlPromise: Promise<SqlJsStatic> | null = null;
let contextPromise: Promise<ManualVacancyDatabaseContext> | null = null;

const loadSql = (): Promise<SqlJsStatic> => {
  if (!sqlPromise) {
    sqlPromise = initSqlJs();
  }

  return sqlPromise as Promise<SqlJsStatic>;
};

const ensureDataDir = (filePath: string): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
};

const createManualVacanciesTableSql = (tableName: string): string => `
  CREATE TABLE IF NOT EXISTS ${tableName} (
    id TEXT PRIMARY KEY,
    hh_id TEXT,
    company_id TEXT,
    url TEXT,
    raw_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    salary TEXT,
    estimated_salary TEXT,
    format TEXT NOT NULL,
    formats_json TEXT NOT NULL DEFAULT '[]',
    location TEXT NOT NULL,
    grade TEXT NOT NULL,
    stack_json TEXT NOT NULL,
    tasks_json TEXT NOT NULL,
    requirements_json TEXT NOT NULL,
    nice_to_have_json TEXT NOT NULL,
    red_flags_json TEXT NOT NULL,
    summary TEXT NOT NULL,
    match_percent INTEGER,
    decision TEXT,
    reason TEXT,
    salary_estimate TEXT,
    cover_letter TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    analyzed_at TEXT
  );
`;

const createCompaniesTableSql = (): string => `
  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    hh_id TEXT UNIQUE,
    raw_text TEXT NOT NULL,
    name TEXT NOT NULL,
    domain TEXT,
    product_type TEXT,
    short_pitch TEXT,
    highlights_json TEXT NOT NULL DEFAULT '[]',
    tech_level TEXT,
    summary TEXT,
    structured_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

const getColumnRows = (db: Database): unknown[][] => {
  const columns = db.exec("PRAGMA table_info(manual_vacancies)");
  return columns[0]?.values ?? [];
};

const getColumnNames = (db: Database): Set<string> =>
  new Set(getColumnRows(db).map((row) => String(row[1])));

const migrateNullableSalary = (db: Database): void => {
  const salaryColumn = getColumnRows(db).find((row) => row[1] === "salary");
  const salaryIsNotNull = Number(salaryColumn?.[3] ?? 0) === 1;

  if (!salaryIsNotNull) {
    return;
  }

  db.run("DROP TABLE IF EXISTS manual_vacancies_next");
  db.run(createManualVacanciesTableSql("manual_vacancies_next"));
  db.run(`
    INSERT INTO manual_vacancies_next (
      id, hh_id, company_id, url, raw_text, status, title, company, salary, estimated_salary,
      format, formats_json, location, grade, stack_json, tasks_json, requirements_json,
      nice_to_have_json, red_flags_json, summary, match_percent, decision,
      reason, salary_estimate, cover_letter, created_at, updated_at, analyzed_at
    )
    SELECT
      id,
      hh_id,
      NULL,
      url,
      raw_text,
      status,
      title,
      company,
      NULLIF(NULLIF(salary, 'Unknown'), ''),
      estimated_salary,
      format,
      formats_json,
      location,
      grade,
      stack_json,
      tasks_json,
      requirements_json,
      nice_to_have_json,
      red_flags_json,
      summary,
      match_percent,
      decision,
      reason,
      salary_estimate,
      cover_letter,
      created_at,
      updated_at,
      analyzed_at
    FROM manual_vacancies
  `);
  db.run("DROP TABLE manual_vacancies");
  db.run("ALTER TABLE manual_vacancies_next RENAME TO manual_vacancies");
};

const migrateManualVacancyStatuses = (db: Database): void => {
  db.run(`
    UPDATE manual_vacancies
    SET status = CASE status
      WHEN 'viewed' THEN 'new'
      WHEN 'rejected' THEN 'not_fit'
      WHEN 'hidden' THEN 'archived'
      ELSE status
    END
    WHERE status IN ('viewed', 'rejected', 'hidden')
  `);
};

const initSchema = (db: Database): void => {
  db.run(createManualVacanciesTableSql("manual_vacancies"));
  db.run(createCompaniesTableSql());

  const columnNames = getColumnNames(db);

  if (!columnNames.has("formats_json")) {
    db.run("ALTER TABLE manual_vacancies ADD COLUMN formats_json TEXT NOT NULL DEFAULT '[]'");
  }

  if (!columnNames.has("estimated_salary")) {
    db.run("ALTER TABLE manual_vacancies ADD COLUMN estimated_salary TEXT");
  }

  if (!columnNames.has("hh_id")) {
    db.run("ALTER TABLE manual_vacancies ADD COLUMN hh_id TEXT");
  }

  if (!columnNames.has("url")) {
    db.run("ALTER TABLE manual_vacancies ADD COLUMN url TEXT");
  }

  if (!columnNames.has("company_id")) {
    db.run("ALTER TABLE manual_vacancies ADD COLUMN company_id TEXT");
  }

  if (!columnNames.has("status")) {
    db.run("ALTER TABLE manual_vacancies ADD COLUMN status TEXT NOT NULL DEFAULT 'new'");
  }

  migrateNullableSalary(db);
  migrateManualVacancyStatuses(db);
};

const createContext = async (): Promise<ManualVacancyDatabaseContext> => {
  const SQL = await loadSql();
  const filePath = env.manualVacanciesSqliteFilePath;
  ensureDataDir(filePath);

  const buffer = fs.existsSync(filePath) ? fs.readFileSync(filePath) : undefined;
  const db = buffer ? new SQL.Database(buffer) : new SQL.Database();

  initSchema(db);

  return { db, filePath };
};

export const getManualVacancyDatabase =
  async (): Promise<ManualVacancyDatabaseContext> => {
    if (!contextPromise) {
      contextPromise = createContext();
    }

    return contextPromise;
  };

export const persistManualVacancyDatabase = async (): Promise<void> => {
  const { db, filePath } = await getManualVacancyDatabase();
  ensureDataDir(filePath);
  fs.writeFileSync(filePath, Buffer.from(db.export()));
};
