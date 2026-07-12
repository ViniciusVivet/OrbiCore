"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
        <h1 className="text-6xl font-bold mb-4">500</h1>
        <p className="text-lg text-gray-400 mb-6">Algo deu errado</p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 rounded-lg bg-white text-black font-medium hover:opacity-90 transition-opacity"
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
