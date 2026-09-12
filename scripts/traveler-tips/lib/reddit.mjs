// Reddit evidence via the public, keyless `search.json` endpoint. No
// OAuth app/secret needed at this volume - just a descriptive User-Agent
// (Reddit 403s the default one) and light pacing between requests, since
// this is a personal, once-a-month batch job, not a scraper.
//
// Uses old.reddit.com rather than www.reddit.com: the new site's bot
// protection has been observed 403-ing plain HTTP-client requests (Node
// fetch, curl, etc.) even with a descriptive User-Agent and even on the
// very first request of a run - i.e. not rate-limiting, since it fails
// immediately - while old.reddit.com's .json endpoints stay reachable to
// non-browser clients. Browser-like Accept/Accept-Language headers are
// added for the same reason.
const USER_AGENT = 'euro-trip-traveler-tips-research/0.1 (personal itinerary app, run manually/monthly, contact: repo owner)';
const REQUEST_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
};

// The app owner's own priority list of angles to check for every
// activity, so research is specific to THIS attraction rather than a
// single generic "<name> tips" query.
const QUERY_SUFFIXES = ['tips', 'entrance', 'tickets', 'queue', 'best time', 'mistakes', 'worth it'];

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function searchOnce(query) {
  const url = `https://old.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=relevance&limit=8&t=year`;
  const res = await fetch(url, { headers: REQUEST_HEADERS });
  if (!res.ok) throw new Error(`Reddit search returned ${res.status} for "${query}"`);
  const data = await res.json();
  return (data?.data?.children || []).map((c) => c.data).filter(Boolean);
}

async function fetchTopComments(permalink, limit) {
  try {
    const res = await fetch(`https://old.reddit.com${permalink}.json?limit=${limit}&sort=top`, {
      headers: REQUEST_HEADERS,
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.[1]?.data?.children || [])
      .map((c) => c.data)
      .filter((c) => c && c.body && c.body !== '[deleted]' && c.body !== '[removed]')
      .slice(0, limit);
  } catch {
    return [];
  }
}

// Returns a flat evidence array: { sourceId, type:'reddit', label, url, text, publishedAt }.
// Every entry here is something this run genuinely fetched - never a
// constructed-but-unverified search link.
export async function fetchRedditEvidence(activity, { maxPosts = 6, maxCommentsPerPost = 4 } = {}) {
  const seenPosts = new Map();
  for (const suffix of QUERY_SUFFIXES) {
    const query = `${activity.name} ${suffix}`;
    try {
      for (const post of await searchOnce(query)) {
        if (post.id && !seenPosts.has(post.id)) seenPosts.set(post.id, post);
      }
    } catch (e) {
      console.warn(`  [reddit] query failed: "${query}" - ${e.message}`);
    }
    await sleep(600);
  }

  const posts = [...seenPosts.values()].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, maxPosts);

  const evidence = [];
  let n = 0;
  for (const post of posts) {
    n++;
    const url = `https://www.reddit.com${post.permalink}`;
    evidence.push({
      sourceId: `reddit#${n}`,
      type: 'reddit',
      label: `r/${post.subreddit} - "${post.title}"`,
      url,
      text: [post.title, post.selftext].filter(Boolean).join('\n').slice(0, 2000),
      publishedAt: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : null,
    });

    for (const comment of await fetchTopComments(post.permalink, maxCommentsPerPost)) {
      n++;
      evidence.push({
        sourceId: `reddit#${n}`,
        type: 'reddit',
        label: `r/${post.subreddit} comment on "${post.title}"`,
        url,
        text: comment.body.slice(0, 1000),
        publishedAt: comment.created_utc ? new Date(comment.created_utc * 1000).toISOString() : null,
      });
    }
    await sleep(600);
  }
  return evidence;
}
