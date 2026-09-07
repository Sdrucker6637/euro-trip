---
name: Europe Trip (Amsterdam → Rome)
description: A dark, after-dark travel-app shell over a fixed vintage rail-map backdrop, holding warm paper ticket cards for transport, itinerary, and packing.
colors:
  night-navy: "#0F1B2D"
  surface: "#17263D"
  surface-raised: "#1E3049"
  line: "#2E4763"
  ink: "#241F14"
  paper: "#F3EBD8"
  amber: "#E3A542"
  teal: "#4FA89C"
  status-green: "#7FAE7A"
  status-red: "#C96A52"
  muted: "#8598AD"
  cream: "#EDE7D9"
  city-amsterdam: "#4FA8A0"
  city-paris: "#D8735A"
  city-interlaken: "#7FA85C"
  city-vienna: "#9B7FBF"
  city-budapest: "#D9A441"
  city-rome: "#C75C4A"
  paper-ink-secondary: "#5C5340"
  paper-ink-faint: "#8A806A"
  paper-line: "#C9BD9E"
  pill-neutral: "#E2D7BD"
  status-confirmed-text: "#1F5C2E"
  status-confirmed-bg: "#D7ECD4"
  status-no-text: "#7A2C1C"
  status-no-bg: "#F2D7D0"
  status-unclear-text: "#6B5410"
  status-unclear-bg: "#F0E6C8"
  glass: "rgba(23,38,61,0.87)"
  glass-raised: "rgba(30,48,73,0.9)"
  glass-line: "rgba(133,152,173,0.22)"
  map-line: "rgba(227,165,66,0.16)"
  map-line-faint: "rgba(133,152,173,0.11)"
  map-dot: "rgba(243,235,216,0.4)"
typography:
  masthead:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "36px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
  display:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "27px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
  body:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  label:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.03em"
rounded:
  sm: "7px"
  md: "12px"
  lg: "18px"
  pill: "16px"
  circle: "50%"
  ticket-stub: "2px 10px 2px 10px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
components:
  button-primary:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.ink}"
    rounded: "{rounded.ticket-stub}"
    padding: "7px 12px"
  button-primary-hover:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.ink}"
    rounded: "{rounded.ticket-stub}"
    padding: "7px 12px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.amber}"
    rounded: "0"
    padding: "5px 1px"
  card-paper:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "3px 16px 16px 3px"
    padding: "14px 16px"
  card-dark:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.cream}"
    rounded: "3px 14px 14px 3px"
    padding: "14px 15px"
---

# Design System: Europe Trip (Amsterdam → Rome)

## Overview

**Creative North Star: "The Night Train Passport"**

The app is a dark, after-dark travel-app shell that holds physical travel documents inside it. Everything native to the app itself (the itinerary days, the packing checklist, the tab bar) lives in flat navy surfaces, as if you're looking at a phone screen on a night train. Everything that represents a real booked or bookable object (a train leg, a local-transit info card) is rendered as a warm cream-paper card with ink-colored text, dropped onto that dark shell with a pronounced shadow, as if a paper ticket or boarding pass were physically lying on top of the glass. The two-tone contrast between "app chrome" and "paper document" is the single organizing idea; nothing else in the system competes with it.

Monospace type (IBM Plex Mono) is used everywhere something reads like it was printed by a ticket machine: route codes, dates, status flags, nav labels, pill buttons. A geometric display face (Space Grotesk) carries headlines and titles. Circular ink-stamp badges, dashed cut-lines, and punched-notch cutouts on ticket cards complete the passport-and-boarding-pass vocabulary. Nothing in the system is decorative for its own sake; every recurring motif (dashes, notches, stamps) directly references a physical travel-document detail.

