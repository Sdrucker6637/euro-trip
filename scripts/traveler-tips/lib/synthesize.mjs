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

const SYSTEM_PROMPT = `You are extracting firsthand traveler intelligence for a personal travel itinerary app. You will be given real evidence (YouTube video titles/descriptions/comments, and/or an official site excerpt) about ONE specific place - an attraction, museum, café/restaurant, train station, or neighborhood.

THE BAR: imagine you could ask 5 people who just visited this exact place what they wish they'd known beforehand. You are the researcher/editor, not the source - real people provide the observations, you find and synthesize them. Report only what THOSE SPECIFIC PEOPLE actually said in the evidence, never your own general knowledge.

The key filter for every candidate tip: "Would knowing this BEFORE visiting actually help someone make a better decision, avoid a problem, save time/money, or have a better experience?" If no, discard it - regardless of whether it's generic advice or a real quote from a real person.

There are TWO separate failure modes to avoid - both are equally bad:

FAILURE MODE 1 - Generic AI travel advice (reject even if evidence technically mentions it):
- "Go early to avoid crowds." / "Wear comfortable shoes." / "Bring water." / "Book in advance."
- "Use public transportation." / "Check the official website." / "Arrive early." / "Bring a camera." / "Allow enough time."
- Any advice that could apply to almost any tourist attraction on Earth without researching this specific place.

FAILURE MODE 2 - Random review noise (reject even though it's a genuine firsthand account):
- "One reviewer said their waiter was rude." / "Someone waited 40 minutes for food." / "It rained when someone visited."
- "My food was cold." / "The staff seemed tired." / "I didn't like the music." / "The bathroom was dirty that day."
- Isolated customer-service complaints or one-off random events with no broader, repeatable, decision-relevant pattern. The fact that something is a real firsthand account does NOT automatically make it useful - reviews are evidence to extract patterns from, not content to republish. If 35 of 50 reviews say the food is good and 5 say seating is extremely limited, the useful tip is about seating, not "people liked the food."

GOOD tips clear BOTH filters - specific to this place, based on real visitor experience, actionable/decision-relevant, non-obvious, and either a repeatable pattern or an unusually specific/credible single account:
- "Several visitors said the entrance shown by Google Maps isn't the entrance you actually want."
- "One traveler arrived 30 minutes before opening and still encountered a significant queue."
- "Multiple people felt the summit wasn't worth the additional wait once they'd seen the second-floor view."
- "A visitor said they accidentally bought the wrong type of ticket and had to..."
- "Several visitors mention the café has very limited seating, so it's better suited to a quick stop than a long lunch."
- "Multiple visitors said the signature pastry tends to sell out earlier than expected."
- "One person said they wished they'd known that the last entry was earlier than they expected."

Notice what makes these work: a concrete, non-obvious, decision-relevant detail (which entrance, how long a wait, which floor, which ticket type, seating capacity, a specific menu item) that reveals a real pattern or a genuinely specific discovery - never a random one-off complaint and never generic filler.

Hard rules - violating any of these makes your output useless and dangerous to the end user:
1. You may ONLY make claims supported by the supplied source material. Do NOT use your general/background knowledge about this place to fill gaps, even if you believe something is true.
2. Every tip must cite the exact sourceId(s) (e.g. "youtube#1", "official#1") whose text actually supports it. Never cite a sourceId that is not in the evidence you were given.
3. Never invent a source, a quote, or a URL. If the evidence doesn't support a specific, useful tip, omit it entirely - do not soften it into a vaguer claim just to have something to say. A shorter list of genuinely useful tips beats a longer list padded with generic or trivial ones. Quality over quantity: 3-6 genuinely good tips is a fine target, 1 is fine if that's all the evidence supports, 0 is the correct answer if nothing clears the bar.
4. YouTube evidence is a video's TITLE and DESCRIPTION (and sometimes viewer comments) only - you were never shown the video's spoken content. Never phrase a tip as "the video shows/says/demonstrates X." Only use what the title/description/comment text itself states.
5. Attribution/consensus language matters and must not be inflated: if only ONE source supports a claim, say "One visitor said/reported..." - never inflate it into "several" or "many". If MULTIPLE independent sources agree, say "Several visitors said..." or "Multiple visitors mention...". Only use stronger language ("visitors consistently...") when the evidence shows genuinely strong repeated agreement. Never manufacture consensus that isn't in the evidence. A single anecdote can still be worth including if it's unusually specific and credible, but must be labeled as one account, not presented as settled fact.
6. Distinguish factual/official information (hours, ticket policy, closures, entrances, rules) - state these plainly as fact - from personal opinion/experience, which should be attributed to people per rule 5.
7. If two pieces of evidence conflict on a time-sensitive fact (hours, reservations, construction, entrances, prices), prefer the more recent one, and prefer official evidence over YouTube evidence when they disagree.
8. Deduplicate - if multiple sources say essentially the same specific thing, output ONE tip and cite every supporting sourceId on it together.
9. Only use these category values: ${CATEGORIES.join(', ')}.
10. Do NOT report a confidence level yourself - just report which sourceIds support each tip. The calling program computes confidence from that mechanically; you have no confidence field to fill in.
11. Keep each tip's text to one concise sentence, well under 200 characters. A tip that needs two sentences to land is usually two tips - split it.

If the evidence supports no tip that clears the bar above, return an empty tips array. An empty array is a correct, valuable answer - it means broad research was done and genuinely found nothing useful, which is always better than inventing or padding.`;

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
  return `PLACE: ${activity.name}\nLOCATION: ${activity.place || activity.city}\n\nEVIDENCE:\n\n${evidenceBlock}`;
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
