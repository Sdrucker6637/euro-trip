# Traveler Tips — data model & research-backend proposal

## What's implemented now (this app, today)

`index.html` is a static, no-backend, no-build page. All state lives in
`localStorage` on one device. There is nowhere to hold an API secret and
nothing that runs on a schedule - so this change adds only what a static
page can honestly do:

- **`TRAVELER_TIPS`** (in `index.html`, just above `renderItinerary`): a
  plain object keyed by `slugify(stop.name)` (e.g. `'eiffel-tower'`),
  holding whatever a research pass has already produced for that exact
  activity. **It ships empty.** No tip, source, or confidence level in it
  is invented - an empty entry means that activity has no researched tips
  yet, and its stop renders exactly as before (no section, no
  placeholder, no "loading").
- **`tipsBlockHtml(stop, key)`**: renders a collapsed-by-default "💡
  TRAVELER TIPS" toggle under a stop's description, but only if
  `TRAVELER_TIPS[slugify(stop.name)]` exists and has at least one tip
  that survives the confidence gate. Expanding it shows short bullet
  tips (category icon + one sentence), a freshness line ("Updated Sep
  2026"), and a nested "Sources (N)" toggle listing where each tip came
  from.
- **Confidence gate** (`visibleTips`): a tip needs `confidence: 'high'`
  or `'medium'` to show plainly. `confidence: 'low'` only shows if
  explicitly marked `anecdotal: true`, and stays visibly labeled "one
  traveler's account" - never presented as settled fact.

### Schema

```js
TRAVELER_TIPS['eiffel-tower'] = {
  researchLabel: 'Sep 2026',            // freshness label shown in the UI
  tips: [
    { category: 'tickets',              // tickets|timing|entrance|photo|
                                         // transit|watchout|nearby|worthit|tip
      text: 'Short, specific, actionable sentence.',
      confidence: 'high',               // high|medium|low
      anecdotal: false },               // true only for a single-source claim
    // ...
  ],
  sources: [
    { type: 'reddit',                   // reddit|instagram|youtube|forum|
                                         // blog|official|web
      label: 'r/Paris - search: Eiffel Tower tips',
      url: 'https://www.reddit.com/r/paris/search/?q=eiffel%20tower' },
    // ...
  ]
};
```

Keyed by activity name (not city) so "Eiffel Tower", "Versailles", and
"Notre-Dame" each get their own entry - never a shared, generic "Paris
tips" bucket.

## Why there's no live research wired up

Doing this for real means, per source:

| Source | Free tier reality | Notes |
|---|---|---|
| **Reddit** | Free, low-volume search via a registered "installed app" OAuth client (no secret needed) or the public `.../search.json` endpoint with a proper User-Agent. Rate-limited; fine for periodic batch research, not for a live per-pageview call. | Best source for genuine traveler experience per your priority order. |
| **YouTube** | YouTube Data API v3 has a free daily quota (API key, no billing needed at this volume). Search + video metadata/description is cheap; pulling comment threads costs more quota per video. | Good for corroborating what Reddit surfaces. |
| **Instagram** | No usable free API for arbitrary hashtag/location search. Meta's Graph API needs app review for that kind of access. | Realistically: link out to a location/hashtag search page as a "source," don't attempt to scrape content - scraping Instagram also violates its ToS. |
| **Travel forums** (TripAdvisor, Lonely Planet, Rick Steves) | No official API. | Same treatment as Instagram - link out, don't scrape. |
| **Blogs / general web** | No free API for arbitrary search at any real quality. A web-search API (e.g. Brave Search's free tier, or Bing/SerpAPI, paid) would be the realistic option. | Lowest priority per your ranking anyway. |
| **Official attraction sites** | Free - direct fetch for factual verification (hours, ticket policy, closures). | Should always win over an old Reddit post on time-sensitive facts. |

None of that can run **in the browser**: Reddit/YouTube either block
CORS for this kind of use or require a header/key that can't sit in
client-side JS without being public to anyone who opens dev tools. And
even with the raw snippets in hand, turning them into the concise,
confidence-scored bullets in the spec needs an LLM synthesis pass -
another thing that needs a place to hold a key and a way to control cost.

## Proposed backend (when you're ready to wire it up)

A small, **offline batch job**, not a live endpoint the page calls on
every visit:

1. **Trigger**: run manually, or on a schedule (e.g. a GitHub Action
   once a month, or whenever you add a new itinerary stop) - not on
   page load. This is what keeps cost near zero and avoids hammering
   Reddit/YouTube.
2. **Per activity** (keyed the same way as `TRAVELER_TIPS`, using the
   stop's `name` + `place` for the query): fetch a handful of Reddit
   search results and YouTube search results for that exact place name.
   Optionally fetch the official site for hours/ticket/closure facts.
3. **Synthesis**: one LLM call (Claude Haiku is cheap enough here - a
   few dollars a year even researching every stop monthly) per activity,
   given only the raw fetched snippets, instructed to:
   - Only output a tip if it's traceable to a specific fetched snippet
     (never invent one).
   - Tag `confidence` mechanically from how many independent snippets
     support the same claim (1 source → `low`; 2+ independent sources →
     `medium`/`high`).
   - Prefer the official-site snippet over an old forum post whenever
     they conflict on a time-sensitive fact (hours, reservations,
     construction, entrances).
   - Emit the same JSON shape as `TRAVELER_TIPS[key]` above, including
     real source URLs (never a fabricated post/quote).
4. **Freshness**: stamp `researchLabel`/an internal `updatedAt`. Give
   time-sensitive categories (`tickets`, `entrance`, `timing`, `transit`,
   `watchout`) a shorter re-check interval (e.g. 30-60 days) than
   evergreen ones (`photo`, `worthit`, `tip`, `nearby`) which can go
   longer (e.g. 6+ months) without re-fetching.
5. **Storage / delivery**: the cheapest option that fits this app's
   existing architecture is to have the job write straight back into
   `TRAVELER_TIPS` (or a sibling `traveler-tips.json` the page fetches
   once per load) and commit that - zero hosting cost, and the page
   keeps working fully offline exactly as it does today. A real
   database + API endpoint is only worth it later if you want tips to
   update without a redeploy.
6. **Anti-hallucination guardrail**: a tip with no matching source
   snippet is dropped by the synthesis step, not softened into a vaguer
   claim. A source entry is always a URL the job actually fetched -
   never typed by hand to "look right."

## Personalization hook (not built yet, but the shape supports it)

Stops don't currently carry a time-of-day field, so there's nothing to
key off today. When one exists, pass it (plus the day's date/city/title)
into the same per-activity research call as extra context - e.g. an
evening Eiffel Tower visit could get a `tickets`/`timing` tip about
sunset-slot demand surfaced ahead of a `photo` tip about morning light.
No UI or data-model rework needed for that later - just a richer context
object into the same batch job.
