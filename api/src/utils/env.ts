import dotenv from "dotenv";
import path from "path";

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const env = {
  port: Number(process.env.API_PORT || process.env.PORT || 3001),
  sqliteFilePath: process.env.SQLITE_FILE_PATH || "./data/job-helper.sqlite",
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqBaseUrl: "https://api.groq.com/openai/v1",
  groqModel: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  vkGroupToken: process.env.VK_GROUP_TOKEN || "",
  vkGroupId: Number(process.env.VK_GROUP_ID || 0),
  vkDigestPeerId: Number(process.env.VK_DIGEST_PEER_ID || 0),
  webAppUrl: process.env.WEB_APP_URL || "http://localhost:5173",
  searchIntervalMinutes: Number(process.env.SEARCH_INTERVAL_MINUTES || 10),
};