The app shell itself sits over a fixed, extremely low-contrast vintage rail-map layer (`.map-bg`): a night-navy vignette with paper-grain noise, faint gestural coastlines, a dotted graticule, and one dashed route line threading Amsterdam → Paris → Interlaken → Vienna → Budapest → Rome with a small stamp dot per city, colored from the same six city hues used elsewhere. It never scrolls with the content - it is the "outside the train window," fixed behind everything else - and every app-chrome surface (header, day-card, check-item, nav, nearby-btn, nearby-item, the how-to modal) sits on top of it as translucent glass (`{colors.glass}` / `{colors.glass-raised}`, `backdrop-filter: blur()`) rather than a flat opaque fill, so the map reads faintly through the gaps between cards and through the chrome itself. Paper document cards (journey, flight-card) stay fully opaque - paper sits *on* the glass, it never becomes it. Editing surfaces (add-stop-form, search results) also stay opaque, prioritizing legibility over atmosphere while a form is open.

**Key Characteristics:**
- Dark navy app shell vs. warm cream-paper document cards, always ink-on-paper / cream-on-navy, never mixed
- A fixed, near-invisible vintage rail-map layer behind everything, visible through translucent glass chrome and card gaps - texture and journey context, never a functional map
- Monospace for anything ticket-like (codes, dates, statuses, labels); a display face only for headlines/titles
- Dashed and dotted rules, circular notch cutouts, and an asymmetric "ticket-stub" corner radius (sharp corner + rounded corner on the same shape) standing in for perforation, stamps, and a torn stub
- One accent (amber) reserved for primary action and current state; a small red/green/amber status vocabulary for booking urgency
- Six named per-city hues used as wayfinding accents (day-card left border, route dots, map city dots), never as UI chrome

## Colors

A two-surface palette (navy shell / cream paper) plus one warm accent, a three-color booking-status set, and six per-city wayfinding hues.

### Primary
- **Departure Amber** (`#E3A542`): the app's one accent. Primary buttons, the active tab, active toggle/segment states, "book now" emphasis, focus rings on inputs. Used sparingly outside the transport tab's status flags.

### Secondary
- **Boarding Teal** (`#4FA89C`): the "things to do" active state on the itinerary tab's nearby-search toggle. A single, deliberately narrow use so it never competes with amber as the primary accent.

### Neutral
- **Night Navy** (`#0F1B2D`): the app background - the "outside the window" color everything else sits on.
- **Surface** (`#17263D`): dark cards (day-card, check-item, nearby-btn at rest).
- **Surface Raised** (`#1E3049`): the bottom tab bar and hover/active surface for search-result rows - one step brighter than Surface.
- **Line** (`#2E4763`): all hairline borders and dividers on dark surfaces.
- **Muted** (`#8598AD`): secondary/meta text on dark surfaces (dates, descriptions, placeholder copy).
- **Cream** (`#EDE7D9`): primary body text on dark surfaces.
- **Paper** (`#F3EBD8`): the background of every "physical document" card (journeys, local-transit cards).
- **Ink** (`#241F14`): primary text on paper cards - warm near-black, never pure black.
- **Paper Ink Secondary** (`#5C5340`): secondary/meta text on paper cards (dates, route meta, notes) - the paper-context counterpart to Muted.
- **Paper Ink Faint** (`#8A806A`): tertiary text on paper cards - field labels, the lightest text weight on a paper surface.
- **Paper Line** (`#C9BD9E`): borders and dashed dividers on paper cards - the paper-context counterpart to Line, and the color of the signature perforation motif (see Shapes).
- **Pill Neutral** (`#E2D7BD`): the default background for a non-primary pill-link on a paper card, before any status or accent color is applied.

### Glass & Map (environmental layer)
- **Glass** (`rgba(23,38,61,0.87)`) / **Glass Raised** (`rgba(30,48,73,0.9)`): the translucent counterparts to Surface / Surface Raised, used on every app-chrome element (header, nav, day-card, check-item, nearby-btn/item, modal) so the fixed map layer behind reads faintly through. Always paired with `backdrop-filter: blur()`; never used on paper document cards, which stay fully opaque.
- **Glass Line** (`rgba(133,152,173,0.22)`): hairline/dashed borders on glass surfaces - the translucent counterpart to Line.
- **Map Line** (`rgba(227,165,66,0.16)`) / **Map Line Faint** (`rgba(133,152,173,0.11)`) / **Map Dot** (`rgba(243,235,216,0.4)`): the rail-map background's own palette - the route line, coastline/graticule linework, and city-label text respectively. Deliberately near-invisible; if a map element is ever legible enough to compete with foreground content for attention, it is too strong.

