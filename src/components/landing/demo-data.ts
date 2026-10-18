import type { DashboardData } from "@/lib/finance/dashboard";

// Datos de ejemplo para la vista previa del dashboard en la página de inicio (no son de ningún usuario).
export const DEMO_DASHBOARD: DashboardData = {
  currency: "PEN",
  currencies: ["PEN"],
  total: 2432.92,
  income: 4200,
  changeVsPrevious: -0.08,
  today: {
    amount: 86,
    avgPerDay: 84.71,
    biggest: { name: "Tottus", amount: 42.1 },
    spark: [60, 92, 41, 120, 75, 64, 140, 58, 88, 102, 47, 95, 130, 70, 82, 66, 110, 54, 98, 86],
  },
  sources: [
    { label: "BCP ··0123", amount: 1286.4, share: 0.52 },
    { label: "Interbank ··4567", amount: 710.7, share: 0.29 },
    { label: "Yape", amount: 435.82, share: 0.19 },
  ],
  budget: {
    amount: 4000,
    spent: 2450.6,
    ratio: 0.61,
    remaining: 1549.4,
    categories: [
      { label: "🍽️ Restaurantes", ratio: 0.84 },
      { label: "🚗 Transporte", ratio: 0.57 },
    ],
  },
  activity: [
    { id: "1", title: "Starbucks", subtitle: "Restaurantes · BCP ··0123", emoji: "☕", color: "#ea580c", amount: 24.5, currency: "PEN", type: "expense", when: "Hoy, 9:41 a. m.", pending: false },
    { id: "2", title: "Uber", subtitle: "Transporte · BCP ··0123", emoji: "🚗", color: "#2563eb", amount: 18.9, currency: "PEN", type: "expense", when: "Hoy, 8:12 a. m.", pending: false },
    { id: "3", title: "Tottus", subtitle: "Supermercado · Interbank ··4567", emoji: "🛒", color: "#16a34a", amount: 42.1, currency: "PEN", type: "expense", when: "Ayer, 7:30 p. m.", pending: false },
    { id: "4", title: "Netflix", subtitle: "Suscripciones · BCP ··0123", emoji: "📱", color: "#4f46e5", amount: 44.9, currency: "PEN", type: "expense", when: "Ayer, 6:00 a. m.", pending: false },
  ],
  merchants: [
    { name: "Rappi", count: 14, amount: 392.4, share: 0.16, emoji: "🍔", color: "#ea580c" },
    { name: "Tottus", count: 5, amount: 318.9, share: 0.13, emoji: "🛒", color: "#16a34a" },
    { name: "Plaza Vea", count: 3, amount: 221.3, share: 0.09, emoji: "🛒", color: "#16a34a" },
    { name: "Uber", count: 8, amount: 146.2, share: 0.06, emoji: "🚗", color: "#2563eb" },
    { name: "Starbucks", count: 9, amount: 98.5, share: 0.04, emoji: "☕", color: "#ea580c" },
  ],
  accounts: [
    { label: "BCP ··0123", kind: "Tarjeta", amount: 1286.4 },
    { label: "Interbank ··4567", kind: "Tarjeta", amount: 710.7 },
    { label: "Yape", kind: "Billetera digital", amount: 435.82 },
  ],
  insights: [
    { tone: "up", title: "Gastaste 32% más", tag: "Delivery", detail: "18 pedidos este mes", note: "+32% vs. el mes pasado" },
    { tone: "down", title: "Ahorraste S/ 120.00", tag: "Transporte", detail: "vs. el mes pasado" },
    { tone: "warning", title: "Rappi es tu comercio #1", tag: "Comercio", detail: "14 compras este mes" },
    { tone: "info", title: "Gastarás S/ 3,500.00", tag: "Proyección", detail: "a fin de mes a tu ritmo actual", note: "S/ 420.00 menos que el mes pasado" },
  ],
  pendingCount: 0,
};
