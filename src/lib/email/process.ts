import "server-only";
import { createHash } from "node:crypto";
import { simpleParser } from "mailparser";
import { extractTransactionFromEmail } from "@/lib/ai/extract-transaction";
import { AiUnavailableError } from "@/lib/ai/gemini";
import {
  extractGmailForwardingCode,
  extractInboundToken,
  htmlToText,
  isGmailForwardingConfirmation,
  looksLikeMoneyMovement,
  rawHeaders,
} from "@/lib/email/parse";
import { userHasAccess } from "@/lib/finance/access";
import { notifyTransaction } from "@/lib/finance/transactions";
import { emailEnv } from "@/lib/server-env";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseLocalDateTime } from "@/lib/time";
import { sendText } from "@/lib/whatsapp/client";
import { botText } from "@/lib/whatsapp/messages";
import { isWindowOpen } from "@/lib/whatsapp/window";
import type { InboundEmailStatus } from "@/types/database";

// "retry": Gemini no estaba disponible; el correo se deja sin leer para reintentarlo luego.
// "duplicate": ya se había procesado antes.
export type EmailOutcome = Exclude<InboundEmailStatus, "processing"> | "retry" | "duplicate";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function processRawEmail(source: Buffer, internalDate: Date | null): Promise<EmailOutcome> {
  const supabase = createAdminClient();
  const parsed = await simpleParser(source, { skipImageLinks: true, skipTextToHtml: true });

  const messageId = parsed.messageId?.trim() || `sha256:${createHash("sha256").update(source).digest("hex")}`;
  const from = parsed.from?.text ?? "";
  const subject = parsed.subject ?? "";
  const receivedAt = parsed.date ?? internalDate ?? new Date();
  const text = (parsed.text?.trim() || (typeof parsed.html === "string" ? htmlToText(parsed.html) : "")).slice(0, 20000);

  // Reserva el correo. Si otra ejecución ya lo tomó, no se vuelve a procesar.
  const claim = () =>
    supabase
      .from("inbound_emails")
      .insert({
        message_id: messageId,
        status: "processing",
        from_address: from.slice(0, 300),
        subject: subject.slice(0, 300),
        received_at: receivedAt.toISOString(),
      })
      .select("id")
      .single();
  let { data: claimed, error: claimError } = await claim();
  if (claimError?.code === "23505") {
    // Una reserva "processing" de hace más de 10 minutos es de una ejecución que se cortó: se reintenta.
    const { data: stale } = await supabase
      .from("inbound_emails")
      .delete()
      .eq("message_id", messageId)
      .eq("status", "processing")
      .lt("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .select("id");
    if (!stale?.length) return "duplicate";
    ({ data: claimed, error: claimError } = await claim());
    if (claimError?.code === "23505") return "duplicate";
  }
  if (claimError || !claimed) throw new Error(`No se pudo registrar el correo: ${claimError?.message ?? "sin datos"}`);
  const claimId = claimed.id;

  const finish = async (
    status: Exclude<InboundEmailStatus, "processing">,
    extra: { user_id?: string | null; transaction_id?: string | null; error?: string | null } = {},
  ) => {
    await supabase.from("inbound_emails").update({ status, ...extra }).eq("id", claimId);
    return status;
  };

  try {
    const token = extractInboundToken(rawHeaders(source), emailEnv().IMAP_USER);
    if (!token) return await finish("unmatched_user", { error: "sin token en la dirección de destino" });

    const { data: profile } = await supabase.from("profiles").select("*").eq("inbound_token", token).maybeSingle();
    if (!profile) return await finish("unmatched_user", { error: `token desconocido: ${token}` });

    await supabase.from("profiles").update({ last_email_received_at: new Date().toISOString() }).eq("id", profile.id);

    // Correo de Gmail para confirmar el reenvío automático: guardamos el código y se lo enviamos.
    if (isGmailForwardingConfirmation(from)) {
      const code = extractGmailForwardingCode(subject, text);
      if (code) {
        await supabase
          .from("profiles")
          .update({ gmail_forwarding_code: code, gmail_forwarding_code_at: new Date().toISOString() })
          .eq("id", profile.id);
        if (profile.whatsapp_phone && isWindowOpen(profile.whatsapp_last_inbound_at)) {
          await sendText(profile.whatsapp_phone, botText.gmailCode(code), { userId: profile.id });
        }
      }
      return await finish("ignored", { user_id: profile.id, error: "confirmación de reenvío de Gmail" });
    }

    if (!(await userHasAccess(profile.id, profile.trial_ends_at))) {
      return await finish("ignored", { user_id: profile.id, error: "usuario sin suscripción activa" });
    }

    if (!looksLikeMoneyMovement(subject, text)) {
      return await finish("ignored", { user_id: profile.id, error: "no menciona montos" });
    }

    const extracted = await extractTransactionFromEmail({
      subject,
      from,
      text,
      receivedAt,
      timeZone: profile.timezone,
    });
    if (!extracted) return await finish("ignored", { user_id: profile.id, error: "la IA no detectó un movimiento" });

    // Fecha del movimiento: la del correo, salvo que sea absurda (futuro o muy antigua).
    let occurredAt = parseLocalDateTime(extracted.occurredAtLocal, profile.timezone) ?? receivedAt;
    const age = receivedAt.getTime() - occurredAt.getTime();
    if (age < -DAY_MS || age > 60 * DAY_MS) occurredAt = receivedAt;

    const { data: transaction, error: insertError } = await supabase
      .from("transactions")
      .insert({
        user_id: profile.id,
        type: extracted.type,
        amount: extracted.amount,
        currency: extracted.currency,
        merchant: extracted.merchant,
        description: extracted.description,
        occurred_at: occurredAt.toISOString(),
        bank_name: extracted.bankName,
        card_last4: extracted.cardLast4,
        source: "email",
        status: "pending",
        email_message_id: messageId,
      })
      .select("*")
      .single();
    if (insertError?.code === "23505") {
      return await finish("ignored", { user_id: profile.id, error: "movimiento duplicado" });
    }
    if (insertError) throw new Error(`No se pudo guardar el movimiento: ${insertError.message}`);

    await finish("parsed", { user_id: profile.id, transaction_id: transaction.id });

    const notified = await notifyTransaction(transaction, profile);
    if (notified === "failed") console.error("[email] no se pudo avisar por WhatsApp", transaction.id);
    return "parsed";
  } catch (error) {
    if (error instanceof AiUnavailableError) {
      // Libera la reserva para que la próxima ejecución lo vuelva a intentar.
      await supabase.from("inbound_emails").delete().eq("id", claimId);
      return "retry";
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error("[email] error procesando", messageId, message);
    return await finish("error", { error: message.slice(0, 1000) });
  }
}
