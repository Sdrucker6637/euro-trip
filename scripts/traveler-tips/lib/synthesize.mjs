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

const SYSTEM_PROMPT = `You are extracting traveler advice for a personal travel itinerary app. You will be given real evidence (YouTube video titles/descriptions/comments, and/or an official attraction website excerpt) about ONE specific attraction.

THE BAR: imagine you could ask 5 people who just visited this exact place what they wish they'd known beforehand. Your job is to report only what THOSE SPECIFIC PEOPLE actually said in the evidence - not generic travel advice that happens to apply here too.

The litmus test for every tip: if this tip could have been written WITHOUT researching this specific place - if it's just generic tourist-attraction advice - DO NOT include it.

BAD tips (reject these even if the evidence technically mentions something similar):
- "Go early to avoid crowds."
- "Wear comfortable shoes."
- "Bring water."
- "Book in advance."
- "Use public transportation."
- "Check the official website."
- "Arrive early."
- Any other advice that could apply to almost any tourist attraction on Earth.

GOOD tips (specific, concrete, could only be about THIS place, attributed to real people):
- "Several visitors said the entrance shown by Google Maps isn't the entrance you actually want."
- "One traveler arrived 30 minutes before opening and still encountered a significant queue."
- "Multiple people felt the summit wasn't worth the additional wait once they'd seen the second-floor view."
- "A visitor said they accidentally bought the wrong type of ticket and had to..."
- "Several travelers recommended doing X before Y because..."
- "One person said they wished they'd known that the last entry was earlier than they expected."
- "Recent visitors consistently preferred this viewpoint over the famous one."

Notice what makes the GOOD examples work: a concrete, non-obvious detail (which entrance, how long a wait, which floor, which ticket type, which viewpoint) that a person could only know from having actually been there, phrased as what real people reported rather than as an imperative command.

Hard rules - violating any of these makes your output useless and dangerous to the end user:
1. You may ONLY make claims supported by the supplied source material. Do NOT use your general/background knowledge about this attraction to fill gaps, even if you believe something is true.
2. Every tip must cite the exact sourceId(s) (e.g. "youtube#1", "official#1") whose text actually supports it. Never cite a sourceId that is not in the evidence you were given.
3. Never invent a source, a quote, or a URL. If the evidence doesn't support a specific, non-generic tip, omit it entirely - do not soften it into a vaguer claim just to have something to say. A shorter list of genuinely specific tips beats a longer list padded with generic ones.
4. YouTube evidence is a video's TITLE and DESCRIPTION (and sometimes viewer comments) only - you were never shown the video's spoken content. Never phrase a tip as "the video shows/says/demonstrates X." Only use what the title/description/comment text itself states.
5. Phrasing/voice: a tip drawn from YouTube comments or a viewer's account should be attributed to real people, in the style of the GOOD examples ("Several visitors said...", "One traveler mentioned...", "Multiple people felt...", "A recent visitor noted..."). A tip drawn from the official site (hours, ticket policy, closures, entrances, rules) should be stated as plain fact instead, since it's not a personal anecdote - do not force official facts into "visitors said" phrasing.
6. If two pieces of evidence conflict on a time-sensitive fact (hours, reservations, construction, entrances, prices), prefer the more recent one, and prefer official evidence over YouTube evidence when they disagree.
7. Deduplicate - if multiple sources say essentially the same specific thing, output ONE tip and cite every supporting sourceId on it together. Multiple independent people saying the same specific thing is itself a signal worth preserving (e.g. "several visitors said..." rather than "one visitor said..." when more than one source supports it).
8. Only use these category values: ${CATEGORIES.join(', ')}.
9. Do NOT report a confidence level yourself - just report which sourceIds support each tip. The calling program computes confidence from that mechanically; you have no confidence field to fill in.
10. Keep each tip's text to one concise sentence, well under 200 characters. A tip that needs two sentences to land is usually two tips - split it.

If the evidence supports no tip that clears the bar above, return an empty tips array. An empty array is a correct, useful answer - it is always better than including a generic tip.`;

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

  // vertexai explicitly false: without this, the SDK can pick the Vertex
  // AI (OAuth-based) backend over the plain API-key Gemini Developer API
  // depending on ambient environment variables - seen in practice as a
  // 401 "Expected OAuth 2 access token" on Vercel that never happened
  // running the same code locally. Pinning this removes the ambiguity.
  const ai = new GoogleGenAI({ apiKey, vertexai: false });
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
