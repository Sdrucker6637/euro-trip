// YouTube evidence via the YouTube Data API v3 (free daily quota, API
// key only - no billing needed at this volume: ~1 search.list [100
// units] + a few commentThreads.list [1 unit each] per activity, against
// a 10,000-unit/day free quota).
//
// IMPORTANT: a video's title/description/comments are all we ever
// fetch here - never the spoken content of the video itself. The
// synthesis prompt is told this explicitly so it never claims "the
// video shows/says X" from evidence that's actually just a title.
//
// Comments are the main source of genuinely specific, firsthand
// traveler detail here (see TRAVELER-TIPS.md's "authentic voice" goal)
// - a video's own title/description is often itself generic "Top 10
// Tips" listicle framing, which is exactly what synthesize.mjs is told
// to reject. So this pulls a generous raw pool of comments per video
// (still 1 API unit regardless of how many are requested in one call)
// and filters out low-signal filler (short reactions, emoji-only
// praise) before handing the rest to the LLM - a bigger, cleaner pool
// to find real anecdotes in, not just the first 5 by relevance.
import { decodeHtmlEntities } from './decode-html-entities.mjs';

const MIN_COMMENT_LENGTH = 40;
const FILLER_COMMENT_PATTERN = /^(nice|great|love|amazing|awesome|cool|thanks|thank you|beautiful|wow|omg|subscribed?)\b[!.\s]*$/i;

function isSubstantiveComment(text) {
  const trimmed = text.trim();
  if (trimmed.length < MIN_COMMENT_LENGTH) return false;
  if (FILLER_COMMENT_PATTERN.test(trimmed)) return false;
  return true;
}

// No explicit "type" field exists on itinerary stops (adding one would
// mean a schema change to the itinerary source, not just this research
// pipeline) - classify from the name instead. Rough and heuristic, but
// good enough to pick more relevant search angles than one generic
// query for every place, per the redesign spec's "adapt research to
// the type of place" requirement.
function classifyPlaceType(name) {
  // JS regex \b is ASCII-only - "café" followed by a space has no
  // detectable word boundary after the accented "é" (it isn't \w
  // either), so \bcaf[eé]\b silently fails to match. Strip diacritics
  // first (same normalize/strip approach as index.html's slugify())
  // so accented names classify correctly.
  const n = String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/\b(cafe|restaurant|bistro|brasserie|bakery|patisserie|coffee|bar)\b/.test(n)) return 'cafe';
  // No \b before "museum" here (unlike the other checks) - German/Dutch
  // compound names (Rijksmuseum, Pergamonmuseum) have no space before
  // it, and "museum" as a substring is specific enough to not misfire.
  if (/museums?\b|\b(gallery|galleries)\b/.test(n)) return 'museum';
  if (/\b(station|gare|bahnhof|hauptbahnhof|centraal|airport)\b/.test(n)) return 'station';
  if (/\b(market|quarter|district|neighbo?rhood|old town)\b/.test(n)) return 'neighborhood';
  return 'attraction';
}

// Two query angles per type, not one generic query for everything -
// still bounded (2 search.list calls x 100 units, not proportionally
// more video/comment fetches, since results are deduped and capped
// below) to stay well inside the free daily quota across a full
// itinerary. A YouTube search alone won't rescue a place with no video
// coverage at all (a small café is unlikely to have YouTube videos
// regardless of query wording) - that's a real, honest limitation of
// this source, not something query-tuning can fix.
const QUERY_ANGLES = {
  cafe: ['review experience', 'what to order seating'],
  museum: ['tips review', 'worth it queue exhibits'],
  station: ['tips navigating', 'platforms transfer luggage'],
  neighborhood: ['guide tips', 'hidden worth it mistakes'],
  attraction: ['tips review', 'wish I knew mistakes worth it'],
};

// `activity.place` is typically "<name-ish prefix>, <actual location>"
// (e.g. "Sigmund Freud Museum, Vienna", "Zaanse Schans, Zaandam,
// Netherlands") - repeating the whole string in a query would duplicate
// the activity name. Take just the part after the first comma, which is
// often MORE precise than `city` (Zaanse Schans's day is filed under
// "Amsterdam" but the place itself is in Zaandam; Palace of Versailles's
// day is "Paris" but the place is in Versailles). Falls back to city
// when place has no comma to split on or is missing entirely.
function locationContext(activity) {
  if (activity.place) {
    const commaIdx = activity.place.indexOf(',');
    if (commaIdx !== -1) return activity.place.slice(commaIdx + 1).trim();
  }
  return activity.city || '';
}

