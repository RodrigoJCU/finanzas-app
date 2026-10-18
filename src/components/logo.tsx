// Logotipo de texto en verde bosque (estilo minimalista). `compact` muestra solo la inicial.
export function Logo({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-800 text-lg font-bold text-white">M</span>
    );
  }
  return (
    <span className="text-2xl font-semibold tracking-tight text-brand-800 dark:text-brand-400">
      Mental<span className="text-brand-500">Finz</span>
    </span>
  );
}
