#!/usr/bin/env node
// DIAGNOSTIC / PRE-IMPLEMENTATION TEST SCRIPT - not wired into run.mjs.
//
// Tests whether Gemini's Google Search grounding can replace the current
// YouTube+official-sites evidence pipeline with genuinely broader web
// research (Reddit, Yelp, Tripadvisor, blogs, Maps reviews, local-
// language sources, etc.) - see TRAVELER-TIPS.md and the redesign spec
// for the full rationale. This prints everything raw for manual review
// against the quality bar BEFORE any of this becomes the real pipeline.
//
// Usage:
//   node scripts/traveler-tips/test-grounding.mjs
//   node scripts/traveler-tips/test-grounding.mjs --only="Eiffel Tower"
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { CATEGORIES } from './lib/categories.mjs';

const MODEL = 'gemini-3.5-flash-lite'; // see synthesize.mjs for why - gemini-3.6-flash's free tier is capped at 20 requests/day

// The required test set from the redesign spec: a mix of major landmark,
// museum, small independent business, a scenic/nature spot, and a train
// station - deliberately testing whether broad web research works for
// place types the old YouTube-only pipeline couldn't handle (Café Pli
// especially - the small-business test case).
const TEST_ACTIVITIES = [
  { name: 'Eiffel Tower', place: 'Eiffel Tower, Paris', city: 'Paris', type: 'major attraction' },
  { name: 'Vatican Museums', place: 'Vatican Museums, Vatican City', city: 'Rome', type: 'museum' },
  { name: 'Zaanse Schans', place: 'Zaanse Schans, Netherlands', city: 'Amsterdam area', type: 'attraction/neighborhood' },
  { name: 'Lauterbrunnen', place: 'Lauterbrunnen, Switzerland', city: 'Interlaken area', type: 'neighborhood/scenic area' },
  { name: 'Café Pli', place: 'Café Pli, Temple, Paris', city: 'Paris', type: 'café' },
  { name: 'Amsterdam Centraal', place: 'Amsterdam Centraal railway station', city: 'Amsterdam', type: 'train station' },
];

// Adapts the research instruction to place type, per the redesign spec's
// "adapt research to the type of place" section - not a fixed literal
// query list (Gemini formulates its own actual search queries via the
// google_search tool; this just points it at the right angles).
function researchAngles(type) {
  const common = `Look for language indicating a real visit happened - "I went", "we visited", "just got back", "I wish I knew", "I wish someone had told me", "I made the mistake of", "in my experience", "we ended up" - and prefer that over generic third-party SEO travel-guide content. Check Reddit and travel forums if discoverable through search (do not use any Reddit API or scraper - only what a normal Google Search surfaces).`;

  if (type === 'café' || type === 'restaurant') {
    return `${common} This is a small/independent food business, so YouTube coverage may not exist - that does NOT mean there's no useful information. Check Google/Maps reviews, Yelp, Tripadvisor, food blogs, local publications, and local-language reviews (e.g. French "avis" for a Paris café) in addition to English sources. Look specifically for: what's worth ordering, seating availability/capacity, wait times, reservation policy, atmosphere when it's decision-relevant, and whether it's worth a detour - not generic praise or isolated service complaints.`;
  }
  if (type === 'museum') {
    return `${common} Look specifically for: which exhibits visitors recommend or say to skip, entrance/queue experience, ticketing quirks, layout/navigation surprises, timing (how long people actually spent, best time to go), and anything unexpectedly good or disappointing.`;
  }
  if (type === 'train station') {
    return `${common} Look specifically for: confusing navigation, platform-finding difficulty, transfer experience, luggage/storage, which entrance to use, signage problems, and unexpected walking distances between platforms or to connections.`;
  }
  if (type.includes('neighborhood') || type.includes('scenic')) {
    return `${common} Look specifically for: how visitors actually navigated the area, hidden spots worth knowing about, common misunderstandings (e.g. about tickets, trains, timing, weather-dependent access), worthwhile detours, and genuine visitor impressions of specific viewpoints/sub-areas.`;
  }
  return `${common} Look specifically for: entrance/queue experience, ticket types and mistakes people made, timing (crowds, best time to visit), whether the most famous part is actually worth the wait/money, alternative viewpoints or approaches, and anything visitors say they wish they'd known beforehand.`;
}

