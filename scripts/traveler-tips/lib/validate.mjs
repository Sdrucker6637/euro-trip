// The trust boundary between "what the LLM said" and "what actually
// becomes application data." Nothing from synthesize.mjs is written to
// data/traveler-tips.json without passing through here first.
import { CATEGORIES } from './categories.mjs';

const VALID_CATEGORIES = new Set(CATEGORIES);
const VALID_CONFIDENCE = new Set(['high', 'medium', 'low']);

// Mechanical backstop for synthesize.mjs's "would 5 recent visitors
// actually say this" bar - never fully trust a prompt to enforce this
// on its own (same reasoning as computing confidence in code instead of
// trusting the LLM). Catches the exact generic phrasings the product
// spec calls out as bad, and close variants, regardless of how the
// prompt is worded. Not exhaustive - a determined model could still
// phrase generic advice a way this doesn't catch - but it's a real
// backstop for the most common failure mode, not just relying on
// prompt wording.
const GENERIC_PHRASE_PATTERNS = [
  /\bgo(\s+there)?\s+early\b/i,
  /\barrive\s+early\b/i,
  /\bwear\s+comfortable\s+shoes\b/i,
  /\bbring\s+(plenty of\s+)?water\b/i,
  /\bstay\s+hydrated\b/i,
  /\bbook\s+(your\s+)?(tickets?\s+)?in\s+advance\b/i,
  /\buse\s+public\s+transport(ation)?\b/i,
  /\bcheck\s+the\s+official\s+website\b/i,
  /\bavoid\s+(the\s+)?crowds?\b/i,
  /\bwear\s+sunscreen\b/i,
  /\btake\s+plenty\s+of\s+photos?\b/i,
];

function isGenericPhrase(text) {
  return GENERIC_PHRASE_PATTERNS.some((re) => re.test(text));
}

// Confidence is computed HERE, deterministically, from how many
// independent evidence documents actually support a tip - never trusted
// from the LLM (see synthesize.mjs rule 9). Per TRAVELER-TIPS.md:
//   1 independent source, no official corroboration -> low (anecdotal)
//   2+ independent community sources                -> medium
//   an official source alone                         -> medium
//   an official source + 1+ community corroboration  -> high
//   3+ independent community sources                 -> high
function computeConfidence(sourceIds, evidenceById) {
  const docs = new Set();
  let hasOfficial = false;
  for (const id of sourceIds) {
    const ev = evidenceById.get(id);
    if (!ev) continue; // caller already filtered these out, but stay defensive
    docs.add(id);
    if (ev.type === 'official') hasOfficial = true;
  }
  const independentCount = docs.size;
  if (independentCount === 0) return null;
  if (hasOfficial && independentCount >= 2) return 'high';
  if (hasOfficial) return 'medium';
  if (independentCount >= 3) return 'high';
  if (independentCount === 2) return 'medium';
  return 'low';
}

function formatResearchLabel(date) {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

const MAX_TIP_LENGTH = 260;

// A plain slice(0, N) can cut a tip off mid-word ("...far more manageab")
// - seen in real output. Truncate at the last word boundary instead and
// mark it with an ellipsis so a long tip is visibly incomplete rather
// than silently garbled.
function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim()}...`;
}

// Turns raw LLM tips + this run's fetched evidence into the exact shape
// index.html's TRAVELER_TIPS[slug] already expects, or null if nothing
// survives validation. Every surviving tip's sourceIds are checked
// against the REAL evidence map this run fetched - a citation pointing
// at anything else is dropped, never trusted.
export function validateAndBuildEntry(rawTips, evidence) {
  const evidenceById = new Map(evidence.map((e) => [e.sourceId, e]));
  const usedSourceIds = new Set();
  const tips = [];

  for (const t of rawTips || []) {
    if (!t || typeof t.text !== 'string' || !t.text.trim()) continue;
    if (!VALID_CATEGORIES.has(t.category)) continue;
    if (isGenericPhrase(t.text)) continue;

    const citedIds = Array.isArray(t.sourceIds) ? t.sourceIds : [];
    const realSourceIds = citedIds.filter((id) => evidenceById.has(id));
    if (!realSourceIds.length) continue; // every cited source must exist in this run's evidence

    const confidence = computeConfidence(realSourceIds, evidenceById);
    if (!VALID_CONFIDENCE.has(confidence)) continue;

    const anecdotal = realSourceIds.length === 1 && evidenceById.get(realSourceIds[0])?.type !== 'official';

    tips.push({
      category: t.category,
      text: truncateText(t.text.trim(), MAX_TIP_LENGTH),
      confidence: anecdotal ? 'low' : confidence,
      anecdotal,
    });
    realSourceIds.forEach((id) => usedSourceIds.add(id));
  }

  if (!tips.length) return null;

  const seenUrls = new Set();
  const sources = evidence
    .filter((e) => usedSourceIds.has(e.sourceId))
    .filter((e) => {
      if (seenUrls.has(e.url)) return false;
      seenUrls.add(e.url);
      return true;
    })
    .map((e) => ({ type: e.type, label: e.label, url: e.url }));

  return {
    researchLabel: formatResearchLabel(new Date()),
    researchedAt: new Date().toISOString(),
    tips,
    sources,
  };
}
