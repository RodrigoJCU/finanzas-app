import { brandIcon } from "@/lib/brand-icon";

const ICONS: Record<string, { size: number; maskable: boolean }> = {
  "icon-192.png": { size: 192, maskable: false },
  "icon-512.png": { size: 512, maskable: false },
  "maskable-512.png": { size: 512, maskable: true },
};

export function generateStaticParams() {
  return Object.keys(ICONS).map((name) => ({ name }));
}

export async function GET(_: Request, { params }: RouteContext<"/icons/[name]">) {
  const { name } = await params;
  const icon = ICONS[name];
  if (!icon) return new Response("Not found", { status: 404 });
  return brandIcon(icon.size, { maskable: icon.maskable });
}
