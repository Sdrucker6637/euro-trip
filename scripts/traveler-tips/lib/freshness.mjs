import { TIME_SENSITIVE_CATEGORIES } from './categories.mjs';

const TIME_SENSITIVE_TTL_DAYS = 45;
const EVERGREEN_TTL_DAYS = 180;

function hasTimeSensitiveTip(entry) {
  return (entry.tips || []).some((t) => TIME_SENSITIVE_CATEGORIES.has(t.category));
}

// New/never-researched activities are always "stale" (there's nothing to
// reuse). An existing entry gets a shorter TTL if any of its tips are in
// a time-sensitive category (hours, tickets, entrances, transit, rules)
// - those go stale faster than an evergreen photo-spot tip.
export function isStale(entry) {
  if (!entry || !entry.researchedAt) return true;
  const ageDays = (Date.now() - new Date(entry.researchedAt).getTime()) / 86400000;
  const ttlDays = hasTimeSensitiveTip(entry) ? TIME_SENSITIVE_TTL_DAYS : EVERGREEN_TTL_DAYS;
  return ageDays > ttlDays;
}
