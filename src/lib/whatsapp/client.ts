import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { whatsappEnv } from "@/lib/server-env";
import { createAdminClient } from "@/lib/supabase/admin";

// Límites de la API de WhatsApp para mensajes interactivos.
const LIMITS = { body: 1024, button: 20, rowTitle: 24, rowDescription: 72, rows: 10, sectionTitle: 24 };

const cut = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1)}…`);

function graphUrl(path: string) {
  const { WHATSAPP_API_VERSION } = whatsappEnv();
  return `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${path}`;
}

async function graphFetch(path: string, init: RequestInit = {}) {
  const { WHATSAPP_ACCESS_TOKEN } = whatsappEnv();
  return fetch(graphUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    signal: AbortSignal.timeout(15000),
  });
}

// Verifica que la petición al webhook viene realmente de Meta (cabecera X-Hub-Signature-256).
export function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", whatsappEnv().WHATSAPP_APP_SECRET).update(rawBody, "utf8").digest();
  const received = Buffer.from(signatureHeader.slice("sha256=".length), "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

type OutboundPayload =
  | { type: "text"; text: { body: string; preview_url: boolean } }
  | { type: "interactive"; interactive: Record<string, unknown> }
  | { type: "template"; template: Record<string, unknown> };

type SendOptions = { userId: string | null; transactionId?: string | null; logBody: string };

// Envía un mensaje y lo registra en whatsapp_messages. Devuelve el id del mensaje de Meta,
// o null si falló (el error queda registrado; nunca lanza para no cortar el flujo).
async function send(to: string, payload: OutboundPayload, options: SendOptions): Promise<string | null> {
  const { WHATSAPP_PHONE_NUMBER_ID } = whatsappEnv();
  const supabase = createAdminClient();
  let waMessageId: string | null = null;
  let error: string | null = null;

  try {
    const response = await graphFetch(`${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, ...payload }),
    });
    const json = (await response.json().catch(() => null)) as {
      messages?: { id: string }[];
      error?: { message?: string; code?: number };
    } | null;
    if (response.ok && json?.messages?.[0]?.id) {
      waMessageId = json.messages[0].id;
    } else {
      error = `HTTP ${response.status}: ${json?.error?.message ?? "respuesta inesperada"} (code ${json?.error?.code ?? "-"})`;
    }
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  }

  const { error: logError } = await supabase.from("whatsapp_messages").insert({
    user_id: options.userId,
    transaction_id: options.transactionId ?? null,
    wa_message_id: waMessageId,
    direction: "outbound",
    phone: to,
    message_type: payload.type,
    body: options.logBody.slice(0, 4000),
    status: waMessageId ? "sent" : "failed",
    error,
  });
  if (logError) console.error("[whatsapp] no se pudo registrar el mensaje saliente", logError.message);
  if (error) console.error("[whatsapp] error al enviar", error);

  return waMessageId;
}

export function sendText(to: string, body: string, options: Omit<SendOptions, "logBody">) {
  return send(to, { type: "text", text: { body: cut(body, 4096), preview_url: false } }, { ...options, logBody: body });
}

export type ListRow = { id: string; title: string; description?: string };

export function sendList(
  to: string,
  message: { body: string; button: string; sectionTitle: string; rows: ListRow[]; footer?: string },
  options: Omit<SendOptions, "logBody">,
) {
  const rows = message.rows.slice(0, LIMITS.rows).map((row) => ({
    id: row.id,
    title: cut(row.title, LIMITS.rowTitle),
    ...(row.description ? { description: cut(row.description, LIMITS.rowDescription) } : {}),
  }));
  return send(
    to,
    {
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: cut(message.body, LIMITS.body) },
        ...(message.footer ? { footer: { text: cut(message.footer, 60) } } : {}),
        action: {
          button: cut(message.button, LIMITS.button),
          sections: [{ title: cut(message.sectionTitle, LIMITS.sectionTitle), rows }],
        },
      },
    },
    { ...options, logBody: message.body },
  );
}

// Plantilla aprobada por Meta (para escribir fuera de la ventana de 24h). Los parámetros
// reemplazan {{1}}, {{2}}... del cuerpo de la plantilla.
export function sendTemplate(
  to: string,
  template: { name: string; language: string; bodyParams: string[] },
  options: SendOptions,
) {
  return send(
    to,
    {
      type: "template",
      template: {
        name: template.name,
        language: { code: template.language },
        components: [
          {
            type: "body",
            parameters: template.bodyParams.map((text) => ({ type: "text", text: cut(text, 1000) })),
          },
        ],
      },
    },
    options,
  );
}

// Marca el mensaje como leído (doble check azul) y muestra "escribiendo..." mientras la IA piensa.
export async function markAsReadWithTyping(messageId: string) {
  const { WHATSAPP_PHONE_NUMBER_ID } = whatsappEnv();
  try {
    await graphFetch(`${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
        typing_indicator: { type: "text" },
      }),
    });
  } catch (error) {
    console.error("[whatsapp] no se pudo marcar como leído", error);
  }
}

const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

// Descarga un audio/nota de voz enviado por el usuario.
export async function downloadMedia(mediaId: string): Promise<{ base64: string; mimeType: string }> {
  const metaResponse = await graphFetch(mediaId);
  if (!metaResponse.ok) throw new Error(`No se pudo obtener el audio (HTTP ${metaResponse.status})`);
  const meta = (await metaResponse.json()) as { url: string; mime_type: string; file_size?: number };
  if (meta.file_size && meta.file_size > MAX_AUDIO_BYTES) throw new Error("El audio es demasiado largo");

  const fileResponse = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${whatsappEnv().WHATSAPP_ACCESS_TOKEN}` },
    signal: AbortSignal.timeout(20000),
  });
  if (!fileResponse.ok) throw new Error(`No se pudo descargar el audio (HTTP ${fileResponse.status})`);
  const buffer = Buffer.from(await fileResponse.arrayBuffer());
  if (buffer.byteLength > MAX_AUDIO_BYTES) throw new Error("El audio es demasiado largo");

  // WhatsApp envía "audio/ogg; codecs=opus"; Gemini espera el tipo sin parámetros.
  return { base64: buffer.toString("base64"), mimeType: meta.mime_type.split(";")[0].trim() };
}
