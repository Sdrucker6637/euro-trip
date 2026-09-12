// One Gemini call per activity, strictly grounded in the evidence this
// run actually fetched. Uses the Gemini Developer API (a free-tier API
// key from aistudio.google.com, no billing required) via the official
// @google/genai SDK. See TRAVELER-TIPS.md for the current cost/quota
// notes.
import { GoogleGenAI } from '@google/genai';
import { CATEGORIES } from './categories.mjs';

// gemini-2.5-flash was retired for new API keys (Sep 2026); the API's own
// 404 error names gemini-3.6-flash as the replacement.
const MODEL = 'gemini-3.6-flash';

const SYSTEM_PROMPT = `You are a strict evidence-extraction tool for a personal travel itinerary app. You will be given real evidence (Reddit posts/comments, YouTube video titles/descriptions/comments, and/or an official attraction website excerpt) about ONE specific attraction.

Your ONLY job: extract practical, specific traveler advice that is ACTUALLY STATED in the supplied evidence.

Hard rules - violating any of these makes your output useless and dangerous to the end user:
1. You may ONLY make claims supported by the supplied source material. Do NOT use your general/background knowledge about this attraction to fill gaps, even if you believe something is true.
2. Every tip must cite the exact sourceId(s) (e.g. "reddit#2", "youtube#1", "official#1") whose text actually supports it. Never cite a sourceId that is not in the evidence you were given.
3. Never invent a source, a quote, or a URL. If the evidence doesn't support a useful, specific tip, omit it entirely - do not soften it into a vaguer claim just to have something to say.
4. YouTube evidence is a video's TITLE and DESCRIPTION (and sometimes viewer comments) only - you were never shown the video's spoken content. Never phrase a tip as "the video shows/says/demonstrates X." Only use what the title/description/comment text itself states.
5. Distinguish factual/official information (hours, ticket policy, closures, entrances, rules) from personal opinion/preference (worth it, best photo spot, recommend/skip).
6. If two pieces of evidence conflict on a time-sensitive fact (hours, reservations, construction, entrances, prices), prefer the more recent one, and prefer "official" evidence over "reddit"/"youtube" evidence when they disagree.
7. Deduplicate - if multiple sources say essentially the same thing, output ONE tip and cite every supporting sourceId on it together.
8. Only use these category values: ${CATEGORIES.join(', ')}.
9. Do NOT report a confidence level yourself - just report which sourceIds support each tip. The calling program computes confidence from that mechanically; you have no confidence field to fill in.

If the evidence supports no useful, specific tip at all, return an empty tips array.`;

// Forces schema-valid JSON directly (no markdown fence / stray prose to
// strip) - see TRAVELER-TIPS.md for why this is an improvement over
// asking-nicely-for-JSON-in-text.
const RESPONSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    tips: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: CATEGORIES },
          text: { type: 'string' },
          sourceIds: { type: 'array', items: { type: 'string' } },
        },
        required: ['category', 'text', 'sourceIds'],
        additionalProperties: false,
      },
    },
  },
  required: ['tips'],
  additionalProperties: false,
};

function buildUserMessage(activity, evidence) {
  const evidenceBlock = evidence
    .map((e) => `[${e.sourceId}] (${e.type}) ${e.label}\n${e.text}`)
    .join('\n\n---\n\n');
  return `ATTRACTION: ${activity.name}\nLOCATION: ${activity.place || activity.city}\n\nEVIDENCE:\n\n${evidenceBlock}`;
}

export async function synthesizeTips(activity, evidence) {
  if (!evidence.length) return { tips: [] };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('  [synthesize] GEMINI_API_KEY not set - cannot synthesize tips for this activity.');
    return { tips: [] };
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: buildUserMessage(activity, evidence),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseJsonSchema: RESPONSE_JSON_SCHEMA,
    },
  });

  try {
    const parsed = JSON.parse(response.text);
    return Array.isArray(parsed.tips) ? parsed : { tips: [] };
  } catch (e) {
    console.warn(`  [synthesize] could not parse Gemini JSON output for "${activity.name}": ${e.message}`);
    return { tips: [] };
  }
}
