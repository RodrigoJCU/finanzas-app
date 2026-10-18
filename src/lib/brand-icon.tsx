import { ImageResponse } from "next/og";

// Ícono de la app generado en código (no hace falta subir imágenes).
export function brandIcon(size: number, { maskable = false }: { maskable?: boolean } = {}) {
  const inner = maskable ? size * 0.62 : size;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: maskable ? "#059669" : "transparent",
        }}
      >
        <div
          style={{
            width: inner,
            height: inner,
            borderRadius: maskable ? 0 : size * 0.22,
            background: "#059669",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: inner * 0.62,
            fontWeight: 800,
            fontFamily: "sans-serif",
          }}
        >
          M
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
