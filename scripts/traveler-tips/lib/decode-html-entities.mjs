// The YouTube Data API returns text fields with HTML entities already
// encoded (e.g. "Tips &amp; Tricks", "Here&#39;s"). Decode once at fetch
// time so index.html's own escapeHtml() at render time doesn't
// double-encode them into visible "&amp;amp;" text.
export function decodeHtmlEntities(s) {
  return (s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}
