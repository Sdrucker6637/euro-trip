# Traveler Tips — data model & research pipeline

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
  lib/reddit.mjs             <- Reddit OAuth (script app) evidence
  lib/youtube.mjs            <- YouTube Data API v3 evidence
  lib/official.mjs           <- hand-verified official-site evidence
  lib/synthesize.mjs         <- one Gemini call per activity
  lib/validate.mjs           <- the trust boundary (see below)
  lib/freshness.mjs          <- per-activity TTL / staleness check
  lib/store.mjs              <- reads/writes data/traveler-tips.json
data/traveler-tips.json      <- the generated data; ships as {} until researched
.github/workflows/traveler-tips.yml  <- monthly cron + manual trigger
```

`index.html` changed in exactly one place: `TRAVELER_TIPS` is now
populated by `loadTravelerTips()` (a `fetch('data/traveler-tips.json')`
in `init()`, wrapped in try/catch exactly like the existing
Nominatim/Overpass calls). On any failure - offline, opened via
`file://`, the file missing - it just stays `{}` and every stop renders
exactly as it always has. Verified: the app still renders all 19 day
cards and 27 stops with zero JS errors both over HTTP and opened
directly as `file://`.

### Schema (unchanged from the original proposal)

```js
// data/traveler-tips.json
{
  "eiffel-tower": {
    "researchLabel": "Sep 2026",
    "researchedAt": "2026-09-12T20:10:00.000Z",
    "tips": [
      { "category": "tickets", "text": "...", "confidence": "high", "anecdotal": false }
    ],
    "sources": [
      { "type": "reddit", "label": "r/Paris - \"...\"", "url": "https://www.reddit.com/r/paris/..." }
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
   Reddit OAuth search (7 query variants) + top comments on top posts
   YouTube Data API search + comment threads (title/description/comments only)
   official site (only if a hand-verified URL exists for this slug)
        |
if literally zero evidence -> leave existing data untouched, move on
        |
one Gemini call, given ONLY the fetched evidence, each item
tagged with a stable sourceId (reddit#1, youtube#2, official#1, ...)
        |
validate.mjs: drop anything whose category is invalid, whose text is
empty, or whose cited sourceId isn't in this run's real evidence.
Confidence is computed HERE from real source counts - never taken from
the LLM.
        |
write data/traveler-tips.json incrementally (one activity at a time, so
a mid-run crash never loses already-completed activities)
```

### Evidence -> LLM

Each fetched item becomes `{ sourceId, type, label, url, text,
publishedAt }`. The prompt (`lib/synthesize.mjs`) gets nothing but a
list of these, tagged, for one named attraction. It is told, in order:
only claim what's in the evidence; cite the exact `sourceId`(s); never
invent a source, quote, or URL; YouTube evidence is title/description/
comments only, never "the video shows X"; prefer official over
community evidence on conflicts; prefer recent over old; dedupe; use
only the app's 9 category values; and never self-report a confidence
level (rule 9 - confidence is computed by code, not trusted from the
model).

### Anti-hallucination gate (`validate.mjs`)

Nothing the LLM writes reaches `data/traveler-tips.json` un-checked:

1. `category` must be one of the app's 9 known values.
2. `text` must be non-empty.
3. Every cited `sourceId` is checked against a map of this run's
   **actually-fetched** evidence - a citation pointing at anything else
   is dropped silently.
4. If a tip has zero surviving citations, it's dropped entirely.
5. **Confidence is computed, not trusted**: 1 independent
   non-official source → `low` (and `anecdotal: true`); 2+ independent
   community sources → `medium`; an official source alone → `medium`;
   an official source plus community corroboration, or 3+ independent
   community sources → `high`.
6. The final `sources[]` list is built from *only* the evidence that
   actually ended up cited by a surviving tip, deduped by URL - never
   the full fetched set, and never a constructed-but-unverified search
   link.

### Failure behavior (verified, see "What's been tested" below)

- Reddit OAuth credentials unset, token fetch fails, or a search/comment
  call fails → warned, skipped, other sources continue.
- YouTube fails or `YOUTUBE_API_KEY` unset → skipped, other sources
  continue.
- No hand-verified official URL for this activity → simply no official
  evidence, never a guessed one.
- Zero evidence from every source → existing data (if any) is left
  completely untouched; a brand-new activity with no evidence just
  stays absent from the file (no placeholder, no "loading" state).
- The LLM call throws, or its output isn't valid JSON → same: existing
  data untouched, nothing overwritten.
- Every one of these is a `console.warn`/`console.error`, never a
  thrown error that kills the whole run - one bad activity never stops
  the rest of the batch.

## Running it

```bash
npm install                 # installs @google/genai + dotenv, only for this script
cp .env.example .env        # then fill in the values below

node scripts/traveler-tips/run.mjs                                   # whatever's stale or new
node scripts/traveler-tips/run.mjs --only=eiffel-tower,palace-of-versailles
node scripts/traveler-tips/run.mjs --force                           # ignore freshness for the selected activities
node scripts/traveler-tips/run.mjs --dry-run                         # print the result, don't write the file
```