### Status Colors (booking urgency, transport tab only)
- **Book-Now Red** (`#C96A52`): a leg needs a mandatory paid reservation - highest urgency.
- **Reserve Amber** (`{colors.amber}`): a reservation is optional but worth making.
- **Hop-On Green** (`#7FAE7A`): no booking needed at all, covered by the rail pass.
- **Status Confirmed** (text `#1F5C2E` on bg `#D7ECD4`) / **Status No** (text `#7A2C1C` on bg `#F2D7D0`) / **Status Unclear** (text `#6B5410` on bg `#F0E6C8`): a three-state pay-badge vocabulary on the Getting Around tab ("Apple Pay / tap works" / "no direct tap" / "unconfirmed") - each a dark text tone on a light tint of itself. A separate, softer status system from the transport tab's red/amber/green flags above, since a payment-method note is informational, not a booking deadline.

### City Route Colors (wayfinding only, not UI chrome)
Six hues, one per city on the route (Amsterdam `#4FA8A0`, Paris `#D8735A`, Interlaken `#7FA85C`, Vienna `#9B7FBF`, Budapest `#D9A441`, Rome `#C75C4A`). Used only as the day-card's left border stripe and the route-timeline dots - a consistent, low-noise way to tell which city a day belongs to at a glance. These never appear on buttons, text, or any interactive control.

### Standard Exceptions
Three raw, undocumented values are used deliberately rather than drift: a plain `rgba(0,0,0,0.6)` scrim behind the How-To modal (a backdrop dimmer has no brand hue to carry); plain white (`#fff`) text on the solid red flag-tag (guaranteed maximum contrast on a small saturated chip beats a palette-matched near-white); and a plain white `rgba(255,255,255,0.25)` inset top-highlight on solid amber ticket-stub buttons (a gloss/tactile cue with no brand hue of its own, the same category as the scrim).

### Named Rules
**The One Accent Rule.** Amber is the only color used for a primary call-to-action or an active/selected control. Teal, the status colors, and the city colors are all narrowly scoped to one specific job each and never substitute for amber.

**The Paper-or-Navy Rule.** A card is either a paper-document card (`{colors.paper}` background, `{colors.ink}` text, warm-toned shadow) or an app-shell card (`{colors.surface}` background, `{colors.cream}` text, cool ambient shadow). The two never blend on the same element.

## Typography

**Display Font:** Space Grotesk (with sans-serif fallback)
**Body Font:** IBM Plex Sans (with sans-serif fallback)
**Label/Mono Font:** IBM Plex Mono (with monospace fallback)

**Character:** A confident geometric display face for headlines paired with a warm, plain-spoken body sans, and a monospace face doing double duty as the system's "ticket machine" texture - it appears on far more elements than a typical label font would, because so much of the content (route codes, dates, statuses) is meant to read like it came off a printer.

### Hierarchy
- **Masthead** (600, 36px, 1 line-height, -0.02em tracking): the single `<h1>` route title, set as a two-line editorial lockup rather than one line of running text - a small uppercase mono departure-city line (`.h1-from`, Label scale), a short amber rule-and-dot mark standing in for the arrow glyph, then the arrival city at Masthead scale (`.h1-to`, "Rome"). The single largest, boldest text in the app, reserved for that one element.
- **Display** (600, 27px, 1.1 line-height, -0.01em tracking): reserved headline-weight step for any future single large heading; nothing currently uses it now that the route title runs at Masthead scale.
- **Title** (600, 19-20px, mono, normal tracking): route codes and city-pair headers (`AMS → PAR`, flight routes) - the one place the mono face is used at display scale.
- **Subtitle** (600, 14.5-15px, display face): card and section titles - segment titles, day titles, modal headers, accommodation names.
- **Body** (400-500, 13-14.5px, 1.4-1.6 line-height): descriptions, notes, form inputs. On a paper card specifically, secondary meta text (dates, route notes) can run slightly smaller, down to `12px`, in Paper Ink Secondary.
- **Label** (600, 9.5-11.5px, mono, 0-0.04em tracking): everything functional - pill buttons, status flags, nav labels, badges, field labels. The stamp badge's month text is the one deliberate exception below this floor, at `8.5px`, since it sits inside a fixed 46px circle alongside the day number - still a label, not body prose. The system's smallest text is never body prose, only short functional labels.

