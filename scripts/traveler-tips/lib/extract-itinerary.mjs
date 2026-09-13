// Reads the real itinerary straight out of index.html rather than
// duplicating it here - this is the same `ITINERARY` array the app
// renders from, so a stop added/renamed in the app is automatically what
// gets researched next run, with zero second source of truth to drift.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const INDEX_HTML_PATH = path.resolve(here, '../../../index.html');

// Mirrors index.html's own slugify() exactly - this MUST stay identical
// to that function, since it's what makes a stop in the UI and an entry
// in data/traveler-tips.json refer to the same key. Strips accents
// before collapsing non-alphanumerics ("Schönbrunn Palace" ->
// "schonbrunn-palace", not "sch-nbrunn-palace") - matters for a
// multi-country European trip.
export function slugify(str) {
  return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');
}

// Finds `const ITINERARY = [ ... ];` and extracts just the array literal
// text by counting brackets, rather than a regex that could mis-match
// nested arrays/strings containing "]". Evaluated in a throwaway vm
// context (not eval() in this process) since it's a plain array of
// object literals with no function calls to worry about.
function extractItineraryArrayText(html) {
  const marker = 'const ITINERARY = [';
  const markerStart = html.indexOf(marker);
  if (markerStart === -1) throw new Error('Could not find "const ITINERARY = [" in index.html - has it been renamed?');
  const arrayStart = markerStart + marker.length - 1; // position of the opening '['
  let depth = 0;
  for (let i = arrayStart; i < html.length; i++) {
    const c = html[i];
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) return html.slice(arrayStart, i + 1);
    }
  }
  throw new Error('Could not find the matching closing "]" for ITINERARY in index.html');
}

export function loadItinerary() {
  const html = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const arrayText = extractItineraryArrayText(html);
  const context = { result: undefined };
  vm.createContext(context);
  new vm.Script(`result = ${arrayText};`).runInContext(context);
  return context.result;
}

// Flattens every day's stops into a deduped list of research-worthy
// activities: { slug, name, place, city }. Flights/trains (stops with a
// `booking` link or a `flightDate`) are skipped - they're transport
// legs, not sightseeing tips targets. A name appearing on two different
// days (not the case today, but itineraries change) is researched once.
export function extractActivities() {
  const itinerary = loadItinerary();
  const seen = new Map();
  for (const day of itinerary) {
    for (const stop of day.stops || []) {
      if (stop.booking || stop.flightDate !== undefined) continue;
      const slug = slugify(stop.name);
      if (!seen.has(slug)) {
        seen.set(slug, { slug, name: stop.name, place: stop.place || null, city: day.city });
      }
    }
  }
  return [...seen.values()];
}
