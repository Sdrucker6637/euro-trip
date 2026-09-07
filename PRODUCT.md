# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A solo traveler (the app's owner) using it themselves before and during an international multi-city trip, to reference bookings, the day-by-day plan, and packing status. Not currently built for travel companions to use independently on their own device - state lives only in the owner's browser.

## Product Purpose

A single, offline-friendly, no-signup personal companion for a multi-city international trip - consolidates inter-city transport booking status/links, a day-by-day itinerary, and a packing checklist into one page, so the traveler isn't hunting across email confirmations, notes apps, and carrier apps while on the move. Success is the trip running smoothly without that scramble.

## Positioning

Unlike a generic trip-planner app or spreadsheet, it's shaped around how this trip actually gets traveled: inter-city train legs grouped with a real "book this now" vs "pass already covers it" status (not a flat list of links), a day-by-day itinerary whose dates and per-city night counts recalculate automatically when a city stay is extended or shortened, and one-tap paths into the couple of transit apps that actually matter for each leg, rather than a generic map link.

The user wants this to become a reusable template for future trips. Today it is purpose-built for one specific trip (Amsterdam to Rome) with that trip's real cities, dates, hotels, and train legs hardcoded in `index.html`; generalizing the trip data (so a future trip doesn't mean re-authoring the app) is a confirmed future direction, not yet started, and not yet designed.

## Operating Context

Used mostly on a phone, often on the move or with unreliable connectivity (station platforms, trains, hostel wifi) - hence local-only persistence (localStorage, no account) and no login. Core reference content (train legs, accommodation, the day plan) must stay usable even when live network calls fail.

## Capabilities and Constraints

- No backend and no account/sign-in. All edits (renamed days, edited accommodation, added stops, extended/shortened city stays, packing checkboxes, booked-leg checkboxes) are stored in the browser's localStorage on the one device used - not synced across devices, and not shared with anyone else.
- Trip content (cities, dates, hotels, train legs, activities) is currently hardcoded in `index.html` for this one trip. Becoming a reusable template for future trips is wanted but undecided in approach (e.g., an external data file, an in-app editor) - not yet designed or started.
- Runtime lookups (place search/geocoding via Nominatim, nearby suggestions via Overpass) use free, keyless third-party APIs that can be slow, unavailable, or rate-limited; these degrade to a plain in-place message and never block the core itinerary/transport/checklist content from rendering.
- Transport "book" links point to the operator's own site; the app itself never handles bookings or payment.

## Brand Commitments

None established yet. Working name in the UI is "Europe Trip" / "Amsterdam → Rome"; no logo or fixed identity beyond the passport-stamp visual style already in the code (paper-toned cards, dashed stamp badges, mono/display type pairing).

## Evidence on Hand

The itinerary content in `index.html` (cities, dates, named hotels/hostels, specific train legs, day-by-day activities) is the user's real, already-decided trip plan for Oct 9-27, 2026 - treat it as fact for this trip's instance of the app, not placeholder or sample content.

## Product Principles

1. Works with no network and no login - the trip's core content must always render; live lookups (nearby search, geocoding) are enhancements, never a dependency.
2. One page a nervous traveler can trust at a glance - a clear "book this now" vs "already covered" signal for transport, not an undifferentiated wall of links.
3. Editable, not just readable - the itinerary bends to real changes (extend a city stay, swap a hotel, rename a day) instead of being a static printout.
4. Built for one specific real trip today, headed toward reusable tomorrow - the current hardcoded trip content is intentional, not technical debt, until the user decides how to generalize it.

## Accessibility & Inclusion

No requirement established.
