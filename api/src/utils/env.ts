import dotenv from "dotenv";
import path from "path";

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const resolveApiDataPath = (fileName: string): string =>
  path.resolve(__dirname, "../../data", fileName);

export const env = {
  port: Number(process.env.API_PORT || process.env.PORT || 3001),
  manualVacanciesSqliteFilePath:
    process.env.MANUAL_VACANCIES_SQLITE_FILE_PATH ||
    resolveApiDataPath("manual-vacancies.sqlite"),
  profileSqliteFilePath:
    process.env.PROFILE_SQLITE_FILE_PATH || resolveApiDataPath("profile.sqlite"),
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqBaseUrl: "https://api.groq.com/openai/v1",
  groqModel:
    process.env.GROQ_MODEL ||
    "meta-llama/llama-4-scout-17b-16e-instruct",
  webAppUrl: process.env.WEB_APP_URL || "http://localhost:5173",
  corsAllowedOrigins:
    process.env.CORS_ALLOWED_ORIGINS ||
    process.env.WEB_APP_URL ||
    "http://localhost:5173,https://ganeevandrej.github.io",
};
