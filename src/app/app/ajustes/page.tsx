import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { updateProfile } from "@/app/app/actions";
import { ActionForm } from "@/components/app/action-form";
import { CategoryManager } from "@/components/app/category-manager";
import { CopyButton } from "@/components/app/copy-button";
import { WhatsappLink } from "@/components/app/whatsapp-link";
import { Alert, Button, Card, Input, Label, PageHeader, Select, buttonClass } from "@/components/ui";
import { requireAccess } from "@/lib/auth";
import { getCategories } from "@/lib/finance/month";
import { isWithinLastDays } from "@/lib/time";
import { forwardingAddress } from "@/lib/whatsapp/link";

export const metadata: Metadata = { title: "Ajustes" };

const TIMEZONES = [
  ["America/Lima", "Perú (Lima)"],
  ["America/Bogota", "Colombia (Bogotá)"],
  ["America/Guayaquil", "Ecuador (Guayaquil)"],
  ["America/Mexico_City", "México (Ciudad de México)"],
  ["America/Santiago", "Chile (Santiago)"],
  ["America/Argentina/Buenos_Aires", "Argentina (Buenos Aires)"],
  ["America/La_Paz", "Bolivia (La Paz)"],
  ["America/New_York", "EE. UU. (Nueva York)"],
  ["Europe/Madrid", "España (Madrid)"],
] as const;

const SUBSCRIPTION_LABEL: Record<string, string> = {
  active: "Activa",
  trialing: "Activa (periodo de prueba)",
  past_due: "Pago pendiente",
  canceled: "Cancelada",
  unpaid: "Impaga",
  incomplete: "Incompleta",
  incomplete_expired: "Vencida",
  paused: "Pausada",
};

