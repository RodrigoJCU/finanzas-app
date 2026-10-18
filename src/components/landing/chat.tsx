import { CheckCheck, Mic } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/components/ui";

// Burbujas estilo WhatsApp para ilustrar las funciones en la web.
export function Bubble({
  from,
  time = "9:41 a. m.",
  children,
  className,
}: {
  from: "user" | "bot";
  time?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex", from === "user" ? "justify-end" : "justify-start", className)}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-snug text-ink shadow-sm",
          from === "user" ? "rounded-br-md bg-brand-100" : "rounded-bl-md bg-white",
        )}
      >
        {children}
        <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-400">
          {time}
          {from === "user" && <CheckCheck className="h-3 w-3 text-brand-500" aria-hidden />}
        </span>
      </div>
    </div>
  );
}

export function VoiceNote({ seconds = 4 }: { seconds?: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-500 text-white">
        <Mic className="h-3.5 w-3.5" aria-hidden />
      </span>
      <span className="flex h-6 items-center gap-0.5" aria-hidden>
        {[6, 12, 18, 10, 20, 14, 8, 16, 22, 12, 7, 15, 10, 18, 9].map((height, index) => (
          <span key={index} className="w-0.5 rounded-full bg-brand-700/60" style={{ height }} />
        ))}
      </span>
      <span className="text-xs text-slate-500">0:0{seconds}</span>
    </span>
  );
}
