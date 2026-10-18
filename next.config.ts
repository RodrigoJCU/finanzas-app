import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Librerías de correo que deben ejecutarse tal cual en Node.js (no se empaquetan).
  serverExternalPackages: ["imapflow", "mailparser"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
