// Textos del bot (en un solo lugar para editarlos fácilmente).
import { publicEnv } from "@/lib/env";

const appUrl = () => publicEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

export const botText = {
  help: () =>
    `🤖 *Soy tu asistente de finanzas*

Cuando tu banco te envíe un correo por un gasto, te escribiré aquí para preguntarte la categoría. Respóndeme con texto, audio o eligiendo de la lista.

También puedes:
• Registrar un gasto: "gasté 25 soles en taxi"
• Registrar un ingreso: "me pagaron 3000 soles"
• Ver tu mes: escribe *resumen*

Tu dashboard: ${appUrl()}`,

  welcome: (name: string | null, forwarding: string | null) =>
    `✅ *¡Listo${name ? `, ${name.split(" ")[0]}` : ""}! Tu WhatsApp quedó vinculado.*

${
  forwarding
    ? `Último paso: configura tu correo para que reenvíe automáticamente los avisos de tu banco a:\n\n*${forwarding}*\n\nLas instrucciones paso a paso están en tu dashboard: ${appUrl()}`
    : `Configura el reenvío de los correos de tu banco desde tu dashboard: ${appUrl()}`
}

Escribe *ayuda* para ver lo que puedo hacer.`,

  unknownNumber: () =>
    `👋 Hola, aún no reconozco este número.

Para usarme, crea tu cuenta y vincula tu WhatsApp aquí: ${appUrl()}`,

  invalidCode: () =>
    `❌ Ese código no es válido o ya venció (dura 15 minutos). Genera uno nuevo desde tu dashboard: ${appUrl()}`,

  paywall: () =>
    `🔒 Tu periodo de prueba terminó.

Para seguir registrando y categorizando tus gastos, activa tu suscripción aquí: ${appUrl()}/suscripcion`,

  aiBusy: () => `⏳ Estoy recibiendo muchos mensajes. Inténtalo de nuevo en un minuto, por favor.`,

  error: () => `😕 Tuve un problema procesando tu mensaje. Inténtalo de nuevo en un momento.`,

  unsupported: () => `Por ahora solo entiendo mensajes de texto y notas de voz 🙂`,

  unclearWithPending: () => `🤔 No te entendí. Dime la categoría con una palabra (ej. "comida", "taxi") o elige de la lista.`,

  unclear: () => `🤔 No te entendí. Escribe *ayuda* para ver lo que puedo hacer.`,

  heard: (transcript: string) => `🎙️ _"${transcript}"_\n`,

  gmailCode: (code: string) =>
    `📧 Gmail te pide confirmar el reenvío automático.

Tu código de confirmación es: *${code}*

Pégalo en Gmail > Configuración > Reenvío y correo POP/IMAP > "Verificar".`,
};
