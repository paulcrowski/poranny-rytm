const CACHE_PREFIX = 'poranny-rytm-';
const CACHE = CACHE_PREFIX + 'v7';
const scope = new URL(self.registration.scope);
const shell = new URL('./', scope).href;
const files = ['./', './style.css', './app.js', './cloud.js', './cloud-config.js', './manifest.webmanifest',
  './icon.svg', './icon-192.png', './icon-512.png'];
const assets = new Set(files.slice(1).map(path => new URL(path, scope).href));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const requests = files.map(path => new Request(new URL(path, scope), {
      cache: 'reload', redirect: 'error',
    }));
    await cache.addAll(requests);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== scope.origin) return;

  if (request.mode === 'navigate' && (url.pathname === scope.pathname ||
      url.pathname === new URL('index.html', scope).pathname)) {
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match(shell)) || Response.error();
    }));
  } else if (assets.has(url.href)) {
    event.respondWith(caches.open(CACHE).then(async cache =>
      (await cache.match(request)) || fetch(request)));
  }
});
