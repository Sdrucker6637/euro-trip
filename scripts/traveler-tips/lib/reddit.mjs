// Reddit evidence via Arctic Shift (arctic-shift.photon-reddit.com), a
// free, keyless, community-run mirror of Reddit's public post/comment
// data - the de facto successor to Pushshift (which Reddit cut off
// third-party access to in 2023). No registration, no client
// ID/secret, no login.
//
// Why not Reddit's own endpoints: www.reddit.com/search.json and
// old.reddit.com/search.json both reliably 403/404 plain HTTP-client
// requests (confirmed: the exact same URL returns real results in a
// browser but fails identically from Node fetch every time) - Reddit's
// anti-scraping bot/TLS fingerprinting, not a headers or rate-limit
// issue. Reddit's own OAuth API is the *sanctioned* fix for that, but
// requires registering a developer app and accepting Reddit's Developer
// Terms/Data API Terms, which turned out to be real friction for a
// personal project. Arctic Shift sidesteps both problems - no bot gate,
// no registration - at the cost of being an unofficial, volunteer-run
// service rather than something Reddit guarantees: it could rate-limit
// unpredictably or go offline. That's fine here because every source in
// this pipeline is already optional and fails gracefully (see run.mjs)
// - if Arctic Shift is ever down, YouTube + official evidence still
// flows and nothing gets overwritten with emptiness.
import { decodeHtmlEntities } from './decode-html-entities.mjs';

const BASE_URL = 'https://arctic-shift.photon-reddit.com';
const USER_AGENT = 'euro-trip-traveler-tips-research/0.1 (personal itinerary app, run manually/monthly, contact: repo owner)';

// The app owner's own priority list of angles to check for every
// activity, so research is specific to THIS attraction rather than a
// single generic "<name> tips" query.
const QUERY_SUFFIXES = ['tips', 'entrance', 'tickets', 'queue', 'best time', 'mistakes', 'worth it'];

// Arctic Shift's `query` (cross-subreddit keyword search) errors with
// "requires one of: author, subreddit" - there's no true global search,
// and `subreddit` only accepts one value per request (no comma-
// separated list, unlike some other Arctic Shift endpoints). So instead
// of one sitewide search, this runs the same query scoped to each of a
// small, hand-picked set of general travel subreddits - the same
// "curated, never guessed" approach as OFFICIAL_SITES in official.mjs.
// This will miss posts in a landmark-specific subreddit not in this
// list (e.g. r/ParisTravelGuide) - a real recall tradeoff for staying
// generic across every activity in the itinerary rather than
// hand-maintaining a per-activity subreddit list.
//
// Deliberately small, lower-traffic subreddits, not r/travel or
// r/solotravel (millions of subscribers each) - Arctic Shift's docs
// warn keyword search is "not supported with very active users or
// subreddits". In practice the real cause of the 422 "Timeout. Maybe
// slow down a bit" responses turned out to be request rate, not
// subreddit size (even these smaller subreddits 422'd on every request
// after the very first - see REQUEST_DELAY_MS below), but there's no
// downside to keeping the lighter-weight subreddits anyway.
const SUBREDDITS = ['EuroTrip', 'shoestring', 'TravelHacks'];

// Arctic Shift is free and volunteer-run - the first request in a run
// succeeds, then every subsequent request 422s with "Timeout. Maybe
// slow down a bit" at the original 600ms pacing. This is a soft rate
// limit, not a query-complexity timeout. A slower pace plus one retry
// on a 422 keeps the run reliable at the cost of being noticeably
// slower - fine for a once-a-month batch job.
const REQUEST_DELAY_MS = 3000;

// Narrows the search window, which both biases toward current
// information and reduces the odds of a timeout on a large index scan.
function twoYearsAgoDateString() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 2);
  return d.toISOString().slice(0, 10);
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

// Arctic Shift's exact response shape (bare array vs. {data:[...]}) isn't
// documented anywhere public - handle both defensively rather than
// assume.
function extractResults(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  return [];
}

async function searchPosts(query, subreddit) {
  const url = `${BASE_URL}/api/posts/search?query=${encodeURIComponent(query)}&subreddit=${encodeURIComponent(subreddit)}&after=${twoYearsAgoDateString()}&sort=desc&limit=10`;

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (res.ok) return extractResults(await res.json());

    const body = await res.text().catch(() => '');
    if (res.status === 422 && attempt === 0) {
      // Soft rate limit ("Timeout. Maybe slow down a bit") - back off
      // harder and try once more before giving up on this query.
      await sleep(REQUEST_DELAY_MS * 2);
      continue;
    }
    throw new Error(`Arctic Shift posts search returned ${res.status} for "${query}" in r/${subreddit} - ${body.slice(0, 300)}`);
  }
}

async function fetchCommentsForPost(postId, limit) {
  try {
    const linkId = postId.startsWith('t3_') ? postId : `t3_${postId}`;
    const url = `${BASE_URL}/api/comments/search?link_id=${linkId}&sort=desc&limit=50`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) return [];
    const comments = extractResults(await res.json());
    return comments
      .filter((c) => c && c.body && c.body !== '[deleted]' && c.body !== '[removed]')
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, limit);
  } catch {
    return [];
  }
}

function postUrl(post) {
  if (post.permalink) return `https://www.reddit.com${post.permalink}`;
  return `https://www.reddit.com/r/${post.subreddit}/comments/${post.id}/`;
}

// Returns a flat evidence array: { sourceId, type:'reddit', label, url, text, publishedAt }.
// Every entry here is something this run genuinely fetched - never a
// constructed-but-unverified search link.
export async function fetchRedditEvidence(activity, { maxPosts = 6, maxCommentsPerPost = 4 } = {}) {
  const seenPosts = new Map();
  for (const subreddit of SUBREDDITS) {
    for (const suffix of QUERY_SUFFIXES) {
      const query = `${activity.name} ${suffix}`;
      try {
        for (const post of await searchPosts(query, subreddit)) {
          if (post.id && !seenPosts.has(post.id)) seenPosts.set(post.id, post);
        }
      } catch (e) {
        console.warn(`  [reddit] query failed: "${query}" in r/${subreddit} - ${e.message}`);
      }
      await sleep(REQUEST_DELAY_MS);
    }
  }

  const posts = [...seenPosts.values()].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, maxPosts);

  const evidence = [];
  let n = 0;
  for (const post of posts) {
    n++;
    const url = postUrl(post);
    const title = decodeHtmlEntities(post.title);
    const selftext = decodeHtmlEntities(post.selftext);
    evidence.push({
      sourceId: `reddit#${n}`,
      type: 'reddit',
      label: `r/${post.subreddit} - "${title}"`,
      url,
      text: [title, selftext].filter(Boolean).join('\n').slice(0, 2000),
      publishedAt: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : null,
    });

    for (const comment of await fetchCommentsForPost(post.id, maxCommentsPerPost)) {
      n++;
      evidence.push({
        sourceId: `reddit#${n}`,
        type: 'reddit',
        label: `r/${post.subreddit} comment on "${title}"`,
        url,
        text: decodeHtmlEntities(comment.body).slice(0, 1000),
        publishedAt: comment.created_utc ? new Date(comment.created_utc * 1000).toISOString() : null,
      });
    }
    await sleep(REQUEST_DELAY_MS);
  }
  return evidence;
}
