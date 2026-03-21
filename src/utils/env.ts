import dotenv from "dotenv";

dotenv.config();

const telegramBotToken =
  process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN || "";

if (!telegramBotToken) {
  throw new Error(
    "Missing required environment variable: TELEGRAM_BOT_TOKEN (or legacy TELEGRAM_TOKEN)",
  );
}

if (!process.env.GROQ_API_KEY) {
  throw new Error("Missing required environment variable: GROQ_API_KEY");
}

export const env = {
  telegramBotToken,
  groqApiKey: process.env.GROQ_API_KEY as string,
  groqBaseUrl: "https://api.groq.com/openai/v1",
  groqModel: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  parserHeadless: process.env.PLAYWRIGHT_HEADLESS === "true",
  telegramDigestChatId: process.env.TELEGRAM_DIGEST_CHAT_ID || "",
  digestCron: process.env.DIGEST_CRON || "0 9 * * *",
  digestTimezone: process.env.DIGEST_TIMEZONE || "Europe/Moscow",
  sqliteFilePath: process.env.SQLITE_FILE_PATH || "./data/job-helper.sqlite",
};
