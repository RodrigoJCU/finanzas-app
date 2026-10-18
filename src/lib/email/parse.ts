// Funciones puras para analizar correos (sin red ni base de datos, fáciles de probar).

// Las cabeceras del correo crudo (todo lo anterior a la primera línea en blanco).
export function rawHeaders(source: Buffer): string {
  const text = source.subarray(0, Math.min(source.length, 64 * 1024)).toString("latin1");
  const end = text.search(/\r?\n\r?\n/);
  return end === -1 ? text : text.slice(0, end);
}

// Busca el token del usuario en la dirección de reenvío buzon+TOKEN@dominio.
// Gmail conserva la dirección exacta en Delivered-To / X-Forwarded-To / To.
export function extractInboundToken(headers: string, mailboxAddress: string): string | null {
  const domain = mailboxAddress.split("@")[1]?.toLowerCase();
  if (!domain) return null;
  const escaped = domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = headers.match(new RegExp(`\\+([a-f0-9]{12})@${escaped}`, "i"));
  return match ? match[1].toLowerCase() : null;
}

export function isGmailForwardingConfirmation(from: string): boolean {
  return /forwarding-noreply@google\.com/i.test(from);
}

// Código numérico del correo de confirmación de reenvío de Gmail.
// Asunto típico: "(#123456789) Gmail Forwarding Confirmation..." o "(n.º 123456789) Confirmación de reenvío...".
export function extractGmailForwardingCode(subject: string, text: string): string | null {
  const fromSubject = subject.match(/\((?:#|n\.?\s?[ºo°]\.?\s*)?\s*(\d{6,12})\)/i);
  if (fromSubject) return fromSubject[1];
  const fromBody = text.match(/(?:confirmation code|c[oó]digo de confirmaci[oó]n)\D{0,20}(\d{6,12})/i);
  return fromBody ? fromBody[1] : null;
}

// Filtro barato antes de llamar a la IA: ¿el correo parece mencionar un monto de dinero?
export function looksLikeMoneyMovement(subject: string, text: string): boolean {
  const content = `${subject}\n${text}`;
  const currencyAmount = /(S\/\.?|US\$|\$|PEN|USD|soles|d[oó]lares)\s?\d/i.test(content);
  const decimalAmount = /\d[\d,.]*[.,]\d{2}\b/.test(content);
  return currencyAmount || decimalAmount;
}

// Convierte HTML a texto plano legible (respaldo si el correo no trae versión de texto).
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|table)>/gi, "\n")
    .replace(/<\/t[dh]>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
