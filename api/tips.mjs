// GET /api/tips - returns every tip researched live (via
// /api/research-stop) since the last monthly batch run, as the exact
// same { [slug]: entry } shape as data/traveler-tips.json. The frontend
// merges this over the static baseline file - see loadTravelerTips() in
// index.html. Read-only; never triggers research itself.
import { getAllTips } from './_lib/kv-store.mjs';

export default async function handler(req, res) {
  try {
    const tips = await getAllTips();
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(tips);
  } catch (e) {
    console.error('[api/tips] failed:', e);
    res.status(200).json({}); // never break the app's tips loading over a KV hiccup
  }
}
