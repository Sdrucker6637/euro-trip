// Hand-verified official URLs only. There is no free general-purpose
// search API budgeted for this project, so this pipeline does NOT try to
// discover an attraction's official site - it never guesses a domain.
// An activity with no entry here simply gets zero official-source
// evidence for this run; that's correct behavior, not a bug. Add an
// entry only once you've personally verified the URL is the real
// official site.
export const OFFICIAL_SITES = {
  'eiffel-tower': 'https://www.toureiffel.paris/en',
  'palace-of-versailles': 'https://en.chateauversailles.fr/',
};

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchOfficialEvidence(activity) {
  const url = OFFICIAL_SITES[activity.slug];
  if (!url) return [];
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; euro-trip-traveler-tips-research/0.1)' } });
    if (!res.ok) {
      console.warn(`  [official] fetch failed (${res.status}) for ${url}`);
      return [];
    }
    const text = htmlToText(await res.text()).slice(0, 4000);
    if (!text) return [];
    return [{
      sourceId: 'official#1',
      type: 'official',
      label: `Official site - ${new URL(url).hostname}`,
      url,
      text,
      publishedAt: null,
    }];
  } catch (e) {
    console.warn(`  [official] fetch error for ${url} - ${e.message}`);
    return [];
  }
}
