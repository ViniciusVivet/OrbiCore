"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "18px",
          padding: "24px",
          textAlign: "center",
          background:
            "radial-gradient(120% 90% at 50% -10%, #12233a 0%, transparent 60%), #0a0f1b",
          color: "#eef2f6",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(46,212,219,0.12)",
            border: "1px solid rgba(46,212,219,0.3)",
          }}
        >
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#2ed4db" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z" />
            <path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z" />
          </svg>
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>Algo saiu de órbita</h1>
          <p style={{ color: "#95a1b0", fontSize: 14, margin: 0, maxWidth: 340 }}>
            Tivemos um erro inesperado. Seus dados estão seguros — tente de novo.
          </p>
        </div>
        <button
          onClick={() => reset()}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            border: 0,
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 14,
            background: "#2ed4db",
            color: "#0a0f1b",
          }}
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
