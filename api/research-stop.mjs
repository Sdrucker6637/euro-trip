// POST /api/research-stop { name, place?, city? } - the live counterpart
// to scripts/traveler-tips/run.mjs, triggered when the app adds a stop
// that has no tips yet (see index.html's maybeResearchNewStop()). Same
// evidence -> Gemini -> validate pipeline as the offline monthly batch
// job, reusing the exact same library code - the only real difference is
// where the result is persisted (Vercel KV here, since a serverless
// function's filesystem can't durably hold a write; the committed
// data/traveler-tips.json file there).
//
// Same "never fabricate, never overwrite good data with emptiness"
// invariant as run.mjs: any failure below returns whatever's already in
// KV for this slug (possibly nothing) rather than an error that would
// make the UI look broken.
//
// Abuse note: this endpoint spends real (if free-tier) YouTube/Gemini
// quota per call. It's deliberately lightweight, not authenticated -
// this is a personal single-user itinerary app with no billing enabled
// anywhere in the chain, so the worst case of someone finding this URL
// and hammering it is a wasted free quota for the day, not a cost risk.
import { slugify } from '../scripts/traveler-tips/lib/extract-itinerary.mjs';
import { fetchYoutubeEvidence } from '../scripts/traveler-tips/lib/youtube.mjs';
import { fetchOfficialEvidence } from '../scripts/traveler-tips/lib/official.mjs';
import { synthesizeTips } from '../scripts/traveler-tips/lib/synthesize.mjs';
import { validateAndBuildEntry } from '../scripts/traveler-tips/lib/validate.mjs';
import { isStale } from '../scripts/traveler-tips/lib/freshness.mjs';
import { getTip, setTip } from './_lib/kv-store.mjs';

// YouTube search + parallel comment fetches + one Gemini call, all
// inside a single request, can run past Vercel's short default function
// duration - raise it explicitly rather than risk a timeout mid-research.
export const config = { maxDuration: 60 };

// Vercel's Node.js runtime normally auto-parses a JSON request body into
// req.body, but that's not guaranteed for every runtime/module
// combination - read the raw stream ourselves as a fallback rather than
// assume.
async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    res.status(400).json({ error: 'invalid JSON body' });
    return;
  }
  const { name, place, city } = body || {};
  if (typeof name !== 'string' || !name.trim() || name.length > 120) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const activity = { slug: slugify(name), name: name.trim(), place: place || null, city: city || null };

  let existing = null;
  try {
    existing = await getTip(activity.slug);
  } catch (e) {
    console.warn('[research-stop] KV read failed:', e.message);
  }
  if (existing && !isStale(existing)) {
    res.status(200).json({ slug: activity.slug, entry: existing });
    return;
  }

  const [youtube, official] = await Promise.all([
    fetchYoutubeEvidence(activity).catch((e) => { console.warn('[research-stop] youtube failed:', e.message); return []; }),
    fetchOfficialEvidence(activity).catch((e) => { console.warn('[research-stop] official failed:', e.message); return []; }),
  ]);
  const evidence = [...youtube, ...official];

  if (!evidence.length) {
    res.status(200).json({ slug: activity.slug, entry: existing });
    return;
  }

  let synth;
  try {
    synth = await synthesizeTips(activity, evidence);
  } catch (e) {
    console.warn('[research-stop] synthesize failed:', e.message);
    res.status(200).json({ slug: activity.slug, entry: existing });
    return;
  }

  const entry = validateAndBuildEntry(synth.tips, evidence);
  if (!entry) {
    res.status(200).json({ slug: activity.slug, entry: existing });
    return;
  }

  try {
    await setTip(activity.slug, entry);
  } catch (e) {
    console.warn('[research-stop] KV write failed:', e.message);
  }
  res.status(200).json({ slug: activity.slug, entry });
}