async function searchVideos(query, apiKey, maxResults) {
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}&relevanceLanguage=en&q=${encodeURIComponent(query)}&key=${apiKey}`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) {
    console.warn(`  [youtube] search failed (${searchRes.status}) for "${query}"`);
    return [];
  }
  const searchData = await searchRes.json();
  return searchData.items || [];
}

export async function fetchYoutubeEvidence(activity, { maxVideos = 8, maxCommentsPerVideo = 15 } = {}) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn('  [youtube] YOUTUBE_API_KEY not set - skipping YouTube evidence.');
    return [];
  }

  const placeType = classifyPlaceType(activity.name);
  const angles = QUERY_ANGLES[placeType];
  // Scope every query to the actual location - the place name alone can
  // collide with a same-named place elsewhere (the Sigmund Freud Museum
  // exists in both Vienna and London). Without this, a search can
  // silently pull in evidence about the wrong physical location.
  const location = locationContext(activity);
  const queryPrefix = location ? `${activity.name} ${location}` : activity.name;
  const perQueryResults = await Promise.all(
    angles.map((angle) => searchVideos(`${queryPrefix} ${angle}`, apiKey, maxVideos))
  );

  // Fetch every video's comments in parallel (each video's fetch was
  // previously sequential, adding real latency for no benefit - now
  // matters more since /api/research-stop calls this synchronously
  // within an HTTP request). sourceIds are assigned in a final pass over
  // videos in their original order, not fetch-completion order, so they
  // stay deterministic regardless of which comment fetch finishes first.
  const seenVideoIds = new Set();
  const videos = [];
  for (const items of perQueryResults) {
    for (const item of items) {
      const videoId = item.id?.videoId;
      if (!videoId || seenVideoIds.has(videoId)) continue;
      seenVideoIds.add(videoId);
      videos.push({
        videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        title: decodeHtmlEntities(item.snippet.title || ''),
        description: decodeHtmlEntities((item.snippet.description || '').slice(0, 600)),
        publishedAt: item.snippet.publishedAt || null,
      });
      if (videos.length >= maxVideos) break;
    }
    if (videos.length >= maxVideos) break;
  }

  const commentsByVideo = await Promise.all(
    videos.map(async (v) => {
      try {
        // maxResults up to 100 costs the same 1 unit as maxResults=5 -
        // pull generously, then filter for substance client-side.
        const commentsUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${v.videoId}&order=relevance&maxResults=50&textFormat=plainText&key=${apiKey}`;
        const commentsRes = await fetch(commentsUrl);
        if (!commentsRes.ok) return []; // usually just means comments are disabled - not worth a warning
        const commentsData = await commentsRes.json();
        const kept = [];
        for (const c of commentsData.items || []) {
          if (kept.length >= maxCommentsPerVideo) break;
          const snippet = c.snippet?.topLevelComment?.snippet;
          if (!snippet?.textDisplay || !isSubstantiveComment(snippet.textDisplay)) continue;
          kept.push({ text: snippet.textDisplay.slice(0, 800), publishedAt: snippet.publishedAt || null });
        }
        return kept;
      } catch (e) {
        console.warn(`  [youtube] comments fetch failed for ${v.url} - ${e.message}`);
        return [];
      }
    })
  );

  const evidence = [];
  let n = 0;
  videos.forEach((v, i) => {
    n++;
    evidence.push({
      sourceId: `youtube#${n}`,
      type: 'youtube',
      label: `YouTube video title/description - "${v.title}"`,
      url: v.url,
      text: `TITLE: ${v.title}\nDESCRIPTION: ${v.description}`,
      publishedAt: v.publishedAt,
    });
    for (const comment of commentsByVideo[i]) {
      n++;
      evidence.push({
        sourceId: `youtube#${n}`,
        type: 'youtube',
        label: `YouTube comment on "${v.title}"`,
        url: v.url,
        text: comment.text,
        publishedAt: comment.publishedAt,
      });
    }
  });
  return evidence;
}
