import dotenv from "dotenv";
import path from "path";

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const env = {
  port: Number(process.env.API_PORT || process.env.PORT || 3001),
  sqliteFilePath: process.env.SQLITE_FILE_PATH || "./data/job-helper.sqlite",
  manualVacanciesSqliteFilePath:
    process.env.MANUAL_VACANCIES_SQLITE_FILE_PATH ||
    "./data/manual-vacancies.sqlite",
  profileSqliteFilePath:
    process.env.PROFILE_SQLITE_FILE_PATH || "./data/profile.sqlite",
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqBaseUrl: "https://api.groq.com/openai/v1",
  groqModel:
    process.env.GROQ_MODEL ||
    "meta-llama/llama-4-scout-17b-16e-instruct",
  hhApiUserAgent:
    process.env.HH_API_USER_AGENT ||
    "job-helper-api/1.0 (ganeev_andrey@vk.com)",
  hhAccessToken: process.env.HH_ACCESS_TOKEN || "",
  vkGroupToken: process.env.VK_GROUP_TOKEN || "",
  vkGroupId: Number(process.env.VK_GROUP_ID || 0),
  vkDigestPeerId: Number(process.env.VK_DIGEST_PEER_ID || 0),
  webAppUrl: process.env.WEB_APP_URL || "http://localhost:5173",
  searchIntervalMinutes: Number(process.env.SEARCH_INTERVAL_MINUTES || 10),
};
