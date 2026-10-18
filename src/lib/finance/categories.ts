import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables, TransactionType } from "@/types/database";

export async function getUserCategories(userId: string): Promise<Tables<"categories">[]> {
  const { data, error } = await createAdminClient()
    .from("categories")
    .select("*")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("name");
  if (error) throw new Error(`No se pudieron leer las categorías: ${error.message}`);
  return data;
}

// Las categorías más usadas por el usuario en los últimos 90 días (para la lista rápida de WhatsApp).
export async function getQuickCategories(
  userId: string,
  kind: TransactionType,
  limit: number,
): Promise<Tables<"categories">[]> {
  const categories = (await getUserCategories(userId)).filter((category) => category.kind === kind);
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await createAdminClient()
    .from("transactions")
    .select("category_id")
    .eq("user_id", userId)
    .eq("type", kind)
    .not("category_id", "is", null)
    .gte("occurred_at", since)
    .limit(1000);

  const usage = new Map<string, number>();
  for (const row of data ?? []) {
    if (row.category_id) usage.set(row.category_id, (usage.get(row.category_id) ?? 0) + 1);
  }

  // "Otros" siempre aparece, al final, sin quitarle lugar a las más usadas.
  const isOther = (category: Tables<"categories">) => /^otros?\b/i.test(category.name);
  const other = categories.find(isOther);
  const ranked = categories
    .filter((category) => !isOther(category))
    .sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0) || a.name.localeCompare(b.name, "es"));
  return other ? [...ranked.slice(0, limit - 1), other] : ranked.slice(0, limit);
}

export const categoryLabel = (category: Pick<Tables<"categories">, "name" | "emoji">) =>
  category.emoji ? `${category.emoji} ${category.name}` : category.name;
