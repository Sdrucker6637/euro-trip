// Europe Planner service worker.
//
// Why this exists: the site is added to the iPhone Home Screen as a
// standalone web app. Without a service worker, the standalone shell iOS
// uses for a Home Screen icon can keep showing a previously loaded copy
// of index.html indefinitely - it doesn't reliably re-fetch on every open
// the way a normal Safari tab does, and the user shouldn't have to delete
// and re-add the icon after every deploy to see a new version.
//
// Once this service worker is controlling the page, every top-level
// navigation (including relaunching the Home Screen icon) goes through
// the network-first strategy below instead: try the network first, and
// only fall back to the last cached copy when there's no connectivity.
// That's what actually forces a fresh check on every open when online,
// while still keeping the app usable offline (this trip's itinerary,
// transport and packing list are all static content baked into
// index.html itself, so having that one file cached is enough to keep
// the app's core content working with no network at all).
//
// CACHE_NAME only needs to change if this caching *strategy* itself
// changes (e.g. deciding to precache more files) - it is NOT a per-
// deploy version to remember to bump by hand. A normal content deploy
// (a new index.html) is picked up automatically by the fetch handler
// below with no manual step and no separate build/versioning tool.
const CACHE_NAME = 'europe-planner-shell-v1';
const SHELL_URL = './index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.add(SHELL_URL))
      // Take over immediately instead of waiting for every open tab/Home
      // Screen instance of this app to fully close first - a Home Screen
      // app is rarely "closed" in that sense, so waiting could mean this
      // service worker (and therefore any future update) never activates.
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      ))
      // Start controlling the already-open Home Screen instance right
      // away, instead of only on its next full reload.
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only the top-level HTML document is handled here. Everything else -
  // the Google Fonts stylesheet/files, Nominatim/Overpass lookups, the
  // transit sites, the shortcuts:// links - passes straight through
  // untouched. This service worker's only job is keeping index.html
  // fresh; it never intercepts anything cross-origin or non-navigational.
  if (request.method !== 'GET' || request.mode !== 'navigate') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // The response handed to the page and the copy written to the cache are
  // deliberately two independent fetches rather than one response.clone()
  // teed into both - tying the cache write to the same Response the page
  // is still reading can stall delivery of the page's own copy until the
  // cache write finishes (a real, reproducible hang, not just a theory).
  // One extra small request for this single HTML file is a trivial cost
  // next to guaranteeing the page itself never waits on it.
  event.respondWith(
    fetch(request).catch(() => caches.match(request).then((cached) => cached || caches.match(SHELL_URL)))
  );
  event.waitUntil(
    fetch(request)
      .then((response) => caches.open(CACHE_NAME).then((cache) => cache.put(request, response)))
      .catch(() => {})
  );
});
