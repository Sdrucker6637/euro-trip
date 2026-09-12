// Single source of truth for the category enum the UI (index.html's
// TIP_CATEGORIES) already understands - keep these two lists in sync by
// hand if the UI ever grows a new category.
export const CATEGORIES = [
  'tickets', 'timing', 'entrance', 'photo', 'transit', 'watchout', 'nearby', 'worthit', 'tip',
];

// Categories where being out of date is actively misleading (hours,
// reservations, closures, security rules) - these force a shorter
// research refresh interval than "evergreen" advice like a photo spot.
export const TIME_SENSITIVE_CATEGORIES = new Set([
  'tickets', 'timing', 'entrance', 'transit', 'watchout',
]);
