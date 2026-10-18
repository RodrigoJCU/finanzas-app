import type { Metadata, Viewport } from "next";
import { Caveat, Figtree } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "MentalFinz — Tus finanzas en piloto automático",
    template: "%s · MentalFinz",
  },
  description:
    "Tus gastos se registran solos desde los correos de tu banco y los categorizas por WhatsApp con un mensaje o un audio.",
  applicationName: "MentalFinz",
  appleWebApp: { capable: true, title: "MentalFinz", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${figtree.variable} ${caveat.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
