import axios from "axios";
import { resumes, coverLetterTemplate } from "../../constants";
import { AIResult } from "./types";
import { createBody } from "./utils";

const OLLAMA_API_ENDPOINT = `${process.env.OLLAMA_URL}/api/generate`;

export async function analyzeVacancyOllama(
    vacancyText: string
): Promise<AIResult> {
    const prompt = `
Ты карьерный ассистент frontend-разработчика.

Дано:
- Вакансия: ${vacancyText}
- Два резюме кандидата:

1) ${resumes[0].title}
О себе: ${resumes[0].about}
Опыт работы: ${resumes[0].experience}
Навыки: ${resumes[0].skills.join(", ")}
Проекты:
${resumes[0].projects.map((p, i) => `
Проект ${i + 1}: ${p.name}
Контекст: ${p.context}
Зона ответственности: ${p.responsibilities.join("; ")}
Ключевые задачи: ${p.tasks.join("; ")}
Стек: ${p.stack.join(", ")}
`).join("\n")}

2) ${resumes[1].title}
О себе: ${resumes[1].about}
Опыт работы: ${resumes[1].experience}
Навыки: ${resumes[1].skills.join(", ")}
Проекты:
${resumes[1].projects.map((p, i) => `
Проект ${i + 1}: ${p.name}
Контекст: ${p.context}
Зона ответственности: ${p.responsibilities.join("; ")}
Ключевые задачи: ${p.tasks.join("; ")}
Стек: ${p.stack.join(", ")}
`).join("\n")}

- Шаблон сопроводительного письма: ${coverLetterTemplate}

Задача:
1. Определи, на сколько процентов кандидат подходит под вакансию.
2. Дай рекомендацию: стоит откликаться или нет и почему.
3. Предложи ориентировочную зарплату.
4. Сгенерируй сопроводительное письмо по шаблону (подставь блок "О себе" и конкретные навыки/проекты, которые совпадают с вакансией).
5. Выбери, какое из двух резюме лучше использовать.

Ответь строго в формате JSON, без дополнительных комментариев:
{
  "matchPercent": число,
  "recommendation": строка,
  "salaryAdvice": строка,
  "coverLetter": строка,
  "resumeChoice": строка
}
`;

    const response = await axios.post(OLLAMA_API_ENDPOINT, createBody(prompt));
    const text = response.data.response;

    try {
        return JSON.parse(text);
    } catch (e) {
        throw new Error("AI вернул невалидный JSON:\n" + text);
    }
}