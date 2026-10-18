import "server-only";
import { z } from "zod";

// Variables secretas: solo existen en el servidor. Cada grupo se valida la primera vez
// que se usa, así una clave faltante de una fase futura no rompe el resto de la app.
function lazy<T extends z.ZodType>(schema: T): () => z.infer<T> {
  let cached: z.infer<T> | undefined;
  return () => {
    if (cached === undefined) {
      const result = schema.safeParse(process.env);
      if (!result.success) {
        const missing = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
        throw new Error(`Variables de entorno inválidas o faltantes: ${missing}. Revisa .env.local`);
      }
      cached = result.data;
    }
    return cached;
  };
}

export const supabaseServerEnv = lazy(
  z.object({
    SUPABASE_SECRET_KEY: z.string().min(20),
  }),
);

export const emailEnv = lazy(
  z.object({
    IMAP_HOST: z.string().min(1).default("imap.gmail.com"),
    IMAP_PORT: z.coerce.number().int().positive().default(993),
    IMAP_USER: z.email(),
    IMAP_PASSWORD: z.string().transform((value) => value.replace(/\s+/g, "")).pipe(z.string().min(8)),
  }),
);

export const whatsappEnv = lazy(
  z.object({
    WHATSAPP_ACCESS_TOKEN: z.string().min(20),
    WHATSAPP_PHONE_NUMBER_ID: z.string().regex(/^\d+$/, "debe ser solo números"),
    WHATSAPP_VERIFY_TOKEN: z.string().min(1),
    WHATSAPP_APP_SECRET: z.string().min(16),
    WHATSAPP_API_VERSION: z.string().regex(/^v\d+\.\d+$/).default("v23.0"),
    // Opcional: plantilla aprobada en Meta para avisar cuando la ventana de 24h está cerrada (tiene costo).
    WHATSAPP_TEMPLATE_NEW_TRANSACTION: z.string().optional().transform((value) => value?.trim() || undefined),
    WHATSAPP_TEMPLATE_LANGUAGE: z.string().default("es"),
  }),
);

export const geminiEnv = lazy(
  z.object({
    GEMINI_API_KEY: z.string().min(20),
    GEMINI_MODEL: z.string().min(1).default("gemini-flash-latest"),
  }),
);

export const cronEnv = lazy(
  z.object({
    CRON_SECRET: z.string().min(16),
  }),
);