export default async function SettingsPage() {
  const { profile, access } = await requireAccess();
  const categories = await getCategories();
  const forwarding = forwardingAddress(profile.inbound_token);
  const botNumber = process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER?.replace(/\D/g, "") || null;
  const dateFormat = (value: string) =>
    new Date(value).toLocaleDateString("es-PE", { timeZone: profile.timezone, day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <PageHeader title="Ajustes" description="Conexiones, perfil y suscripción." />

      <div className="space-y-6">
        <Card>
          <h2 id="whatsapp" className="mb-4 scroll-mt-24 text-lg font-semibold text-slate-900 dark:text-white">
            💬 WhatsApp
          </h2>
          <WhatsappLink phone={profile.whatsapp_phone} botNumber={botNumber} />
        </Card>

        <Card>
          <h2 id="correo" className="mb-1 scroll-mt-24 text-lg font-semibold text-slate-900 dark:text-white">
            📧 Correos de tu banco
          </h2>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
            Reenvía automáticamente a esta dirección los correos de notificación de tu banco (BCP, Interbank, BBVA,
            Yape…). Nunca te pedimos tu contraseña.
          </p>
          {forwarding ? (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <code className="min-w-0 flex-1 break-all text-sm font-semibold text-slate-900 dark:text-slate-100">{forwarding}</code>
              <CopyButton text={forwarding} />
            </div>
          ) : (
            <Alert tone="warning">La dirección de reenvío aún no está configurada en el servidor.</Alert>
          )}

          <div className="mt-3 text-sm">
            {profile.last_email_received_at ? (
              <Alert tone="success">
                ✅ Conexión activa. Último correo recibido el {dateFormat(profile.last_email_received_at)}.
              </Alert>
            ) : (
              <Alert tone="info">Aún no recibimos correos tuyos. Sigue los pasos de abajo.</Alert>
            )}
          </div>

          {profile.gmail_forwarding_code &&
            profile.gmail_forwarding_code_at &&
            isWithinLastDays(profile.gmail_forwarding_code_at, 3) && (
            <div className="mt-3">
              <Alert tone="warning">
                Gmail pidió confirmar el reenvío. Tu código de confirmación es{" "}
                <strong className="select-all text-base">{profile.gmail_forwarding_code}</strong>. Pégalo en Gmail
                &gt; Configuración &gt; Reenvío y correo POP/IMAP &gt; &quot;Verificar&quot;.
              </Alert>
            </div>
          )}

          <details className="mt-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <summary className="cursor-pointer text-sm font-semibold text-slate-800 dark:text-slate-100">
              Paso a paso en Gmail (computadora)
            </summary>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
              <li>
                Abre Gmail en la computadora → ⚙️ <strong>Ver toda la configuración</strong> → pestaña{" "}
                <strong>Reenvío y correo POP/IMAP</strong>.
              </li>
              <li>
                Pulsa <strong>Agregar una dirección de reenvío</strong>, pega la dirección de arriba y acepta.
              </li>
              <li>
                Gmail enviará un código de confirmación: te lo mostraremos aquí y por WhatsApp. Escríbelo en{" "}
                <strong>Verificar</strong>. <em>No actives el reenvío de todos tus correos.</em>
              </li>
              <li>
                Ve a la pestaña <strong>Filtros y direcciones bloqueadas</strong> → <strong>Crear un filtro</strong>.
              </li>
              <li>
                En <strong>De</strong> escribe los remitentes de tu banco separados por <code>OR</code>, por ejemplo:{" "}
                <code className="break-all">notificaciones@notificacionesbcp.com.pe OR @interbank.pe OR @bbva.pe</code>
              </li>
              <li>
                Pulsa <strong>Crear filtro</strong>, marca <strong>Reenviarlo a</strong> y elige tu dirección. Guarda.
              </li>
            </ol>
          </details>
          <details className="mt-2 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <summary className="cursor-pointer text-sm font-semibold text-slate-800 dark:text-slate-100">
              Paso a paso en Outlook / Hotmail
            </summary>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
              <li>
                En outlook.com → ⚙️ <strong>Configuración</strong> → <strong>Correo</strong> → <strong>Reglas</strong> →{" "}
                <strong>Agregar nueva regla</strong>.
              </li>
              <li>
                Condición: <strong>De</strong> → el correo de tu banco. Acción: <strong>Reenviar a</strong> → tu dirección
                de arriba.
              </li>
              <li>Guarda la regla. Outlook no pide confirmación.</li>
            </ol>
          </details>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            ¿Quieres probar ya? Reenvía manualmente un correo de tu banco a tu dirección y en 1–2 minutos aparecerá aquí.
          </p>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">👤 Perfil</h2>
          <ActionForm action={updateProfile} submitLabel="Guardar cambios" resetOnSuccess={false}>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="fullName">Nombre</Label>
                <Input id="fullName" name="fullName" defaultValue={profile.full_name ?? ""} required />
              </div>
              <div>
                <Label htmlFor="currency">Moneda principal</Label>
                <Select id="currency" name="currency" defaultValue={profile.currency}>
                  <option value="PEN">Soles (S/)</option>
                  <option value="USD">Dólares (US$)</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="timezone">Zona horaria</Label>
                <Select id="timezone" name="timezone" defaultValue={profile.timezone}>
                  {TIMEZONES.some(([value]) => value === profile.timezone) ? null : (
                    <option value={profile.timezone}>{profile.timezone}</option>
                  )}
                  {TIMEZONES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Los presupuestos y gráficos usan tu moneda principal. Correo: {profile.email}
            </p>
          </ActionForm>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">🏷️ Categorías</h2>
          <CategoryManager categories={categories} />
        </Card>

        <Card>
          <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">⭐ Suscripción</h2>
          {access.subscriptionStatus ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Estado: <strong>{SUBSCRIPTION_LABEL[access.subscriptionStatus] ?? access.subscriptionStatus}</strong>
              {access.currentPeriodEnd && (
                <>
                  {" "}
                  · {access.cancelAtPeriodEnd ? "termina" : "se renueva"} el {dateFormat(access.currentPeriodEnd)}
                </>
              )}
            </p>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Prueba gratis hasta el <strong>{dateFormat(access.trialEndsAt)}</strong>.
            </p>
          )}
          <Link href="/suscripcion" className={buttonClass("secondary", "mt-4")}>
            {access.subscriptionStatus ? "Administrar suscripción" : "Ver planes"}
          </Link>
        </Card>

        <form action={signOut}>
          <Button type="submit" variant="ghost">
            Cerrar sesión
          </Button>
        </form>
      </div>
    </>
  );
}
