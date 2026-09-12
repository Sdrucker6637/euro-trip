# Traveler Tips — data model & research pipeline

## The goal

Traveler Tips should read like real advice from people who actually
visited, not generic AI travel advice. The bar every tip has to clear:

> What would I learn if I could ask 5 people who just visited this
> place what they wish they knew beforehand?

**Good** (specific, non-obvious, could only be about THIS place):
- "Several visitors said the entrance shown by Google Maps isn't the
  entrance you actually want."
- "One traveler arrived 30 minutes before opening and still
  encountered a significant queue."
- "Multiple people felt the summit wasn't worth the additional wait
  once they'd seen the second-floor view."

**Bad** (generic - reject even if evidence technically mentions it):
"Go early to avoid crowds." "Wear comfortable shoes." "Bring water."
"Book in advance." "Use public transportation." "Check the official
website." Any advice that could apply to almost any tourist attraction.

The litmus test used throughout the prompt and validation: **if a tip
could have been written without researching this specific place, it
should not be included.**

## What's implemented

The app itself (`index.html`) is still a static, no-backend, no-build
page - that never changed. What's new is a **standalone offline batch
job**, run outside the browser, that researches real evidence and writes
the results into a static JSON file the app fetches once at load. The
UI, confidence gate, and source display built earlier are unchanged.

```
scripts/traveler-tips/
  run.mjs                    <- CLI entry point (see "Running it" below)
  lib/extract-itinerary.mjs  <- reads ITINERARY straight out of index.html
  lib/youtube.mjs            <- YouTube Data API v3 evidence (title/description/comments)
  lib/official.mjs           <- hand-verified official-site evidence
  lib/decode-html-entities.mjs <- YouTube API text comes HTML-entity-encoded
  lib/synthesize.mjs         <- one Gemini call per activity
  lib/validate.mjs           <- the trust boundary (see below)
  lib/freshness.mjs          <- per-activity TTL / staleness check
  lib/store.mjs              <- reads/writes data/traveler-tips.json
data/traveler-tips.json      <- the generated data; ships as {} until researched
.github/workflows/traveler-tips.yml  <- monthly cron + manual trigger
```

**Evidence sources are YouTube and hand-verified official sites only.**
No Reddit (API, OAuth, Arctic Shift, PullPush, or any scraper), no
Instagram (API or scraping), no proxy infrastructure - by explicit
product decision. Direct Reddit access (both Reddit's own endpoints and
third-party mirrors) turned out not to be reliable enough to build on;
see git history on this file for the full trail of what was tried.

`index.html` changed in exactly one place: `TRAVELER_TIPS` is now
populated by `loadTravelerTips()` (a `fetch('data/traveler-tips.json')`
in `init()`, wrapped in try/catch exactly like the existing
Nominatim/Overpass calls). On any failure - offline, opened via
`file://`, the file missing - it just stays `{}` and every stop renders
exactly as it always has.

### Schema (unchanged from the original proposal)

```js
// data/traveler-tips.json
{
  "eiffel-tower": {
    "researchLabel": "Sep 2026",
    "researchedAt": "2026-09-12T20:10:00.000Z",
    "tips": [
      { "category": "watchout", "text": "Several visitors said...", "confidence": "high", "anecdotal": false }
    ],
    "sources": [
      { "type": "youtube", "label": "YouTube comment on \"...\"", "url": "https://www.youtube.com/watch?v=..." }
    ]
  }
}
```

Keyed by `slugify(stop.name)` - identical to `travelerTipsKey()` in
`index.html` - so an activity researched here is exactly the activity a
stop renders tips for. No generic "Paris tips" bucket: "Eiffel Tower",
"Palace of Versailles", and "Notre-Dame" are each researched and stored
independently, using the itinerary's own `name`/`place`/`city` for the
query.

## How the pipeline works

```
extract activities from index.html's ITINERARY (dedup, skip flights/trains)
        |
filter to stale-or-new (freshness.mjs), or an explicit --only list
        |
per activity, in parallel, each independently wrapped so one failing
never blocks the others:
   YouTube Data API search (title/description) + a generous pool of
   comments per video, filtered for substance before use (see below)
   official site (only if a hand-verified URL exists for this slug)
        |
if literally zero evidence -> leave existing data untouched, move on
        |
one Gemini call, given ONLY the fetched evidence, each item
tagged with a stable sourceId (youtube#1, official#1, ...), told to
extract only tips that clear the "5 real visitors" bar above
        |
validate.mjs: drop anything whose category is invalid, whose text is
empty, whose cited sourceId isn't in this run's real evidence, or whose
text matches a known-generic phrase pattern. Confidence is computed
HERE from real source counts - never taken from the LLM.
        |
write data/traveler-tips.json incrementally (one activity at a time, so
a mid-run crash never loses already-completed activities)
```

