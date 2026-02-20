import express, { Request, Response } from 'express';
// import { bot } from './bot';

const app = express();

export const PORT = process.env.APP_PORT || 3000;

app.listen(PORT, () => console.log("Hi"));

app.get('/job-helper-bot', async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const chatId = req.query.state as string;

    if (code && chatId) {
        try {
            // await bot.sendMessage(chatId, '🚀 Успешно! Теперь я могу искать вакансии от вашего имени.');
            // res.send('Авторизация завершена, вернитесь в телеграм.');
        } catch (err) {
            res.status(500).send('Ошибка при обмене кода на токен');
        }
    }
});