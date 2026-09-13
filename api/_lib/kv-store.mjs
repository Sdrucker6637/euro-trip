// Live, on-demand-researched tips storage backing /api/research-stop and
// /api/tips - a Redis-backed companion to scripts/traveler-tips/lib/store.mjs
// (which is filesystem-based and only usable by the offline monthly batch
// job/GitHub Action, since a Vercel serverless function's filesystem is
// ephemeral and can't durably persist a write across requests/deployments).
//
// Backed by Upstash Redis via Vercel's Storage/Marketplace integration.
// Redis.fromEnv() reads UPSTASH_REDIS_REST_URL/TOKEN or (for backwards
// compatibility with Vercel's older native KV product) KV_REST_API_URL/
// TOKEN - whichever the integration injected, no manual wiring needed.
// @upstash/redis auto-serializes/deserializes object values as JSON.
import { Redis } from '@upstash/redis';

const HASH_KEY = 'traveler-tips';

function client() {
  return Redis.fromEnv();
}

export async function getTip(slug) {
  return (await client().hget(HASH_KEY, slug)) || null;
}

export async function setTip(slug, entry) {
  await client().hset(HASH_KEY, { [slug]: entry });
}

export async function getAllTips() {
  return (await client().hgetall(HASH_KEY)) || {};
}
