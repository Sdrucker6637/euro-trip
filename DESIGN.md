---
name: Europe Trip (Amsterdam → Rome)
description: A dark, after-dark travel-app shell holding warm paper ticket cards for transport, itinerary, and packing.
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
typography:
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
    rounded: "{rounded.pill}"
    padding: "6px 11px"
  button-primary-hover:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "6px 11px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.amber}"
    rounded: "{rounded.pill}"
    padding: "6px 11px"
  card-paper:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "14px 16px"
  card-dark:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.cream}"
    rounded: "{rounded.md}"
    padding: "14px 15px"
---

# Design System: Europe Trip (Amsterdam → Rome)

## Overview

**Creative North Star: "The Night Train Passport"**

The app is a dark, after-dark travel-app shell that holds physical travel documents inside it. Everything native to the app itself (the itinerary days, the packing checklist, the tab bar) lives in flat navy surfaces, as if you're looking at a phone screen on a night train. Everything that represents a real booked or bookable object (a train leg, a local-transit info card) is rendered as a warm cream-paper card with ink-colored text, dropped onto that dark shell with a pronounced shadow, as if a paper ticket or boarding pass were physically lying on top of the glass. The two-tone contrast between "app chrome" and "paper document" is the single organizing idea; nothing else in the system competes with it.

Monospace type (IBM Plex Mono) is used everywhere something reads like it was printed by a ticket machine: route codes, dates, status flags, nav labels, pill buttons. A geometric display face (Space Grotesk) carries headlines and titles. Circular ink-stamp badges, dashed cut-lines, and punched-notch cutouts on ticket cards complete the passport-and-boarding-pass vocabulary. Nothing in the system is decorative for its own sake; every recurring motif (dashes, notches, stamps) directly references a physical travel-document detail.

**Key Characteristics:**
- Dark navy app shell vs. warm cream-paper document cards, always ink-on-paper / cream-on-navy, never mixed
- Monospace for anything ticket-like (codes, dates, statuses, labels); a display face only for headlines/titles
- Dashed borders and circular notch cutouts standing in for perforation and stamps
- One accent (amber) reserved for primary action and current state; a small red/green/amber status vocabulary for booking urgency
- Six named per-city hues used only as wayfinding accents (day-card left border, route dots), never as UI chrome

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

### Status Colors (booking urgency, transport tab only)
- **Book-Now Red** (`#C96A52`): a leg needs a mandatory paid reservation - highest urgency.
- **Reserve Amber** (`{colors.amber}`): a reservation is optional but worth making.
- **Hop-On Green** (`#7FAE7A`): no booking needed at all, covered by the rail pass.

### City Route Colors (wayfinding only, not UI chrome)
Six hues, one per city on the route (Amsterdam `#4FA8A0`, Paris `#D8735A`, Interlaken `#7FA85C`, Vienna `#9B7FBF`, Budapest `#D9A441`, Rome `#C75C4A`). Used only as the day-card's left border stripe and the route-timeline dots - a consistent, low-noise way to tell which city a day belongs to at a glance. These never appear on buttons, text, or any interactive control.

### Named Rules
**The One Accent Rule.** Amber is the only color used for a primary call-to-action or an active/selected control. Teal, the status colors, and the city colors are all narrowly scoped to one specific job each and never substitute for amber.

**The Paper-or-Navy Rule.** A card is either a paper-document card (`{colors.paper}` background, `{colors.ink}` text, warm-toned shadow) or an app-shell card (`{colors.surface}` background, `{colors.cream}` text, cool ambient shadow). The two never blend on the same element.

## Typography

**Display Font:** Space Grotesk (with sans-serif fallback)
**Body Font:** IBM Plex Sans (with sans-serif fallback)
**Label/Mono Font:** IBM Plex Mono (with monospace fallback)

**Character:** A confident geometric display face for headlines paired with a warm, plain-spoken body sans, and a monospace face doing double duty as the system's "ticket machine" texture - it appears on far more elements than a typical label font would, because so much of the content (route codes, dates, statuses) is meant to read like it came off a printer.

### Hierarchy
- **Display** (600, 27px, 1.1 line-height, -0.01em tracking): the single `<h1>` route title ("Amsterdam → Rome").
- **Title** (600, 19-20px, mono, normal tracking): route codes and city-pair headers (`AMS → PAR`, flight routes) - the one place the mono face is used at display scale.
- **Subtitle** (600, 14.5-15px, display face): card and section titles - segment titles, day titles, modal headers, accommodation names.
- **Body** (400-500, 13-14.5px, 1.4-1.6 line-height): descriptions, notes, form inputs.
- **Label** (600, 9.5-11.5px, mono, 0-0.04em tracking): everything functional - pill buttons, status flags, nav labels, badges, field labels. The system's smallest text is never body prose, only short functional labels.

### Named Rules
**The Printed-Label Rule.** Any text that represents a code, date, status, or short machine-legible fact (not a sentence) is set in IBM Plex Mono, regardless of where it appears in the hierarchy. Any text that represents a name, title, or description is set in Space Grotesk or IBM Plex Sans.

## Layout

A fixed-width mobile shell (`max-width: 460px`) centered on the page even on a wide desktop viewport - the design deliberately never adapts to a wider column; it always reads as a phone screen. Structure is a vertical flex column: a non-scrolling header (route title + timeline), a scrolling main content area (`16px` side padding, `90px` bottom padding to clear the nav), and a fixed bottom tab bar (3 tabs) with safe-area-aware bottom padding for notched devices.

Content stacks in single-column cards with a consistent rhythm: `12-16px` between cards, `8-16px` internal padding, `6-10px` between a card's internal rows. There is no grid; every screen is a vertical list of cards, sub-lists, and pill-button rows that wrap with `flex-wrap` rather than truncating.

