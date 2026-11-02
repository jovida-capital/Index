// Service worker du portail : permet de l'ouvrir sans réseau.
// Chaque application garde son propre fonctionnement.
const CACHE_VERSION = 'jovida-v4';

const COQUILLE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  '/FinVault/icon-192.png',
  '/Maillage/icon-192.png',
  './icon-emploi-domicile.png'
];

self.addEventListener('install', (e)=>{
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(c => Promise.allSettled(COQUILLE.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(
    caches.keys()
      .then(noms => Promise.all(noms.filter(n => n !== CACHE_VERSION).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Page et manifeste : toujours revalidés auprès du serveur, le cache ne sert
// qu'hors ligne. Sinon les mises à jour n'arriveraient jamais.
function reseauDabord(req, cle){
  return fetch(new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' }))
    .then(rep => {
      if(rep && rep.ok){ const c = rep.clone(); caches.open(CACHE_VERSION).then(x => x.put(cle || req, c)); }
      return rep;
    })
    .catch(() => caches.match(cle || req).then(r => r || caches.match('./')));
}

self.addEventListener('fetch', (e)=>{
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;

  if(req.mode === 'navigate'){ e.respondWith(reseauDabord(req, './index.html')); return; }
  if(url.pathname.endsWith('.webmanifest')){ e.respondWith(reseauDabord(req)); return; }

  // Icônes : cache d'abord.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(rep => {
      if(rep && rep.status === 200){ const c = rep.clone(); caches.open(CACHE_VERSION).then(x => x.put(req, c)); }
      return rep;
    }).catch(() => new Response('', { status: 504, statusText: 'Hors ligne' })))
  );
});
