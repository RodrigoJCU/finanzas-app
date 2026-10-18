import "server-only";
import { Type, type Part, type Schema } from "@google/genai";
import { z } from "zod";
import { generateJson } from "@/lib/ai/gemini";
import { formatMoney } from "@/lib/money";
import { formatLocal } from "@/lib/time";
import type { Tables } from "@/types/database";

const SYSTEM = `Eres el asistente de finanzas personales de un usuario en Perú que te escribe por WhatsApp, por texto o por nota de voz, en español informal (puede usar jerga peruana, abreviaturas o errores de ortografía).

Tu trabajo es entender qué quiere y devolver JSON. Intenciones posibles:
- "categorize_pending": responde a qué categoría pertenece el MOVIMIENTO PENDIENTE (ej. "comida", "fue el almuerzo", "taxi", "eso es del super"). Elige category_key de la lista. Si menciona un detalle útil (ej. "almuerzo con Juan"), ponlo en note.
- "ignore_pending": pide no contar el movimiento pendiente (ej. "no lo cuentes", "es transferencia entre mis cuentas", "ignóralo", "no es mío").
- "new_transaction": registra un gasto o ingreso NUEVO que no es el pendiente (ej. "gasté 15 soles en un taxi", "me pagaron 2000 dólares"). Llena new_type, new_amount, new_currency (PEN por defecto si dice soles o no indica; USD si dice dólares), new_merchant si lo menciona, y category_key.
- "summary": pide un resumen, cuánto lleva gastado, o cómo va su presupuesto.
- "help": saluda, pide ayuda o pregunta qué puedes hacer.
- "unclear": no se entiende o no encaja en lo anterior.

Reglas:
- Si hay un movimiento pendiente y el mensaje es corto y describe un tipo de gasto sin monto, es "categorize_pending".
- Si el mensaje incluye un monto explícito distinto al del pendiente, es "new_transaction".
- category_key DEBE ser un número de la lista y del mismo tipo (gasto/ingreso) que el movimiento. Si ninguna encaja bien, usa la categoría "Otros" del tipo correspondiente.
- confidence: de 0 a 1, qué tan seguro estás.
- Si el mensaje es audio, escribe en transcript lo que dijo el usuario, literal y breve. Si es texto, transcript = null.`;

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    transcript: { type: Type.STRING, nullable: true },
    intent: {
      type: Type.STRING,
      enum: ["categorize_pending", "ignore_pending", "new_transaction", "summary", "help", "unclear"],
    },
    category_key: { type: Type.INTEGER, nullable: true },
    note: { type: Type.STRING, nullable: true },
    new_type: { type: Type.STRING, enum: ["expense", "income"], nullable: true },
    new_amount: { type: Type.NUMBER, nullable: true },
    new_currency: { type: Type.STRING, nullable: true },
    new_merchant: { type: Type.STRING, nullable: true },
    confidence: { type: Type.NUMBER },
  },
  required: [
    "transcript",
    "intent",
    "category_key",
    "note",
    "new_type",
    "new_amount",
    "new_currency",
    "new_merchant",
    "confidence",
  ],
  propertyOrdering: [
    "transcript",
    "intent",
    "category_key",
    "note",
    "new_type",
    "new_amount",
    "new_currency",
    "new_merchant",
    "confidence",
  ],
};

const validator = z.object({
  transcript: z.string().nullable(),
  intent: z.enum(["categorize_pending", "ignore_pending", "new_transaction", "summary", "help", "unclear"]),
  category_key: z.number().int().nullable(),
  note: z.string().nullable(),
  new_type: z.enum(["expense", "income"]).nullable(),
  new_amount: z.number().nullable(),
  new_currency: z.string().nullable(),
  new_merchant: z.string().nullable(),
  confidence: z.number(),
});

export type Interpretation =
  | { intent: "categorize_pending"; category: Tables<"categories">; note: string | null; confidence: number; transcript: string | null }
  | { intent: "ignore_pending"; confidence: number; transcript: string | null }
  | {
      intent: "new_transaction";
      type: "expense" | "income";
      amount: number;
      currency: string;
      merchant: string | null;
      category: Tables<"categories"> | null;
      note: string | null;
      confidence: number;
      transcript: string | null;
    }
  | { intent: "summary" | "help" | "unclear"; transcript: string | null };

export async function interpretMessage(input: {
  message: { kind: "text"; text: string } | { kind: "audio"; base64: string; mimeType: string };
  pending: Tables<"transactions"> | null;
  categories: Tables<"categories">[];
  timeZone: string;
}): Promise<Interpretation> {
  const active = input.categories.filter((category) => !category.is_archived);
  const list = active
    .map((category, index) => `${index + 1}. ${category.name} (${category.kind === "expense" ? "gasto" : "ingreso"})`)
    .join("\n");

  const pendingText = input.pending
    ? `MOVIMIENTO PENDIENTE de categorizar:
- Tipo: ${input.pending.type === "expense" ? "gasto" : "ingreso"}
- Monto: ${formatMoney(Number(input.pending.amount), input.pending.currency)}
- Comercio: ${input.pending.merchant ?? "desconocido"}
- Detalle: ${input.pending.description ?? "-"}
- Fecha: ${formatLocal(new Date(input.pending.occurred_at), input.timeZone)}`
    : "No hay ningún movimiento pendiente de categorizar.";

  const context: Part = {
    text: `Fecha y hora actual del usuario: ${formatLocal(new Date(), input.timeZone)}

${pendingText}

CATEGORÍAS DEL USUARIO (category_key. nombre):
${list}

MENSAJE DEL USUARIO:`,
  };

  const messagePart: Part =
    input.message.kind === "text"
      ? { text: input.message.text.slice(0, 1000) }
      : { inlineData: { data: input.message.base64, mimeType: input.message.mimeType } };

  const result = await generateJson({ system: SYSTEM, responseSchema, validator, parts: [context, messagePart] });

  const transcript = result.transcript?.trim() || null;
  const confidence = Math.min(1, Math.max(0, result.confidence));
  const pick = (kind: "expense" | "income") => {
    const chosen = result.category_key ? active[result.category_key - 1] : undefined;
    return chosen && chosen.kind === kind ? chosen : null;
  };
  const note = result.note?.trim().slice(0, 500) || null;

  switch (result.intent) {
    case "categorize_pending": {
      if (!input.pending) return { intent: "unclear", transcript };
      const category = pick(input.pending.type);
      if (!category) return { intent: "unclear", transcript };
      return { intent: "categorize_pending", category, note, confidence, transcript };
    }
    case "ignore_pending":
      return input.pending ? { intent: "ignore_pending", confidence, transcript } : { intent: "unclear", transcript };
    case "new_transaction": {
      if (!result.new_type || result.new_amount === null || !(result.new_amount > 0)) {
        return { intent: "unclear", transcript };
      }
      const currency = result.new_currency?.trim().toUpperCase();
      return {
        intent: "new_transaction",
        type: result.new_type,
        amount: Math.round(result.new_amount * 100) / 100,
        currency: currency && /^[A-Z]{3}$/.test(currency) ? currency : "PEN",
        merchant: result.new_merchant?.trim().slice(0, 200) || null,
        category: pick(result.new_type),
        note,
        confidence,
        transcript,
      };
    }
    default:
      return { intent: result.intent, transcript };
  }
}