function researchPrompt(activity) {
  return `You are researching genuine firsthand visitor experiences about "${activity.name}" (${activity.place}) to help a traveler plan a visit. Use Google Search to find and read real sources - do not answer from your own general knowledge.

${researchAngles(activity.type)}

For everything you find, report:
- The specific claim/observation
- Whether it comes from one source or appears to be corroborated by multiple independent sources
- What kind of source it is (Reddit, review site, blog, forum, official site, etc.)

Explicitly EXCLUDE and do not report:
- Generic tourism advice that could apply to almost any place ("go early", "wear comfortable shoes", "bring water", "book in advance")
- Isolated, one-off customer-service complaints or random bad-day events with no broader pattern ("my waiter was rude", "my food was cold once", "it rained")
- General sentiment with no specific, actionable detail ("people liked it", "staff was friendly")

INCLUDE things like: which specific entrance/ticket to use or avoid, specific wait-time patterns, specific things worth ordering/seeing/skipping, specific mistakes visitors made and how to avoid them, specific alternative recommendations, and any other concrete, non-obvious, decision-relevant detail a real visitor reported.

If you find genuinely little or nothing useful after a real search, say so explicitly rather than padding the response. Do not invent sources or claims.`;
}

const EXTRACTION_SYSTEM_PROMPT = `You are a strict evidence-extraction editor for a personal travel itinerary app. You will be given raw research notes (already gathered via real web search) about ONE specific place, plus a numbered list of the real sources that research was grounded in.

THE BAR: imagine five people who just visited this exact place - what would they wish they'd known beforehand? Extract only tips that clear this bar.

The litmus test for every tip: if this could have been written WITHOUT researching this specific place, or if it's just a one-off complaint/random event with no broader pattern, DO NOT include it.

Reject (even if the notes mention something similar):
- Generic tourism advice ("go early", "wear comfortable shoes", "bring water", "book in advance", "arrive early", "use public transportation", "check the official website")
- Isolated customer-service complaints or random one-off events ("a reviewer's waiter was rude", "someone's food was cold", "it rained during one visit") - these are not decision-relevant patterns
- General sentiment with no specific, actionable content ("people liked it", "staff was friendly")

Keep tips that are: specific to this exact place, based on what the research notes say real visitors experienced, useful for planning, actionable, non-obvious, and either a genuine repeatable pattern OR an unusually specific/credible single account worth knowing.

Hard rules:
1. Only use claims that are actually in the supplied research notes. Never fall back on your own general/background knowledge to fill gaps.
2. Every tip must cite the exact source index/indices (from the numbered source list) that support it. Never cite an index not in that list.
3. Voice/attribution: if the notes indicate ONE source for a claim, phrase it as "One visitor said/reported..." - never inflate a single account into "several" or "many". If the notes indicate multiple independent sources agree, phrase it as "Several visitors said..." or "Multiple visitors mention...". Only use stronger consensus language ("visitors consistently...") when the notes clearly indicate strong repeated agreement. Never manufacture consensus.
4. Distinguish factual/official information (hours, ticket policy, closures) from personal opinion/experience - state facts plainly, attribute opinions/experiences to people.
5. Deduplicate - if multiple notes describe the same specific thing, output ONE tip citing every supporting source together.
6. Only use these category values: ${CATEGORIES.join(', ')}.
7. Do not report a confidence level - just report which source indices support each tip; confidence is computed separately from source count.
8. Keep each tip to one concise sentence, well under 200 characters.
9. Quality over quantity: 3-6 genuinely good tips is the target. If only one clears the bar, return one. If none do, return an empty array - that is a correct, valuable answer, not a failure.

If the research notes explicitly say little/nothing useful was found, return an empty tips array - do not invent something to avoid an empty result.`;

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    tips: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: CATEGORIES },
          text: { type: 'string' },
          sourceIndices: { type: 'array', items: { type: 'number' } },
        },
        required: ['category', 'text', 'sourceIndices'],
        additionalProperties: false,
      },
    },
  },
  required: ['tips'],
  additionalProperties: false,
};

