import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { TEXT_VACANCY, TEXT_USE_COMMAND, TEXT_ANALYZING, TEXT_ERROR_ENV } from './constants';
import { analyzeVacancyOllama } from './services/ollamaService';
import { userTokens } from './services/authStorage';

dotenv.config();

const token = process.env.BOT_TOKEN;

if (!token) {
  throw new Error(TEXT_ERROR_ENV);
}
export const bot = new TelegramBot(token, { polling: true });

const waitingForVacancy = new Set<number>();

export const getButtons = (chatId: number) => {
  const isAuthorized = userTokens.has(chatId);

  return {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: isAuthorized ? "✅ Авторизован" : "🔑 Авторизация",
            callback_data: isAuthorized ? 'already_auth' : 'start_auth'
          }
        ],
        [
          {
            text: "🔍 Анализ вакансии",
            callback_data: 'start_analysis'
          }
        ]
      ],
    }
  };
};

bot.onText(/\/vacancy/, (msg) => {
  waitingForVacancy.add(msg.chat.id);
  bot.sendMessage(msg.chat.id, TEXT_VACANCY);
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;
  if (text.startsWith('/')) return;

  if (text === "Я") {
    bot.sendMessage(chatId, "🤖 Бот запущен! Выбери действие", getButtons(chatId));
    return
  }

  if (text === "start_auth") {
    const clientId = process.env.HH_CLIENT_ID;
    const redirectUri = 'http://localhost:3000/job-helper-bot';

    // Формируем ссылку, чтобы HH знал, куда вернуть 'code' и какой это 'chatId'
    const authUrl = `https://hh.ru?client_id=${clientId}&redirect_uri=${redirectUri}&state=${chatId}`;

    bot.sendMessage(chatId, `Привет! Чтобы я мог работать с твоим HH, [авторизуйся по ссылке](${authUrl})`, { parse_mode: 'Markdown' });
    return;
  }

  if (text === "start_analysis") {
    if (!userTokens.has(chatId)) {
      return bot.sendMessage(chatId, "⚠️ Сначала нужно авторизоваться!");
    }
    waitingForVacancy.add(chatId);
    bot.sendMessage(chatId, "Пришли текст вакансии для анализа...");
    return;
  }

  if (!waitingForVacancy.has(chatId)) {
    bot.sendMessage(chatId, TEXT_USE_COMMAND);
    return;
  }

  waitingForVacancy.delete(chatId);

  bot.sendMessage(chatId, TEXT_ANALYZING);

  try {
    const result = await analyzeVacancyOllama(text);

    const response = `
📊 Соответствие: ${result.matchPercent}%
👉 Рекомендация: ${result.recommendation}
💰 Зарплата: ${result.salaryAdvice}
✉️ Сопроводительное письмо:
${result.coverLetter}
📄 Выбранное резюме: ${result.resumeChoice}
    `.trim();

    bot.sendMessage(chatId, response);
  } catch (e) {
    bot.sendMessage(chatId, "❌ Ошибка AI: " + (e as Error).message);
  }
});