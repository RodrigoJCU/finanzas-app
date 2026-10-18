import "server-only";
import { ApiError, GoogleGenAI, type Part, type Schema } from "@google/genai";
import type { z } from "zod";
import { geminiEnv } from "@/lib/server-env";

// Se lanza cuando el plan gratuito de Gemini llega a su límite (HTTP 429) o el servicio
// está saturado (HTTP 503). Quien llama debe reintentar más tarde, no descartar el dato.
export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiUnavailableError";
  }
}

let client: GoogleGenAI | undefined;

function getClient() {
  client ??= new GoogleGenAI({ apiKey: geminiEnv().GEMINI_API_KEY });
  return client;
}

// Pide a Gemini una respuesta JSON que cumpla `responseSchema` y la valida con zod.
export async function generateJson<T extends z.ZodType>(options: {
  system: string;
  parts: Part[];
  responseSchema: Schema;
  validator: T;
}): Promise<z.infer<T>> {
  let text: string | undefined;
  try {
    const response = await getClient().models.generateContent({
      model: geminiEnv().GEMINI_MODEL,
      contents: [{ role: "user", parts: options.parts }],
      config: {
        systemInstruction: options.system,
        responseMimeType: "application/json",
        responseSchema: options.responseSchema,
        temperature: 0.1,
      },
    });
    text = response.text;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 429 || error.status >= 500)) {
      throw new AiUnavailableError(`Gemini no disponible (HTTP ${error.status}): ${error.message}`);
    }
    throw error;
  }

  if (!text) throw new Error("Gemini devolvió una respuesta vacía");

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Gemini devolvió JSON inválido: ${text.slice(0, 200)}`);
  }
  return options.validator.parse(json);
}
