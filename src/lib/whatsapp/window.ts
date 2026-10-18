// WhatsApp solo permite mensajes libres (gratis) dentro de las 24h siguientes al último
// mensaje del usuario. Dejamos 10 minutos de margen.
const WINDOW_MS = 24 * 60 * 60 * 1000 - 10 * 60 * 1000;

export function isWindowOpen(lastInboundAt: string | null, now: Date = new Date()): boolean {
  if (!lastInboundAt) return false;
  return now.getTime() - new Date(lastInboundAt).getTime() < WINDOW_MS;
}
