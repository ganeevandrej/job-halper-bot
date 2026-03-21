import fs from "fs";
import path from "path";
import initSqlJs, { Database, SqlJsStatic } from "sql.js";
import { env } from "../utils/env";

interface DatabaseContext {
  db: Database;
  filePath: string;
}

let sqlPromise: Promise<SqlJsStatic> | null = null;
let contextPromise: Promise<DatabaseContext> | null = null;

const loadSql = (): Promise<SqlJsStatic> => {
  if (!sqlPromise) {
    sqlPromise = initSqlJs();
  }

  return sqlPromise as Promise<SqlJsStatic>;
};

const ensureDataDir = (filePath: string): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
};

const initSchema = (db: Database): void => {
  db.run(`
    CREATE TABLE IF NOT EXISTS processed_vacancies (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      salary TEXT NOT NULL,
      url TEXT NOT NULL,
      search_url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      match_percent INTEGER,
      reason TEXT,
      decision TEXT,
      processed_at TEXT NOT NULL,
      sent_at TEXT
    );
  `);

  try {
    db.run(
      "ALTER TABLE processed_vacancies ADD COLUMN status TEXT NOT NULL DEFAULT 'queued'",
    );
  } catch {
    // Column already exists in existing databases.
  }
};

const createContext = async (): Promise<DatabaseContext> => {
  const SQL = await loadSql();
  const filePath = env.sqliteFilePath;
  ensureDataDir(filePath);

  const buffer = fs.existsSync(filePath) ? fs.readFileSync(filePath) : undefined;
  const db = buffer ? new SQL.Database(buffer) : new SQL.Database();

  initSchema(db);

  return { db, filePath };
};

export const getDatabase = async (): Promise<DatabaseContext> => {
  if (!contextPromise) {
    contextPromise = createContext();
  }

  return contextPromise;
};

export const persistDatabase = async (): Promise<void> => {
  const { db, filePath } = await getDatabase();
  ensureDataDir(filePath);
  fs.writeFileSync(filePath, Buffer.from(db.export()));
};
