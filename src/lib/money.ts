// Formato de montos para mensajes y para el dashboard (estilo Perú).
const SYMBOLS: Record<string, string> = {
  PEN: "S/",
  USD: "US$",
  EUR: "€",
};

export function formatMoney(amount: number, currency: string): string {
  const number = new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  const symbol = SYMBOLS[currency] ?? currency;
  return `${symbol} ${number}`;
}
