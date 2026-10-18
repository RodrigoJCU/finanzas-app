// Genera el SQL que programa en Supabase la revisión del correo cada minuto (gratis, con pg_cron).
// Uso: npm run cron:sql -- https://tu-app.vercel.app
// Crea el archivo supabase/cron.generated.sql (contiene tu CRON_SECRET: no lo subas a GitHub).
import { writeFileSync } from "node:fs";

const appUrl = (process.argv[2] ?? process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/$/, "");
const secret = process.env.CRON_SECRET?.trim();

if (!/^https:\/\//.test(appUrl)) {
  console.log("\n❌ Necesito la URL pública de tu app en Vercel (https://...).");
  console.log("   Uso: npm run cron:sql -- https://tu-app.vercel.app\n");
  process.exit(1);
}
if (!secret || secret.length < 16) {
  console.log("\n❌ CRON_SECRET está vacío o es muy corto en .env.local\n");
  process.exit(1);
}

const quote = (value) => `'${value.replace(/'/g, "''")}'`;
const endpoint = `${appUrl}/api/cron/email`;

const sql = `-- Generado por "npm run cron:sql". Pégalo en Supabase > SQL Editor > Run.
-- Revisa el buzón de correo cada minuto llamando a ${endpoint}

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'finanzas-revisar-correo',
  '* * * * *',
  $cron$
  select net.http_post(
    url := ${quote(endpoint)},
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', ${quote(`Bearer ${secret}`)}
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cron$
);

-- Limpieza semanal del historial de ejecuciones (para no llenar la base de datos gratuita).
select cron.schedule(
  'finanzas-limpiar-historial-cron',
  '0 4 * * 0',
  $cron$
  delete from cron.job_run_details where end_time < now() - interval '7 days';
  delete from net._http_response where created < now() - interval '1 day';
  $cron$
);

-- Para comprobar que funciona (después de 2 minutos), ejecuta:
--   select status_code, content::text, created from net._http_response order by created desc limit 5;
`;

writeFileSync("supabase/cron.generated.sql", sql);
console.log(`
✅ Archivo creado: supabase/cron.generated.sql
   Ábrelo, copia TODO su contenido y pégalo en Supabase > SQL Editor > Run.
   Llamará a: ${endpoint} cada minuto.
`);
