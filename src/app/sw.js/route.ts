// Service worker servido como rota para carimbar a VERSÃO do deploy.
// Cada deploy muda o conteúdo do SW → o navegador detecta atualização →
// assume o controle → as abas abertas recarregam sozinhas (ver pwa-manager).
const VERSION =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.VERCEL_DEPLOYMENT_ID ??
  "dev";

const SW = `// OrbiCore Service Worker (versão: ${VERSION})
const CACHE = "orbicore-shell-${VERSION}";
const OFFLINE_ASSETS = ["/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(OFFLINE_ASSETS)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (OFFLINE_ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/dashboard")))
    );
  }
});
`;

export const dynamic = "force-static";

export function GET() {
  return new Response(SW, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      // O navegador precisa sempre revalidar o SW para enxergar novas versões.
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