## Elevation & Depth

A deliberate two-tier system, not a continuous shadow scale. Dark app-shell cards (day-card, check-item) sit almost flat, with only a faint ambient shadow (`0 3px 10px rgba(0,0,0,0.2)`) that reads as "part of the app," not an object. Paper document cards (journey, flight-card, the how-to modal) get a pronounced, warm-toned shadow (`0 6-8px 16-20px rgba(0,0,0,0.28-0.35)`) that reads as a physical card resting on top of the screen. Depth is a semantic signal - "is this a real document or app chrome?" - not a decorative gradient of elevation levels.

### Shadow Vocabulary
- **Ambient (app chrome)** (`box-shadow: 0 3px 10px rgba(0,0,0,0.2)`): day-card, check-item.
- **Lifted (paper document)** (`box-shadow: 0 8px 20px rgba(0,0,0,0.35)`): journey card.
- **Lifted, lighter** (`box-shadow: 0 6px 16px rgba(0,0,0,0.28)`): flight-card / local-transit card.

### Named Rules
**The Document Lift Rule.** Only paper-toned cards get a pronounced shadow. A dark-surface card never carries more than the ambient level, no matter its importance.

## Shapes

Generous, friendly radii throughout (`7-18px`); nothing in the system uses a sharp corner. Buttons and badges go further, to a full pill (`16px` on a short element, `50%` on a square icon button or dot) - the system draws a hard line between "card" radii and "pill" radii, with nothing in between.

The signature form language is physical-document perforation: `journey-head` carries a dashed bottom border plus two circular cutout notches (`::before`/`::after`, positioned half off each edge, painted the page background color) that read exactly like a ticket stub's tear-line. The `stamp-badge` (a day's date badge) is a dashed-border circle rotated `-6deg`, reading as a rubber ink stamp struck slightly askew.

### Named Rules
**The Perforation Rule.** Dashed borders and circular notch cutouts are reserved for elements that represent a physical, tearable, or stampable document (ticket cards, date stamps). A purely digital control (a button, an input) never borrows this motif.

## Components

### Buttons
- **Shape:** full pill (`16px` radius on a rectangular button, `50%` on a square icon button).
- **Primary:** `{colors.amber}` background, `{colors.ink}` text, `6-7px 10-13px` padding, mono label font. Used for the one primary action per row (BOOK, the Eurail app CTA, ADD, SAVE).
- **Ghost / Secondary:** transparent background, `{colors.amber}` text, same padding and radius as primary - used for a same-row secondary action (FROM STAY, TO STAY) so it doesn't compete with the primary pill next to it.
- **Icon button:** a `30px` circle, transparent background, `1px` solid paper-toned border, ink icon glyph - used for a single-purpose action (directions) that doesn't need a text label.
- **Ctrl button:** a small (`22-24px`) square-radius icon button on dark surfaces, for compact list-item controls (reorder, remove, edit).

### Chips
- **Flag tag:** small pill, `10px` mono label, uppercase-feeling letter-spacing, colored by booking status (red/amber/green background).
- **Pay badge:** rounded-rect chip (not full pill), colored by a light tint of its status (pay confirmed = light green, not confirmed = light red/amber), used only on paper cards.

### Cards / Containers
- **Corner Style:** `12-18px` depending on card type (see Shapes).
- **Background:** either `{colors.paper}` (document cards) or `{colors.surface}` (app cards) - never any other value.
- **Shadow Strategy:** see Elevation & Depth; document cards lift, app cards stay ambient.
- **Border:** app cards use a `1px` `{colors.line}` divider between internal rows, never an outer border; document cards use a dashed internal divider (`journey-head`) instead of a border.
- **Internal Padding:** `14-16px`.

### Inputs / Fields
- **Style:** `7px` radius, `1px` solid border (`{colors.line}` on dark forms, warm tan on paper forms), generous `8-9px` padding.
- **Focus:** browser-default outline is left in place; no custom focus treatment is defined, which is a gap worth closing (see Do's and Don'ts).

### Navigation
- **Style:** fixed bottom bar, `3` equal-width tabs, icon above a mono label, muted color at rest and `{colors.amber}` when active. Icons are custom-drawn outline SVGs (no icon library), `20px`, `1.6px` stroke, no fill.

### Stamp Badge (signature component)
A `46px` dashed-border circle, rotated `-6deg`, showing a two-line date (month abbreviation + day number) in mono type, colored by the day's city hue. It is the itinerary's primary wayfinding device and the strongest single expression of the "physical travel document" metaphor - deliberately imperfect (the rotation) rather than a clean, centered icon.

## Do's and Don'ts

### Do:
- **Do** put any code, date, status, or label-length string in IBM Plex Mono; put any name, title, or sentence-length string in Space Grotesk or IBM Plex Sans.
- **Do** keep the paper/navy split absolute: paper background always pairs with ink text and a lifted shadow; navy/surface background always pairs with cream text and an ambient shadow.
- **Do** reserve full-pill radius for interactive controls and card/section radii (`12-18px`) for containers; nothing sits between those two scales.
- **Do** reserve dashed borders and circular notches for content that represents a physical, perforated, or stamped document.
- **Do** limit a card's action row to one primary (amber, solid) action plus ghost/icon secondary actions - never two solid amber buttons side by side.

### Don't:
- **Don't** use amber for anything other than the single primary action or current/active state in a given row or tab.
- **Don't** introduce a fourth type family; the display/body/mono trio covers every case in the system.
- **Don't** give a dark-surface (app-chrome) element the pronounced "lifted" shadow reserved for paper document cards.
- **Don't** use a city color anywhere except the day-card left border and the route-timeline dots.
