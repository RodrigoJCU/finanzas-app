// Utilidades de fecha con zona horaria (sin dependencias externas).

// Desfase en milisegundos de la zona horaria respecto a UTC en un instante dado (ej. Lima = -5h).
function offsetMs(timeZone: string, instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

// Convierte una fecha/hora "de reloj" en una zona horaria al instante UTC real.
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = guess - offsetMs(timeZone, new Date(guess));
  const second = guess - offsetMs(timeZone, new Date(first));
  return new Date(second);
}

// Partes de fecha de un instante, vistas en la zona horaria indicada.
export function zonedParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute") };
}

// Inicio y fin (exclusivo) del mes actual en la zona horaria del usuario, como instantes UTC.
export function monthRange(timeZone: string, now: Date = new Date()) {
  const { year, month } = zonedParts(now, timeZone);
  const start = zonedTimeToUtc(year, month, 1, 0, 0, timeZone);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const end = zonedTimeToUtc(nextYear, nextMonth, 1, 0, 0, timeZone);
  return { start, end, monthKey: `${year}-${String(month).padStart(2, "0")}-01` };
}

// "2026-10-18T14:35" (hora local del usuario) -> Date UTC. Devuelve null si el texto no es válido.
export function parseLocalDateTime(value: string | null | undefined, timeZone: string): Date | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
  if (!match) return null;
  const [, y, mo, d, h = "12", mi = "00"] = match;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  const hour = Number(h);
  const minute = Number(mi);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const date = zonedTimeToUtc(year, month, day, hour, minute, timeZone);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Fecha y hora local legible para incluir en prompts y mensajes: "2026-10-18 14:35".
export function formatLocal(instant: Date, timeZone: string): string {
  const { year, month, day, hour, minute } = zonedParts(instant, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Días que faltan (redondeado hacia arriba, mínimo 0) hasta una fecha.
export function daysUntil(iso: string, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now.getTime()) / DAY_MS));
}

// ¿La fecha ocurrió hace menos de `days` días?
export function isWithinLastDays(iso: string, days: number, now: Date = new Date()): boolean {
  return now.getTime() - new Date(iso).getTime() < days * DAY_MS;
}

export const MONTH_NAMES_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
