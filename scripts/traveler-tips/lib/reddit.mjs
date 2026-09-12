// Reddit evidence via Reddit's OAuth API (a free, read-only "script"
// app - see TRAVELER-TIPS.md for how to create one).
//
// Reddit's public, keyless www.reddit.com/search.json and
// old.reddit.com/search.json endpoints looked promising (no key, real
// results in a browser) but both were confirmed to 403/404 reliably for
// plain HTTP-client requests (Node fetch, curl) even with a descriptive
// User-Agent and on the very first request - i.e. not rate-limiting,
// since it fails immediately. That's Reddit's anti-scraping bot
// detection fingerprinting the client, not a headers/domain problem, and
// no amount of header tweaking fixes it. OAuth against oauth.reddit.com
// is Reddit's actual supported path for exactly this kind of scripted,
// read-only access and isn't subject to that gate.
import { decodeHtmlEntities } from './decode-html-entities.mjs';

const USER_AGENT = 'euro-trip-traveler-tips-research/0.1 (personal itinerary app, run manually/monthly, contact: repo owner)';

// The app owner's own priority list of angles to check for every
// activity, so research is specific to THIS attraction rather than a
// single generic "<name> tips" query.
const QUERY_SUFFIXES = ['tips', 'entrance', 'tickets', 'queue', 'best time', 'mistakes', 'worth it'];

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

// Cached for the lifetime of this process - one token covers the whole
// run (all activities), not just one. Reddit's client_credentials tokens
// are typically valid ~1 hour, comfortably longer than a full run.
let cachedToken = null;
let cachedTokenExpiresAt = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < cachedTokenExpiresAt) return cachedToken;

  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`Reddit OAuth token request failed (${res.status})`);
  const data = await res.json();
  if (!data.access_token) throw new Error('Reddit OAuth token response had no access_token');

  cachedToken = data.access_token;
  cachedTokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000 - 30_000; // 30s safety margin
  return cachedToken;
}

async function oauthGet(path, token) {
  const res = await fetch(`https://oauth.reddit.com${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`Reddit API returned ${res.status} for ${path}`);
  return res.json();
}

async function searchOnce(query, token) {
  const data = await oauthGet(`/search.json?q=${encodeURIComponent(query)}&sort=relevance&limit=8&t=year`, token);
  return (data?.data?.children || []).map((c) => c.data).filter(Boolean);
}

async function fetchTopComments(permalink, limit, token) {
  try {
    const data = await oauthGet(`${permalink}.json?limit=${limit}&sort=top`, token);
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
  let token;
  try {
    token = await getAccessToken();
  } catch (e) {
    console.warn(`  [reddit] OAuth token fetch failed: ${e.message} - skipping Reddit evidence.`);
    return [];
  }
  if (!token) {
    console.warn('  [reddit] REDDIT_CLIENT_ID/REDDIT_CLIENT_SECRET not set - skipping Reddit evidence.');
    return [];
  }

  const seenPosts = new Map();
  for (const suffix of QUERY_SUFFIXES) {
    const query = `${activity.name} ${suffix}`;
    try {
      for (const post of await searchOnce(query, token)) {
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

    for (const comment of await fetchTopComments(post.permalink, maxCommentsPerPost, token)) {
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
    await sleep(600);
  }
  return evidence;
}
