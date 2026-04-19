import fs from "fs";
import path from "path";
import initSqlJs, { Database, SqlJsStatic } from "sql.js";
import { env } from "../utils/env";

interface ProfileDatabaseContext {
  db: Database;
  filePath: string;
}

let sqlPromise: Promise<SqlJsStatic> | null = null;
let contextPromise: Promise<ProfileDatabaseContext> | null = null;

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
    CREATE TABLE IF NOT EXISTS candidate_profile (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      salary_expectation TEXT,
      formats_json TEXT NOT NULL,
      location TEXT,
      has_photo INTEGER NOT NULL DEFAULT 0,
      about TEXT NOT NULL,
      skills_json TEXT NOT NULL,
      experience_json TEXT NOT NULL,
      education_json TEXT NOT NULL,
      experience_text TEXT,
      education_text TEXT,
      cover_letter_instructions TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
};

const createContext = async (): Promise<ProfileDatabaseContext> => {
  const SQL = await loadSql();
  const filePath = env.profileSqliteFilePath;
  ensureDataDir(filePath);

  const buffer = fs.existsSync(filePath) ? fs.readFileSync(filePath) : undefined;
  const db = buffer ? new SQL.Database(buffer) : new SQL.Database();

  initSchema(db);

  return { db, filePath };
};

export const getProfileDatabase = async (): Promise<ProfileDatabaseContext> => {
  if (!contextPromise) {
    contextPromise = createContext();
  }

  return contextPromise;
};

export const persistProfileDatabase = async (): Promise<void> => {
  const { db, filePath } = await getProfileDatabase();
  ensureDataDir(filePath);
  fs.writeFileSync(filePath, Buffer.from(db.export()));
};
