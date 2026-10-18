import "server-only";
import { Type, type Schema } from "@google/genai";
import { z } from "zod";
import { generateJson } from "@/lib/ai/gemini";
import { formatLocal } from "@/lib/time";

const MAX_EMAIL_CHARS = 6000;

const SYSTEM = `Eres un extractor de datos de notificaciones bancarias (principalmente de Perú: BCP, Interbank, BBVA, Scotiabank, BanBif, Banco de la Nación, Yape, Plin, tarjetas de crédito y débito, etc.).
Recibes el asunto y el texto de un correo. Decide si notifica UN movimiento de dinero ya realizado en la cuenta o tarjeta del usuario (compra, consumo, pago, retiro, transferencia enviada o recibida, abono, depósito, yapeo).

Reglas:
- is_transaction = false para publicidad, estados de cuenta mensuales, avisos de seguridad, códigos OTP, recordatorios de pago pendiente, cambios de clave, o correos sin un monto concreto de un movimiento.
- type = "expense" si sale dinero del usuario (compra, consumo, pago, retiro, transferencia enviada). type = "income" si entra (abono, depósito, transferencia recibida, yapeo recibido, devolución).
- amount: número positivo con punto decimal, sin símbolos ni separadores de miles (ej. "S/ 1,234.50" -> 1234.5).
- currency: código ISO 4217. "S/" o "soles" = PEN. "$", "US$" o "dólares" = USD. Si no se indica, usa PEN.
- merchant: nombre del comercio o de la persona contraparte, limpio y en formato legible (ej. "WONG SAN ISIDRO" -> "Wong San Isidro"). null si no aparece.
- occurred_at: fecha y hora LOCAL del movimiento tal como aparece en el correo, en formato "YYYY-MM-DDTHH:mm". Si solo hay fecha usa "T12:00". Si no aparece, null. Las fechas peruanas suelen ser día/mes/año.
- bank_name: nombre corto del banco o billetera (ej. "BCP", "Interbank", "Yape"). null si no se sabe.
- card_last4: últimos 4 dígitos de la tarjeta o cuenta si aparecen, si no null.
- description: resumen muy breve en español (máx. 80 caracteres), ej. "Compra con tarjeta de débito".
- Si el correo es un reenvío manual (Fwd/RV), analiza el mensaje original que contiene.`;

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    is_transaction: { type: Type.BOOLEAN },
    type: { type: Type.STRING, enum: ["expense", "income"], nullable: true },
    amount: { type: Type.NUMBER, nullable: true },
    currency: { type: Type.STRING, nullable: true },
    merchant: { type: Type.STRING, nullable: true },
    occurred_at: { type: Type.STRING, nullable: true },
    bank_name: { type: Type.STRING, nullable: true },
    card_last4: { type: Type.STRING, nullable: true },
    description: { type: Type.STRING, nullable: true },
  },
  required: ["is_transaction", "type", "amount", "currency", "merchant", "occurred_at", "bank_name", "card_last4", "description"],
  propertyOrdering: [
    "is_transaction",
    "type",
    "amount",
    "currency",
    "merchant",
    "occurred_at",
    "bank_name",
    "card_last4",
    "description",
  ],
};

const validator = z.object({
  is_transaction: z.boolean(),
  type: z.enum(["expense", "income"]).nullable(),
  amount: z.number().nullable(),
  currency: z.string().nullable(),
  merchant: z.string().nullable(),
  occurred_at: z.string().nullable(),
  bank_name: z.string().nullable(),
  card_last4: z.string().nullable(),
  description: z.string().nullable(),
});

export type ExtractedTransaction = {
  type: "expense" | "income";
  amount: number;
  currency: string;
  merchant: string | null;
  occurredAtLocal: string | null;
  bankName: string | null;
  cardLast4: string | null;
  description: string | null;
};

const clean = (value: string | null, max: number) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, max) : null;
};

export async function extractTransactionFromEmail(input: {
  subject: string;
  from: string;
  text: string;
  receivedAt: Date;
  timeZone: string;
}): Promise<ExtractedTransaction | null> {
  const body = input.text.replace(/\n{3,}/g, "\n\n").slice(0, MAX_EMAIL_CHARS);
  const result = await generateJson({
    system: SYSTEM,
    responseSchema,
    validator,
    parts: [
      {
        text: `Correo recibido el ${formatLocal(input.receivedAt, input.timeZone)} (hora local del usuario).
Remitente: ${input.from}
Asunto: ${input.subject}

${body}`,
      },
    ],
  });

  if (!result.is_transaction || !result.type || result.amount === null || !(result.amount > 0)) return null;

  const currency = result.currency?.trim().toUpperCase();
  const last4 = result.card_last4?.replace(/\D/g, "").slice(-4);

  return {
    type: result.type,
    amount: Math.round(result.amount * 100) / 100,
    currency: currency && /^[A-Z]{3}$/.test(currency) ? currency : "PEN",
    merchant: clean(result.merchant, 200),
    occurredAtLocal: result.occurred_at,
    bankName: clean(result.bank_name, 80),
    cardLast4: last4 && last4.length === 4 ? last4 : null,
    description: clean(result.description, 500),
  };
}