### Named Rules
**The Printed-Label Rule.** Any text that represents a code, date, status, or short machine-legible fact (not a sentence) is set in IBM Plex Mono, regardless of where it appears in the hierarchy. Any text that represents a name, title, or description is set in Space Grotesk or IBM Plex Sans.

## Layout

A fixed-width mobile shell (`max-width: 460px`) centered on the page even on a wide desktop viewport - the design deliberately never adapts to a wider column; it always reads as a phone screen. Structure is a vertical flex column: a non-scrolling header (route title + timeline), a scrolling main content area (`16px` side padding, `90px` bottom padding to clear the nav), and a fixed bottom tab bar (3 tabs) with safe-area-aware bottom padding for notched devices.

Content stacks in single-column cards with a consistent rhythm: `12-16px` between cards, `8-16px` internal padding, `6-10px` between a card's internal rows. There is no grid; every screen is a vertical list of cards, sub-lists, and text-link/button rows that wrap with `flex-wrap` rather than truncating.

## Environmental Layer

A single fixed, full-viewport SVG (`.map-bg`, `position: fixed; inset: 0; z-index: 0; pointer-events: none`) sits behind the entire app shell (`z-index: 1`, transparent background) and never scrolls - it is the view "outside the train window," constant while the traveler scrolls their itinerary. It composes, back to front: a radial navy vignette; a `feTurbulence` paper-grain texture at `5%` opacity for an aged/printed feel rather than a clean digital gradient; a faint dashed lat/long graticule and a few gestural coastline squiggles (`{colors.map-line-faint}`); one dashed route line threading the real journey (Amsterdam → Paris → Interlaken → Vienna → Budapest → Rome) with a small dot per city in that city's own hue plus its terse code (`AMS`, `PAR`, ...) reused from the transport tab's route-code vocabulary; and a small compass rose in one corner. Every value is deliberately near the noise floor - this is texture and journey context, not a legible or functional map, and it must never be strong enough to compete with foreground content for a reader's attention at any scroll position.

## Elevation & Depth

A deliberate two-tier system, not a continuous shadow scale. Dark app-shell cards (day-card, check-item) sit almost flat, with only a faint ambient shadow (`0 3px 10px rgba(0,0,0,0.2)`) that reads as "part of the app," not an object. Paper document cards (journey, flight-card, the how-to modal) get a pronounced, warm-toned shadow (`0 6-8px 16-20px rgba(0,0,0,0.28-0.35)`) that reads as a physical card resting on top of the screen. Depth is a semantic signal - "is this a real document or app chrome?" - not a decorative gradient of elevation levels.

A second, orthogonal depth cue sits underneath the shadow system: every app-chrome surface is translucent glass (`{colors.glass}`) with `backdrop-filter: blur()` over the fixed map layer, while paper document cards stay fully opaque. This reads as "glass held up to a window" vs. "paper resting on the glass" - a second physical metaphor layered onto the existing one, not a replacement for it. The blur is functional, not decorative: it is what keeps the map legible as atmosphere without ever competing with foreground text.

### Shadow Vocabulary
- **Ambient (app chrome)** (`box-shadow: 0 3px 10px rgba(0,0,0,0.2)`): day-card, check-item.
- **Lifted (paper document)** (`box-shadow: 0 8px 20px rgba(0,0,0,0.35)`): journey card.
- **Lifted, lighter** (`box-shadow: 0 6px 16px rgba(0,0,0,0.28)`): flight-card / local-transit card.

