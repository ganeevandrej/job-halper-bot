import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { TEXT_START_MESSAGE, TEXT_VACANCY, TEXT_USE_COMMAND, TEXT_ANALYZING, TEXT_ERROR_ENV } from './constants';
import { analyzeVacancyOllama } from './services/ollamaService';

dotenv.config();

const token = process.env.BOT_TOKEN;

if (!token) {
  throw new Error(TEXT_ERROR_ENV);
}

const bot = new TelegramBot(token, { polling: true });

console.log('🤖 Бот запущен');

const waitingForVacancy = new Set<number>();

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, TEXT_START_MESSAGE);
});

bot.onText(/\/vacancy/, (msg) => {
  waitingForVacancy.add(msg.chat.id);
  bot.sendMessage(msg.chat.id, TEXT_VACANCY);
});

bot.on('message', async (msg) => {
  if (!msg.text) return;
  if (msg.text.startsWith('/')) return;

  const chatId = msg.chat.id;

  if (!waitingForVacancy.has(chatId)) {
    bot.sendMessage(chatId, TEXT_USE_COMMAND);
    return;
  }

  waitingForVacancy.delete(chatId);

  bot.sendMessage(chatId, TEXT_ANALYZING);

  try {
    const result = await analyzeVacancyOllama(msg.text);

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