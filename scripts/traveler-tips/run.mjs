#!/usr/bin/env node
// Traveler Tips research pipeline - a standalone, offline batch job (run
// locally or in GitHub Actions), never from the browser. See
// TRAVELER-TIPS.md for the full design. Usage:
//
//   node scripts/traveler-tips/run.mjs                  # research whatever's stale/new
//   node scripts/traveler-tips/run.mjs --only=eiffel-tower,palace-of-versailles
//   node scripts/traveler-tips/run.mjs --force           # ignore freshness, re-research everything selected
//   node scripts/traveler-tips/run.mjs --dry-run          # print the result, don't write data/traveler-tips.json
//
// Requires env vars YOUTUBE_API_KEY and GEMINI_API_KEY (Reddit needs none).
// Reads them from a .env file in the repo root if present (see .env.example).
import 'dotenv/config';
import { extractActivities } from './lib/extract-itinerary.mjs';
import { fetchRedditEvidence } from './lib/reddit.mjs';
import { fetchYoutubeEvidence } from './lib/youtube.mjs';
import { fetchOfficialEvidence } from './lib/official.mjs';
import { synthesizeTips } from './lib/synthesize.mjs';
import { validateAndBuildEntry } from './lib/validate.mjs';
import { isStale } from './lib/freshness.mjs';
import { readStore, writeStore, DATA_PATH } from './lib/store.mjs';

function parseArgs(argv) {
  const args = { force: false, dryRun: false, only: null };
  for (const a of argv) {
    if (a === '--force') args.force = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a.startsWith('--only=')) args.only = a.slice('--only='.length).split(',').map((s) => s.trim()).filter(Boolean);
  }
  return args;
}

// Returns a validated entry to write, or null to mean "no change" - this
// function NEVER returns something that should overwrite a previously-
// good entry with emptiness. A transient failure (no evidence this run,
// an LLM error, a parse failure) just leaves whatever was there before.
async function researchOne(activity) {
  console.log(`\n=== ${activity.name} (${activity.slug}) ===`);

  const [reddit, youtube, official] = await Promise.all([
    fetchRedditEvidence(activity).catch((e) => { console.warn(`  [reddit] failed entirely: ${e.message}`); return []; }),
    fetchYoutubeEvidence(activity).catch((e) => { console.warn(`  [youtube] failed entirely: ${e.message}`); return []; }),
    fetchOfficialEvidence(activity).catch((e) => { console.warn(`  [official] failed entirely: ${e.message}`); return []; }),
  ]);
  const evidence = [...reddit, ...youtube, ...official];
  console.log(`  evidence collected: ${reddit.length} reddit, ${youtube.length} youtube, ${official.length} official`);

  if (!evidence.length) {
    console.log('  no evidence from any source this run - leaving existing data (if any) untouched.');
    return null;
  }

  let synth;
  try {
    synth = await synthesizeTips(activity, evidence);
  } catch (e) {
    console.warn(`  [synthesize] LLM call failed: ${e.message} - leaving existing data untouched.`);
    return null;
  }

  const entry = validateAndBuildEntry(synth.tips, evidence);
  if (!entry) {
    console.log('  no tip survived validation - leaving existing data untouched.');
    return null;
  }
  console.log(`  validated: ${entry.tips.length} tip(s) from ${entry.sources.length} source(s).`);
  return entry;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const activities = extractActivities();
  const store = readStore();

  const targets = activities.filter((a) => (args.only ? args.only.includes(a.slug) : args.force || isStale(store[a.slug])));

  console.log(`${activities.length} total activities in itinerary; ${targets.length} selected to research this run.`);
  if (args.only) {
    const missing = args.only.filter((slug) => !activities.some((a) => a.slug === slug));
    if (missing.length) console.warn(`--only named slugs not found in the itinerary: ${missing.join(', ')}`);
  }
  if (!targets.length) {
    console.log('Nothing to do - everything selected is already fresh. Use --force or --only=<slug> to override.');
    return;
  }

  for (const activity of targets) {
    let entry;
    try {
      entry = await researchOne(activity);
    } catch (e) {
      console.error(`  UNEXPECTED ERROR researching "${activity.slug}": ${e.message} - leaving existing data untouched.`);
      continue;
    }
    if (!entry) continue;
    store[activity.slug] = entry;
    if (!args.dryRun) writeStore(store); // incremental write - a later crash never loses this activity's result
  }

  if (args.dryRun) {
    console.log(`\n--dry-run: not writing ${DATA_PATH}. Final in-memory result for the selected activities:`);
    for (const a of targets) console.log(JSON.stringify({ [a.slug]: store[a.slug] ?? null }, null, 2));
  } else {
    console.log(`\nDone. data/traveler-tips.json now has ${Object.keys(store).length} researched activities.`);
  }
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exitCode = 1;
});
