import OpenAI from "openai";
import { VacancyAnalysis, VacancyDetails } from "../types";
import { env } from "../utils/env";
import { logger } from "../utils/logger";
import { buildAnalysisPrompt } from "./prompt";

const client = new OpenAI({
  apiKey: env.groqApiKey,
  baseURL: env.groqBaseUrl,
});

const extractJson = (content: string): VacancyAnalysis => {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("LLM returned no JSON payload");
  }

  const parsed = JSON.parse(match[0]) as VacancyAnalysis;

  if (
    typeof parsed.match_percent !== "number" ||
    (parsed.decision !== "yes" && parsed.decision !== "no") ||
    typeof parsed.reason !== "string" ||
    typeof parsed.salary_estimate !== "string" ||
    typeof parsed.cover_letter !== "string"
  ) {
    throw new Error("LLM returned JSON with invalid schema");
  }

  return parsed;
};

export const analyzeVacancy = async (
  vacancy: VacancyDetails,
): Promise<VacancyAnalysis> => {
  try {
    const completion = await client.chat.completions.create({
      model: env.groqModel,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You must return only valid JSON that matches the requested schema.",
        },
        {
          role: "user",
          content: buildAnalysisPrompt(vacancy),
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("LLM returned empty response");
    }

    return extractJson(content);
  } catch (error) {
    logger.error("Failed to analyze vacancy with Groq", error);

    if (error instanceof OpenAI.AuthenticationError) {
      throw new Error(
        "Groq API key is invalid. Проверь значение GROQ_API_KEY в .env",
      );
    }

    if (
      error instanceof OpenAI.BadRequestError &&
      error.code === "model_decommissioned"
    ) {
      throw new Error(
        `Groq model '${env.groqModel}' is deprecated. Укажи актуальную модель в GROQ_MODEL, например llama-3.3-70b-versatile`,
      );
    }

    throw new Error("Не удалось получить ответ от LLM");
  }
};
