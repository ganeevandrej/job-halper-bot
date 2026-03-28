import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.API_PORT || process.env.PORT || 3001),
  sqliteFilePath: process.env.SQLITE_FILE_PATH || "./data/job-helper.sqlite",
};
