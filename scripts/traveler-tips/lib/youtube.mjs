// YouTube evidence via the YouTube Data API v3 (free daily quota, API
// key only - no billing needed at this volume: ~1 search.list [100
// units] + a few commentThreads.list [1 unit each] per activity, against
// a 10,000-unit/day free quota).
//
// IMPORTANT: a video's title/description/comments are all we ever
// fetch here - never the spoken content of the video itself. The
// synthesis prompt is told this explicitly so it never claims "the
// video shows/says X" from evidence that's actually just a title.
export async function fetchYoutubeEvidence(activity, { maxVideos = 5, maxCommentsPerVideo = 5 } = {}) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn('  [youtube] YOUTUBE_API_KEY not set - skipping YouTube evidence.');
    return [];
  }

  const q = `${activity.name} tips`;
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
    evidence.push({
      sourceId: `youtube#${n}`,
      type: 'youtube',
      label: `YouTube video title/description - "${item.snippet.title}"`,
      url,
      text: `TITLE: ${item.snippet.title}\nDESCRIPTION: ${(item.snippet.description || '').slice(0, 600)}`,
      publishedAt: item.snippet.publishedAt || null,
    });

    try {
      const commentsUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&order=relevance&maxResults=${maxCommentsPerVideo}&textFormat=plainText&key=${apiKey}`;
      const commentsRes = await fetch(commentsUrl);
      if (commentsRes.ok) {
        const commentsData = await commentsRes.json();
        for (const c of commentsData.items || []) {
          const snippet = c.snippet?.topLevelComment?.snippet;
          if (!snippet?.textDisplay) continue;
          n++;
          evidence.push({
            sourceId: `youtube#${n}`,
            type: 'youtube',
            label: `YouTube comment on "${item.snippet.title}"`,
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
