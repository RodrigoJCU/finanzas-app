import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Cómo tratamos tus datos en nuestro asistente de finanzas personales.",
};

const UPDATED_AT = "18 de octubre de 2026";

export default function PrivacyPage() {
  const contact = process.env.IMAP_USER?.trim() || "el correo de soporte indicado en la aplicación";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 text-slate-800 dark:text-slate-200">
      <h1 className="text-3xl font-bold">Política de privacidad</h1>
      <p className="mt-2 text-sm text-slate-500">Última actualización: {UPDATED_AT}</p>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">1. Qué es este servicio</h2>
        <p>
          Es un asistente de finanzas personales que registra tus gastos e ingresos a partir de las notificaciones que
          tu banco te envía por correo, te pregunta por WhatsApp a qué categoría pertenecen y te muestra un resumen en
          un panel web.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">2. Datos que recopilamos</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Datos de cuenta: correo electrónico y nombre.</li>
          <li>Número de WhatsApp que vinculas voluntariamente y los mensajes que intercambias con el asistente.</li>
          <li>
            Correos de notificación bancaria que tú decides reenviarnos. De ellos extraemos monto, moneda, comercio,
            fecha, banco y los últimos 4 dígitos de la tarjeta. Nunca pedimos ni guardamos números completos de
            tarjeta, claves ni códigos de seguridad.
          </li>
          <li>Categorías, presupuestos y notas que registras.</li>
          <li>Estado de tu suscripción. Los datos de pago los procesa Stripe; nosotros no vemos tu tarjeta.</li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">3. Para qué los usamos</h2>
        <p>
          Solo para prestarte el servicio: registrar y categorizar tus movimientos, enviarte avisos y resúmenes por
          WhatsApp, mostrarte tu panel y gestionar tu suscripción. No vendemos ni compartimos tus datos con fines
          publicitarios.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">4. Proveedores que intervienen</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Supabase: base de datos y autenticación.</li>
          <li>Vercel: alojamiento de la aplicación.</li>
          <li>Meta (WhatsApp Business Platform): envío y recepción de mensajes.</li>
          <li>Google (Gmail y Gemini): recepción de correos y análisis automático del texto de los mensajes.</li>
          <li>Stripe: procesamiento de pagos.</li>
        </ul>
        <p>Cada proveedor trata los datos según sus propias políticas y solo para operar su servicio.</p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">5. Seguridad y conservación</h2>
        <p>
          Tus datos se guardan cifrados en tránsito y con controles de acceso que impiden que otros usuarios los vean.
          Los conservamos mientras tengas una cuenta activa.
        </p>
      </section>

      <section id="eliminar-datos" className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">6. Cómo eliminar tus datos</h2>
        <p>
          Puedes pedir la eliminación de tu cuenta y de todos tus datos (movimientos, mensajes, categorías y
          presupuestos) escribiendo a <strong>{contact}</strong> desde el correo con el que te registraste, con el
          asunto &quot;Eliminar mi cuenta&quot;. Lo haremos en un plazo máximo de 30 días y te confirmaremos por
          correo. También puedes dejar de recibir mensajes en cualquier momento bloqueando el número del asistente en
          WhatsApp.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">7. Contacto</h2>
        <p>
          Para cualquier consulta sobre privacidad escríbenos a <strong>{contact}</strong>.
        </p>
      </section>
    </main>
  );
}
