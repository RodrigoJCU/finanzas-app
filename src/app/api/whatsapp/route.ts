import { after, type NextRequest } from "next/server";
import { whatsappEnv } from "@/lib/server-env";
import { verifySignature } from "@/lib/whatsapp/client";
import { handleWebhook, type WebhookPayload } from "@/lib/whatsapp/handler";

// Gemini + descarga de audio pueden tardar; el trabajo corre después de responder a Meta.
export const maxDuration = 60;

// Meta llama a este GET una sola vez, al configurar el webhook, para comprobar que es tuyo.
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token && challenge && token === whatsappEnv().WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("Forbidden", { status: 403 });
}

// Mensajes entrantes y estados de entrega.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  // Respondemos 200 de inmediato (si Meta no recibe respuesta rápida, reintenta y duplica).
  after(async () => {
    try {
      await handleWebhook(payload);
    } catch (error) {
      console.error("[whatsapp] error en el webhook", error);
    }
  });

  return new Response("OK", { status: 200 });
}
