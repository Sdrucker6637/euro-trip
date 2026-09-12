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

export async function fetchYoutubeEvidence(activity, { maxVideos = 8, maxCommentsPerVideo = 15 } = {}) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn('  [youtube] YOUTUBE_API_KEY not set - skipping YouTube evidence.');
    return [];
  }

  const q = `${activity.name} tips review`;
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxVideos}&relevanceLanguage=en&q=${encodeURIComponent(q)}&key=${apiKey}`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) {
    console.warn(`  [youtube] search failed (${searchRes.status}) for "${q}"`);
    return [];
  }
  const searchData = await searchRes.json();

  const evidence = [];
  let n = 0;
  for (const item of searchData.items || []) {
    const videoId = item.id?.videoId;
    if (!videoId) continue;
    n++;
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const title = decodeHtmlEntities(item.snippet.title || '');
    const description = decodeHtmlEntities((item.snippet.description || '').slice(0, 600));
    evidence.push({
      sourceId: `youtube#${n}`,
      type: 'youtube',
      label: `YouTube video title/description - "${title}"`,
      url,
      text: `TITLE: ${title}\nDESCRIPTION: ${description}`,
      publishedAt: item.snippet.publishedAt || null,
    });

    try {
      // maxResults up to 100 costs the same 1 unit as maxResults=5 - pull
      // generously, then filter for substance client-side.
      const commentsUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&order=relevance&maxResults=50&textFormat=plainText&key=${apiKey}`;
      const commentsRes = await fetch(commentsUrl);
      if (commentsRes.ok) {
        const commentsData = await commentsRes.json();
        let kept = 0;
        for (const c of commentsData.items || []) {
          if (kept >= maxCommentsPerVideo) break;
          const snippet = c.snippet?.topLevelComment?.snippet;
          if (!snippet?.textDisplay || !isSubstantiveComment(snippet.textDisplay)) continue;
          n++;
          kept++;
          evidence.push({
            sourceId: `youtube#${n}`,
            type: 'youtube',
            label: `YouTube comment on "${title}"`,
            url,
            text: snippet.textDisplay.slice(0, 800),
            publishedAt: snippet.publishedAt || null,
          });
        }
      }
      // A non-ok response here usually just means comments are disabled
      // for this video - not worth surfacing as a warning.
    } catch (e) {
      console.warn(`  [youtube] comments fetch failed for ${url} - ${e.message}`);
    }
  }
  return evidence;
}