### Named Rules
**The Document Lift Rule.** Only paper-toned cards get a pronounced shadow. A dark-surface card never carries more than the ambient level, no matter its importance.

## Shapes

Two radius languages, both physical-document metaphors rather than a plain corner-rounding scale.

**Container corners** stay generous and friendly: cards and sections sit on the documented `sm`/`md`/`lg` scale (`7-18px`), except the primary content cards (`journey`, `flight-card`, `day-card`), which use the asymmetric **ticket-stub radius** instead - one sharp `3px` corner and one full `14-16px` rounded corner on the same shape (e.g. `border-radius: 3px 16px 16px 3px`), reading as a torn stub rather than a uniform rounded rectangle. Compact controls scaled to their own small size - a checkbox-sized icon button, a badge, a tucked-in form input - use a proportional micro-radius roughly a third to half their height (`3-10px`).

**Interactive controls** split into two families rather than a uniform pill: a *primary* action (one per row/card) uses the ticket-stub radius (`2px 10px 2px 10px`) with a solid amber fill and a soft white inset top-highlight (see Standard Exceptions) - a stub torn off and handed over, not a generic rounded button. A *secondary* action drops the pill/border entirely and becomes a plain mono text link (amber or muted, no fill, no border) with a dotted underline that only appears on hover/focus - deliberately less visually loud than the primary action next to it, so a card's action row reads as one clear choice plus quiet alternatives rather than a row of equal-weight pills. A circular icon button (`50%`, `30px`) keeps a dashed rather than solid border, tying it to the perforation motif below.