`run.mjs` loads `.env` automatically (via `dotenv/config`) if one exists
in the repo root - it's gitignored, so a real key never gets committed.
Setting the vars directly in your shell (`export GEMINI_API_KEY=...` /
PowerShell `$env:GEMINI_API_KEY = "..."`) still works too and overrides
`.env`; either is fine, `.env` just survives across shell sessions
without re-typing.

Reddit requires a free OAuth "script" app: go to
https://www.reddit.com/prefs/apps (logged in), "create another app...",
select **script**, fill in a name and any redirect URI (unused for
script apps, e.g. `http://localhost:8080`). You'll get a client ID
(the string under the app name) and a client secret - put both in
`.env` as `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET`.

## APIs, keys, and cost

| Source | Key needed | Billing required | Notes |
|---|---|---|---|
| Reddit OAuth API | `REDDIT_CLIENT_ID` + `REDDIT_CLIENT_SECRET` (free "script" app from reddit.com/prefs/apps) | No | `www.reddit.com/search.json` and `old.reddit.com/search.json` were both tried first since they need no key - both reliably 403/404 plain HTTP-client requests (Reddit's anti-scraping bot detection fingerprinting the client, not a headers/rate-limit issue - confirmed by the exact same URL returning real results in a browser but failing from Node's fetch every time). OAuth against `oauth.reddit.com` is Reddit's actual supported path for scripted read-only access and isn't subject to that gate. |
| YouTube Data API v3 | `YOUTUBE_API_KEY` (free, from Google Cloud Console) | No, within the free daily quota | ~1 `search.list` (100 units) + a few `commentThreads.list` (1 unit each) per activity ≈ ~105 units. A monthly run over the whole itinerary (~25 activities) is ~2,600 units against a 10,000-unit/day free quota. |
| Official sites | None | No | Plain HTTPS fetch of a small hand-verified URL list (`lib/official.mjs`). |
| Gemini API (`gemini-3.6-flash`) | `GEMINI_API_KEY` (free, from aistudio.google.com) | **No** - free tier, no card on file | Rate-limited rather than metered at this tier. At ~25 short synthesis calls/month this is comfortably inside the free daily quota - check the exact current limit shown in your AI Studio console when you create the key, since Google adjusts these over time. The exact model name in `lib/synthesize.mjs` may need bumping again later if Google retires this one too - the API's own error message names the replacement when that happens. |

No paid search API, no Instagram/TripAdvisor/forum scraping (correctly
left out - no accessible free API for them; they're never listed as
sources unless something changes that).

*(An earlier version of this pipeline used the Anthropic Messages API
with Claude Haiku 4.5 - also very cheap at this volume, ~$0.10-0.20/mo,
but requires billing/a card on file with no free tier. Switched to
Gemini to avoid that requirement entirely. `lib/synthesize.mjs` is the
only file that would need to change to swap back or support both.)*

## GitHub Actions

`.github/workflows/traveler-tips.yml`: monthly cron (1st of the month)
+ manual `workflow_dispatch` with optional `only`/`force` inputs.
Requires four repo secrets - **Settings → Secrets and variables →
Actions**: `GEMINI_API_KEY`, `YOUTUBE_API_KEY`, `REDDIT_CLIENT_ID`,
`REDDIT_CLIENT_SECRET`. The job commits `data/traveler-tips.json` back
to the repo only if it actually changed. The app never depends on the
workflow being present or successful - it just reads whatever's
currently in the committed JSON file.

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
  unreachable (evidence collected: 0/0/0 → activity left untouched,
  exactly per the failure-behavior rules above).
- `index.html` regression: all 19 day cards / 27 stops / transport tab /
  packing list still render with zero JS errors, both served over HTTP
  and opened directly via `file://`.
- **Run for real** against `eiffel-tower`, `palace-of-versailles`,
  `trevi-fountain` (YouTube + official; Reddit was still on the
  now-removed keyless path at the time) - real evidence in, a real
  Gemini call, correctly-computed confidence, correctly-cited sources,
  all the way through. That output (`data/traveler-tips.json`) is
  committed and was verified rendering correctly in the actual app UI.
  Caught and fixed one real bug this way: the YouTube API returns
  titles/descriptions HTML-entity-encoded, which `index.html`'s
  `escapeHtml()` was double-encoding into visible `&amp;amp;` text -
  fixed in `lib/decode-html-entities.mjs` (also applied to Reddit's API,
  which has the same behavior).
- **Not yet run end-to-end with the new Reddit OAuth path** - that
  requires `REDDIT_CLIENT_ID`/`REDDIT_CLIENT_SECRET` from a real Reddit
  script app (see "Running it" above).

## Personalization hook (unchanged - not built yet)

Stops still don't carry a time-of-day field, so there's nothing to key
off today. When one exists, pass it (plus the day's date/city/title)
into `researchOne()`'s evidence-fetch step as extra query context -
no schema or UI change needed for that later.