### Why comments, not just video titles/descriptions

A video's own title/description is often itself generic "Top 10 Tips"
listicle framing - synthesizing from that alone tends to produce exactly
the generic advice the bar above rejects. Viewer comments are where
genuinely specific firsthand detail shows up ("the entrance on the map
wasn't right", "we waited 45 minutes even though we got there early").
`lib/youtube.mjs` pulls a generous raw pool of comments per video (up to
50 - costs the same 1 API unit as pulling 5), filters out low-signal
filler (very short reactions, emoji-only praise) before use, and keeps
the most substantive ~15 per video.

### Evidence -> LLM

Each fetched item becomes `{ sourceId, type, label, url, text,
publishedAt }`. The prompt (`lib/synthesize.mjs`) gets nothing but a
list of these, tagged, for one named attraction, plus the goal framing
and good/bad examples above. It is told, in order: only claim what's in
the evidence; cite the exact `sourceId`(s); never invent a source,
quote, or URL; YouTube evidence is title/description/comments only,
never "the video shows X"; attribute community-sourced tips to real
people ("Several visitors said...", "One traveler mentioned..."), state
official-site facts plainly since they aren't personal anecdotes;
prefer official over YouTube evidence on conflicts; prefer recent over
old; dedupe (multiple people saying the same specific thing is itself a
signal, so merge and cite together rather than duplicate); use only the
app's 9 category values; and never self-report a confidence level
(rule 9 - confidence is computed by code, not trusted from the model).
An empty tips array is a correct, useful answer when nothing clears the
bar - explicitly preferred over padding with generic advice.

### Anti-hallucination / anti-generic gate (`validate.mjs`)

Nothing the LLM writes reaches `data/traveler-tips.json` un-checked:

1. `category` must be one of the app's 9 known values.
2. `text` must be non-empty.
3. **`text` must not match a known-generic phrase pattern** ("go early",
   "wear comfortable shoes", "bring water", "book in advance", "use
   public transportation", "check the official website", "avoid
   crowds", and close variants) - a mechanical backstop for the "5 real
   visitors" bar, on the same "never fully trust the model" principle as
   confidence below. Not exhaustive - a model could still phrase generic
   advice a way this doesn't catch - but it catches the most common
   failure mode regardless of how the prompt is worded.
4. Every cited `sourceId` is checked against a map of this run's
   **actually-fetched** evidence - a citation pointing at anything else
   is dropped silently.
5. If a tip has zero surviving citations, it's dropped entirely.
6. **Confidence is computed, not trusted**: 1 independent
   non-official source → `low` (and `anecdotal: true`); 2+ independent
   community sources → `medium`; an official source alone → `medium`;
   an official source plus community corroboration, or 3+ independent
   community sources → `high`.
7. The final `sources[]` list is built from *only* the evidence that
   actually ended up cited by a surviving tip, deduped by URL - never
   the full fetched set, and never a constructed-but-unverified search
   link.

### Failure behavior

- YouTube fails or `YOUTUBE_API_KEY` unset → skipped, official evidence
  (if any) still used.
- No hand-verified official URL for this activity → simply no official
  evidence, never a guessed one.
- Zero evidence from every source → existing data (if any) is left
  completely untouched; a brand-new activity with no evidence just
  stays absent from the file (no placeholder, no "loading" state).
- The LLM call throws, its output isn't valid JSON, or every tip gets
  filtered out by validation (including an empty tips array because
  nothing cleared the "5 real visitors" bar) → same: existing data
  untouched, nothing overwritten.
- Every one of these is a `console.warn`/`console.error`, never a
  thrown error that kills the whole run - one bad activity never stops
  the rest of the batch.

## Running it

```bash
npm install                 # installs @google/genai + dotenv, only for this script
cp .env.example .env        # then fill in GEMINI_API_KEY and YOUTUBE_API_KEY

node scripts/traveler-tips/run.mjs                                   # whatever's stale or new
node scripts/traveler-tips/run.mjs --only=eiffel-tower,palace-of-versailles
node scripts/traveler-tips/run.mjs --force                           # ignore freshness for the selected activities
node scripts/traveler-tips/run.mjs --dry-run                         # print the result, don't write the file
```

`run.mjs` loads `.env` automatically (via `dotenv/config`) if one exists
in the repo root - it's gitignored, so a real key never gets committed.
Setting the vars directly in your shell (`export GEMINI_API_KEY=...` /
PowerShell `$env:GEMINI_API_KEY = "..."`) still works too and overrides
`.env`.

## APIs, keys, and cost

| Source | Key needed | Billing required | Notes |
|---|---|---|---|
| YouTube Data API v3 | `YOUTUBE_API_KEY` (free, from Google Cloud Console) | No, within the free daily quota | ~1 `search.list` (100 units) + up to 8 `commentThreads.list` (1 unit each, regardless of how many comments are requested per call) per activity ≈ ~108 units. A monthly run over the whole itinerary (~25 activities) is ~2,700 units against a 10,000-unit/day free quota. |
| Official sites | None | No | Plain HTTPS fetch of a small hand-verified URL list (`lib/official.mjs`). |
| Gemini API (`gemini-3.6-flash`) | `GEMINI_API_KEY` (free, from aistudio.google.com) | **No** - free tier, no card on file | Rate-limited rather than metered at this tier. At ~25 short synthesis calls/month this is comfortably inside the free daily quota - check the exact current limit shown in your AI Studio console when you create the key, since Google adjusts these over time. The exact model name in `lib/synthesize.mjs` may need bumping again later if Google retires this one too - the API's own error message names the replacement when that happens. |

No Reddit (API, OAuth, or any third-party mirror/scraper), no Instagram
(API or scraping), no proxy infrastructure, no paid search API - by
explicit product decision, not because nothing was tried. Reddit
specifically went through several attempts (Reddit's own keyless
endpoints, Reddit's OAuth API, the Arctic Shift community mirror) that
each hit real, separate blockers (bot/TLS fingerprinting, developer
registration friction, aggressive rate limiting) - concluded not
reliable enough to build on for this project.

*(An earlier version of this pipeline used the Anthropic Messages API
with Claude Haiku 4.5 - also very cheap at this volume, ~$0.10-0.20/mo,
but requires billing/a card on file with no free tier. Switched to
Gemini to avoid that requirement entirely. `lib/synthesize.mjs` is the
only file that would need to change to swap back or support both.)*

## GitHub Actions

`.github/workflows/traveler-tips.yml`: monthly cron (1st of the month)
+ manual `workflow_dispatch` with optional `only`/`force` inputs.
Requires two repo secrets - **Settings → Secrets and variables →
Actions**: `GEMINI_API_KEY`, `YOUTUBE_API_KEY`. The job commits
`data/traveler-tips.json` back to the repo only if it actually changed.
The app never depends on the workflow being present or successful - it
just reads whatever's currently in the committed JSON file.

## Freshness

`lib/freshness.mjs`: an activity is stale (needs re-research) if it's
never been researched, or if its `researchedAt` is older than **45
days** (any of its tips is in a time-sensitive category: `tickets`,
`timing`, `entrance`, `transit`, `watchout`) or **180 days** (only
evergreen categories: `photo`, `worthit`, `tip`, `nearby`). A run with
no `--only`/`--force` only touches what's actually stale or new -
"useful existing research" is never re-spent on.

## What's been tested so far

- `extractActivities()` against the real `index.html`: correctly pulls
  25 real activities, matches `eiffel-tower`/`palace-of-versailles`
  slugs exactly, correctly excludes both flight stops.
- `run.mjs --only=... --dry-run`: confirmed the full pipeline never
  crashes and never fabricates data when every network source is
  unreachable (evidence collected: 0/0 → activity left untouched).
- `index.html` regression: all 19 day cards / 27 stops / transport tab /
  packing list still render with zero JS errors, both served over HTTP
  and opened directly via `file://`.
- **Run for real with the new "5 real visitors" prompt, deeper
  comment-mining, and generic-phrase backstop** against `eiffel-tower`,
  `palace-of-versailles`, `trevi-fountain` (dry-run, not yet committed
  to `data/traveler-tips.json`). Real results: specific, correctly-
  attributed tips (Trocadéro as a viewpoint, the second-floor-to-first-
  floor elevator shortcut, a wallet stolen at Versailles, crowd levels
  at Trevi varying by weather) with no generic advice slipping through
  - the generic-phrase backstop didn't even need to fire. Caught and
  fixed one real bug this way: a tip over the length cap was truncated
  mid-word ("...far more manageab") by a plain `slice()` - fixed to
  truncate at a word boundary with an ellipsis, plus a prompt nudge to
  keep tips concise so this triggers less often.

## Personalization hook (unchanged - not built yet)

Stops still don't carry a time-of-day field, so there's nothing to key
off today. When one exists, pass it (plus the day's date/city/title)
into `researchOne()`'s evidence-fetch step as extra query context -
no schema or UI change needed for that later.