The signature form language is physical-document perforation: `journey-head` carries a dashed bottom border plus two circular cutout notches (`::before`/`::after`, positioned half off each edge, painted the page background color) that read exactly like a ticket stub's tear-line - now echoed by a dashed rule between a `day-card`'s head and its open detail, and by dotted (lighter-weight) rules between individual stop/checklist rows. The `stamp-badge` (a day's date badge) is a dashed-border circle rotated `-6deg`, reading as a rubber ink stamp struck slightly askew. Paper document cards also carry a faint printed-dot grain texture (a tiny repeating radial-gradient, `~5%` opacity) for a "cheaply printed ticket stock" imperfection rather than a flat color fill.

### Named Rules
**The Perforation Rule.** Dashed and dotted borders and circular notch cutouts are reserved for elements that represent a physical, tearable, or stampable document, or the rules that separate its internal rows (ticket cards, date stamps, stop/checklist dividers). A purely digital control never borrows this motif for its own sake, though it may use a dashed border as the visual marker for a specific affordance (e.g. "add" actions, which have used a dashed border throughout since before this pass).

**The Ticket-Stub Rule.** The asymmetric one-sharp/one-round corner radius is reserved for elements that represent a torn or issued document/action: primary content cards and primary buttons. A container that isn't standing in for a physical object (a form, a modal, a text-link button) uses a plain symmetric radius or none at all.

## Components

### Buttons
- **Shape:** ticket-stub radius (`2px 10px 2px 10px`) for a solid/primary action, no radius (plain text) for a secondary action, `50%` on a square icon button.
- **Primary:** `{colors.amber}` background, `{colors.ink}` text, `7-8px 12-14px` padding, mono label font, soft inset top-highlight. Used for the one primary action per row (BOOK, the Eurail app CTA, ADD, SAVE, ADD DAY).
- **Secondary (text link):** no background, no border - plain mono text (amber for a positive/navigational action, muted for a neutral one, red for destructive) with a dotted underline that appears on hover/focus. Used for every same-row secondary action (FROM STAY, TO STAY, MAP, CANCEL, SHORTEN STAY) so it never competes with the primary action beside it.
- **Icon button:** a `30px` circle, transparent background, `1px` dashed paper-toned border, ink icon glyph - used for a single-purpose action (directions) that doesn't need a text label.
- **Ctrl button:** a small (`22-24px`) square-radius icon button on dark surfaces, for compact list-item controls (reorder, remove, edit).

### Chips
- **Flag tag:** small pill, `10px` mono label, uppercase-feeling letter-spacing, colored by booking status (red/amber/green background).
- **Pay badge:** rounded-rect chip (not full pill), colored by a light tint of its status (pay confirmed = light green, not confirmed = light red/amber), used only on paper cards.

### Cards / Containers
- **Corner Style:** ticket-stub radius (`3px 14-16px 14-16px 3px`) for primary content cards (journey, flight-card, day-card); `12-18px` symmetric for everything else (see Shapes).
- **Background:** paper document cards stay fully opaque `{colors.paper}`; app-chrome cards use translucent `{colors.glass}` with `backdrop-filter: blur()` over the fixed map layer - never a third value.
- **Shadow Strategy:** see Elevation & Depth; document cards lift, app cards stay ambient.
- **Border:** app cards use a `1px` dotted `{colors.glass-line}` divider between internal rows, never a solid outer border; document cards use a dashed internal divider (`journey-head`, `segment`) instead of a border.
- **Internal Padding:** `14-16px`.

### Inputs / Fields
- **Style:** `7px` radius, `1px` solid border (`{colors.line}` on dark forms, warm tan on paper forms), generous `8-9px` padding. Editing surfaces (add-stop-form, search results) stay fully opaque rather than glass, prioritizing legibility while a form is open.
- **Focus:** a themed `:focus-visible` ring (`2px solid {colors.amber}`, ink on paper cards) is defined globally; every focusable element inherits it.

### Navigation
- **Style:** fixed bottom bar, `3` equal-width tabs on translucent `{colors.glass-raised}` with `backdrop-filter: blur()`, icon above a mono label, muted color at rest and `{colors.amber}` when active. Icons are custom-drawn outline SVGs (no icon library), `20px`, `1.6px` stroke, no fill. The active tab also gets a short amber underline tick beneath it and a subtle 1px upward icon shift - a small rail-signal-style indicator rather than color alone.

### Stamp Badge (signature component)
A `46px` dashed-border circle, rotated `-6deg`, showing a two-line date (month abbreviation + day number) in mono type, colored by the day's city hue. It is the itinerary's primary wayfinding device and the strongest single expression of the "physical travel document" metaphor - deliberately imperfect (the rotation) rather than a clean, centered icon.

## Do's and Don'ts

### Do:
- **Do** put any code, date, status, or label-length string in IBM Plex Mono; put any name, title, or sentence-length string in Space Grotesk or IBM Plex Sans.
- **Do** keep the paper/navy split absolute: paper background always pairs with ink text and a lifted shadow; navy/surface background always pairs with cream text and an ambient shadow.
- **Do** keep app-chrome surfaces as translucent glass over the fixed map layer, and paper cards fully opaque; never the reverse.
- **Do** reserve the ticket-stub asymmetric radius for primary content cards and primary buttons; use a plain symmetric radius (or none) everywhere else.
- **Do** reserve dashed/dotted borders and circular notches for content that represents a physical, perforated, or stamped document, or the internal rules that divide one.
- **Do** limit a card's action row to one primary (amber, ticket-stub, solid) action plus text-link/icon secondary actions - never two solid amber buttons side by side.

### Don't:
- **Don't** use amber for anything other than the single primary action or current/active state in a given row or tab.
- **Don't** introduce a fourth type family; the display/body/mono trio covers every case in the system.
- **Don't** give a dark-surface (app-chrome) element the pronounced "lifted" shadow reserved for paper document cards.
- **Don't** use a city color anywhere except the day-card left border, the route-timeline dots, and the background map's own city dots.
- **Don't** let the background map layer become legible enough to read as content, or interactive/scroll with the page - it is fixed texture only.
- **Don't** put a full bordered/filled pill on a secondary action; that vocabulary is reserved for the one primary action per row.
