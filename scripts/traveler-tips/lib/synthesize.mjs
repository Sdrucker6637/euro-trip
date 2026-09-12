// One Claude Haiku call per activity, strictly grounded in the evidence
// this run actually fetched. See TRAVELER-TIPS.md for the cost math
// (well under $1/year at this volume).
import Anthropic from '@anthropic-ai/sdk';
import { CATEGORIES } from './categories.mjs';

const MODEL = 'claude-haiku-4-5';

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
9. Do NOT report a confidence level yourself - just report which sourceIds support each tip. The calling program computes confidence from that mechanically; anything you write in a "confidence" field is ignored.

Respond with ONLY a single JSON object, no prose before or after, no markdown code fence, matching exactly this shape:
{"tips":[{"category":"one of the allowed categories","text":"short, specific, actionable sentence, under 200 characters","sourceIds":["reddit#1","youtube#2"]}]}

If the evidence supports no useful, specific tip at all, respond with exactly {"tips":[]}.`;

function buildUserMessage(activity, evidence) {
  const evidenceBlock = evidence
    .map((e) => `[${e.sourceId}] (${e.type}) ${e.label}\n${e.text}`)
    .join('\n\n---\n\n');
  return `ATTRACTION: ${activity.name}\nLOCATION: ${activity.place || activity.city}\n\nEVIDENCE:\n\n${evidenceBlock}`;
}

function stripCodeFence(text) {
  return text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
}

export async function synthesizeTips(activity, evidence) {
  if (!evidence.length) return { tips: [] };

  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(activity, evidence) }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock) return { tips: [] };

  try {
    const parsed = JSON.parse(stripCodeFence(textBlock.text));
    return Array.isArray(parsed.tips) ? parsed : { tips: [] };
  } catch (e) {
    console.warn(`  [synthesize] could not parse LLM JSON output for "${activity.name}": ${e.message}`);
    return { tips: [] };
  }
}