async function research(ai, activity) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: researchPrompt(activity),
    config: { tools: [{ googleSearch: {} }], vertexai: false },
  });

  const text = response.text || '';
  const metadata = response.candidates?.[0]?.groundingMetadata;
  const chunks = (metadata?.groundingChunks || []).map((c, i) => ({
    index: i,
    title: c.web?.title || c.maps?.title || null,
    uri: c.web?.uri || c.maps?.uri || null,
    kind: c.web ? 'web' : c.maps ? 'maps' : 'other',
  }));
  const queries = metadata?.webSearchQueries || [];
  return { text, chunks, queries };
}

async function extract(ai, activity, researchText, chunks) {
  if (!researchText.trim()) return { tips: [] };
  const sourceList = chunks.map((c) => `[${c.index}] (${c.kind}) ${c.title || '(untitled)'} - ${c.uri || '(no URL)'}`).join('\n');
  const userMessage = `PLACE: ${activity.name}\nLOCATION: ${activity.place}\n\nRESEARCH NOTES:\n${researchText}\n\nREAL SOURCES (cite only these indices):\n${sourceList || '(no sources were retrieved)'}`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: userMessage,
    config: {
      systemInstruction: EXTRACTION_SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseJsonSchema: EXTRACTION_SCHEMA,
      vertexai: false,
    },
  });
  try {
    const parsed = JSON.parse(response.text);
    return Array.isArray(parsed.tips) ? parsed : { tips: [] };
  } catch (e) {
    console.warn(`  [extract] could not parse JSON output: ${e.message}`);
    return { tips: [] };
  }
}

async function testOne(ai, activity) {
  console.log(`\n${'='.repeat(70)}\n${activity.name} (${activity.type})\n${'='.repeat(70)}`);

  const { text, chunks, queries } = await research(ai, activity);
  console.log(`\n--- Search queries Gemini actually ran (${queries.length}) ---`);
  queries.forEach((q) => console.log(`  - ${q}`));

  console.log(`\n--- Grounding chunks / real sources found (${chunks.length}) ---`);
  chunks.forEach((c) => console.log(`  [${c.index}] (${c.kind}) ${c.title} - ${c.uri}`));

  console.log(`\n--- Raw grounded research text ---\n${text || '(empty - Gemini returned no text)'}`);

  const { tips } = await extract(ai, activity, text, chunks);
  console.log(`\n--- Extracted candidate tips (${tips.length}) ---`);
  for (const t of tips) {
    const citedChunks = t.sourceIndices.map((i) => chunks[i]).filter(Boolean);
    const validIndices = t.sourceIndices.every((i) => chunks[i]);
    console.log(`  [${t.category}] ${t.text}`);
    console.log(`    cited indices: ${JSON.stringify(t.sourceIndices)} - ${validIndices ? 'ALL VALID' : '*** CONTAINS INVENTED/INVALID INDEX ***'}`);
    citedChunks.forEach((c) => console.log(`      -> ${c.title} (${c.uri})`));
  }
  if (!tips.length) console.log('  (none - either no useful evidence, or nothing cleared the quality bar)');
}

async function main() {
  const args = process.argv.slice(2);
  const onlyArg = args.find((a) => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice('--only='.length).toLowerCase() : null;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not set.');
    process.exit(1);
  }
  const ai = new GoogleGenAI({ apiKey, vertexai: false });

  const targets = only ? TEST_ACTIVITIES.filter((a) => a.name.toLowerCase().includes(only)) : TEST_ACTIVITIES;
  if (!targets.length) {
    console.error(`No test activity matches --only="${only}"`);
    process.exit(1);
  }

  for (const activity of targets) {
    try {
      await testOne(ai, activity);
    } catch (e) {
      console.error(`\nFAILED on ${activity.name}: ${e.message}`);
    }
  }
}

main();
