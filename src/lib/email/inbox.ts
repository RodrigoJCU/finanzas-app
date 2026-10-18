import "server-only";
import { ImapFlow } from "imapflow";
import { processRawEmail, type EmailOutcome } from "@/lib/email/process";
import { emailEnv } from "@/lib/server-env";

// Máximo de correos por ejecución: el plan gratuito de Gemini admite pocas peticiones por minuto.
const MAX_EMAILS_PER_RUN = 5;
const LOOKBACK_DAYS = 7;

export type InboxRunResult = {
  found: number;
  processed: number;
  outcomes: Partial<Record<EmailOutcome, number>>;
  stoppedEarly: boolean;
};

// Lee los correos no leídos del buzón central, los procesa y los marca como leídos.
export async function processInbox(options: { deadline: number }): Promise<InboxRunResult> {
  const { IMAP_HOST, IMAP_PORT, IMAP_USER, IMAP_PASSWORD } = emailEnv();
  const client = new ImapFlow({
    host: IMAP_HOST,
    port: IMAP_PORT,
    secure: IMAP_PORT === 993,
    auth: { user: IMAP_USER, pass: IMAP_PASSWORD },
    logger: false,
    disableAutoIdle: true,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 60000,
  });

  const result: InboxRunResult = { found: 0, processed: 0, outcomes: {}, stoppedEarly: false };
  try {
    await client.connect();
  } catch (error) {
    const details = error as { authenticationFailed?: boolean; responseText?: string; message?: string };
    if (details.authenticationFailed) {
      throw new Error(
        "Gmail rechazó el inicio de sesión: revisa IMAP_USER y que IMAP_PASSWORD sea una contraseña de aplicación de 16 letras.",
      );
    }
    throw new Error(`No se pudo conectar al correo: ${details.responseText ?? details.message ?? String(error)}`);
  }
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
      const uids = (await client.search({ seen: false, since }, { uid: true })) || [];
      result.found = uids.length;
      const batch = [...uids].sort((a, b) => a - b).slice(0, MAX_EMAILS_PER_RUN);

      for (const uid of batch) {
        if (Date.now() > options.deadline) {
          result.stoppedEarly = true;
          break;
        }
        const message = await client.fetchOne(String(uid), { source: true, internalDate: true }, { uid: true });
        if (!message || !message.source) continue;

        const internalDate = message.internalDate ? new Date(message.internalDate) : null;
        const outcome = await processRawEmail(message.source, internalDate);
        result.outcomes[outcome] = (result.outcomes[outcome] ?? 0) + 1;
        result.processed++;

        if (outcome === "retry") {
          // Gemini está al límite: dejamos este y los siguientes para la próxima ejecución.
          await client.messageFlagsRemove(String(uid), ["\\Seen"], { uid: true });
          result.stoppedEarly = true;
          break;
        }
        await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => client.close());
  }
  if (result.found > MAX_EMAILS_PER_RUN) result.stoppedEarly = true;
  return result;
}
