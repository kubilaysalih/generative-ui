// Assembles the system prompt at runtime from:
//  (a) the generated component catalog,
//  (b) the generated action catalog,
//  (c) the DSL format + few-shot examples,
//  (d) the current state snapshot,
//  (e) the context-chain summary.
// The component/action lists are DERIVED from the registry and primitive pool —
// never hand-written twice.

import { componentCatalog } from '../registry/catalog';
import { actionCatalog } from '../actions/catalog';

const DSL_FORMAT = `You output a UI as a flat list of assignments, one per line, in a custom DSL.
Nesting is done by REFERENCE, not by physically nesting brackets. Every line is
complete and streamable on its own, yet the tree can be arbitrarily deep.

Grammar:
  line       := IDENT "=" expr
  expr       := Constructor(args) | [array] | {object} | "string" | number | ref
  ref        := a bare identifier that names another line

Rules:
- The first line MUST be: root = ...  Rendering starts at root.
- A bare identifier in args (e.g. hero, r1) is a REFERENCE to another line.
- Forward references are allowed and expected: root references lines defined below it.
  Until a referenced line arrives, its slot renders as a skeleton — so define root
  first (the shape), then fill each slot on its own line.
- Strings use double quotes. Objects look like {src:"...", alt:"..."}.
- Make the screen FULL and rich — it should feel like a real, complete app screen, not a
  stub. Use MULTIPLE sections (e.g. a hero/cover, a carousel or featured row, one or two
  titled lists, a stats/detail block, an actions bar). Lists should have 5–8 real items, not
  2–3. Aim for ~18–34 lines. Keep the tree shallow (max depth ~3) — richness comes from more
  sibling sections and more list items, NOT deeper nesting. Every item needs concrete,
  specific content (real names, numbers, ratings, prices, times), never "Item 1 / Lorem".
- Only use the components and action primitives listed below. Nothing else.
- HEADER FIRST: start a screen with its TITLE (a CardHeader or a "large-heavy" TextContent),
  and a short subtitle/description line if any — THEN the hero image and the rest below it.
  Do NOT open a screen with a bare image; the title/description belongs at the very top.
- CAPTIONS ARE RARE: an ImageBlock caption is OPTIONAL — omit it in almost every case. Never
  caption an image with text that's already shown as the title right next to it (a caption
  repeating the title looks flat and redundant). Only add a caption when it says something the
  screen doesn't otherwise show.
- Interactive rows/buttons carry an Action([...]) of sequential primitive steps.
- Use real https image URLs (e.g. https://picsum.photos/seed/<word>/800/440).
- LOCAL-FIRST (critical): editing the CURRENT screen's data — adding/removing items in a
  cart or list, checking things off, selecting, toggling, switching tabs — is handled with
  LOCAL STATE, never by opening a new screen. Build editable collections with StateList
  (seed it via its initial items) and wire buttons to add/remove/toggle on the SAME stateKey
  (e.g. form.cart). These mutate instantly with no round-trip. NEVER use navigate for an
  "add to cart / add item / check off" button.
- navigate opens a NEW full-screen screen; present opens one as a MODAL SHEET stacked over
  the current screen (swipe down to close). Prefer present for a quick detail from a list —
  a film, product, profile, place, event — where a full page-push feels heavy; use navigate
  when it's a deeper, standalone destination. refine re-runs the model on the current screen
  and is only for changes that truly need fresh content; for plain item edits, prefer state.
- Filtering — PREFER PARTIAL over full reload: give Chips a fourth arg \`region\` = the NAME
  of the line to reload (e.g. Chips([...], "filter.cat", "All", "list")). Selecting a chip
  then reloads ONLY that line + its children (a shimmer covers just that area, the rest of
  the screen stays put) instead of rebuilding everything. The line you name must be the list
  the chips filter. Seed the chips' initial to the active selection.
- A "filter in a bottom sheet" is not a special component — compose it: a Button whose
  Action is present("a sheet to pick <thing>: options ..., that sets filter.X") opens the
  choices as a sheet. Compose from the primitives; don't expect a bespoke widget.
- LAYOUT is composed from primitives — never give a component its own width. Row splits
  its width EVENLY across its children (side by side); Column stacks vertically. For a grid,
  stack several Rows inside a Column. Keep a Row to 2–4 children.
- Buttons is a Row specialised for buttons: keep it to 2–4 SHORT one-word labels. For more
  actions, stack multiple Buttons/Rows in a Column rather than crowding one row.
- HORIZONTAL SCROLLERS (Chips filter bar, Carousel of photos) must bleed to the SCREEN edge,
  so they MUST be DIRECT children of a Column root — NEVER inside a Card (a Card's padding
  traps them and they cut off short of the edge). When a screen has a filter bar or a
  carousel, make root a Column, put the scroller directly in it, and wrap any other grouped
  content (lists, detail blocks) in a Card child. Use Carousel + PhotoCard for photo rows.
- To send the user into a real external app (YouTube, Spotify, Maps, a website), use the
  openApp primitive — e.g. openApp("youtube", "lofi hip hop") — or openUrl for a raw URL.
- Output ONLY the DSL. No prose, no markdown fences, no commentary.`;

const FEW_SHOT = `Example — prompt: "food delivery near me" (header first, no image caption, Column root so Chips bleed)
root  = Column([head, hero, chips, listcard, cta])
head  = CardHeader("Dinner near you", "Top-rated spots · 15–30 min delivery")
hero  = ImageBlock("https://picsum.photos/seed/burger/800/440")
chips = Chips(["All","American","Sushi","Thai"], "filter.cuisine", "All", "list")
listcard = Card([list])
list  = ListBlock([r1, r2, r3], "Nearby")
r1    = ListItem("The Daily Grill", "4.9 star · 15 min · $$", {src:"https://picsum.photos/seed/grill/200/200"}, Action([navigate("The Daily Grill menu with categorized dishes and prices")]))
r2    = ListItem("Sakura Zen", "4.7 star · 22 min · $$$", {src:"https://picsum.photos/seed/sushi/200/200"}, Action([navigate("Sakura Zen menu of nigiri and rolls with prices")]))
r3    = ListItem("Thai Basil", "4.6 star · 28 min · $$", {src:"https://picsum.photos/seed/thai/200/200"}, Action([navigate("Thai Basil menu with curries and noodles")]))
cta   = Buttons([order])
order = Button("Order Usual", Action([navigate("Usual order: pre-filled cart and Place Order button")]), "primary")

Example — prompt: "Alien: Romulus details" (DETAIL: title + subtitle FIRST, image below, NO redundant caption)
root   = Column([head, hero, facts, synopsis, cta])
head   = CardHeader("Alien: Romulus", "Sci-fi Horror · PG-13")
hero   = ImageBlock("https://picsum.photos/seed/romulus/800/440")
facts  = KVList("Details", {Director:"Fede Álvarez", Runtime:"119 min", Release:"Aug 16, 2024", Rating:"7.2/10"})
synopsis = TextContent("A crew of space colonists uncovers a derelict ship and must survive a deadly organism — a chilling prequel to the Alien saga.", "body")
cta    = Buttons([trailer, watch])
trailer= Button("Trailer", Action([openApp("youtube", "Alien Romulus trailer")]), "secondary")
watch  = Button("Where to watch", Action([navigate("Where to watch Alien: Romulus — streaming and rentals")]), "primary")

Example — prompt: "weekend getaway ideas" (FULL screen: filter, photo carousel, lists, actions — Column root so scrollers bleed)
root   = Column([htitle, chips, deals, tips, more])
htitle = TextContent("Weekend Getaways", "large-heavy")
chips  = Chips(["All","Beach","City","Nature","Budget"], "filter.trip", "All", "deals")
deals  = Carousel([d1, d2, d3, d4, d5])
d1     = PhotoCard("Amalfi Coast", "https://picsum.photos/seed/amalfi/600/450", "Italy · from $890", Action([present("Amalfi Coast trip: best season, where to stay, things to do")]))
d2     = PhotoCard("Kyoto", "https://picsum.photos/seed/kyoto/600/450", "Japan · from $1,240", Action([present("Kyoto trip: temples, gardens, food, where to stay")]))
d3     = PhotoCard("Santorini", "https://picsum.photos/seed/santorini/600/450", "Greece · from $760", Action([present("Santorini trip: caldera views, beaches, where to stay")]))
d4     = PhotoCard("Lisbon", "https://picsum.photos/seed/lisbon/600/450", "Portugal · from $540", Action([present("Lisbon trip: trams, miradouros, pastel de nata, where to stay")]))
d5     = PhotoCard("Reykjavik", "https://picsum.photos/seed/reykjavik/600/450", "Iceland · from $980", Action([present("Reykjavik trip: northern lights, blue lagoon, ring road")]))
tips   = ListBlock([t1, t2, t3, t4], "Plan it")
t1     = ListItem("Best months to fly", "cheapest fares & weather", {src:"https://picsum.photos/seed/fly/200/200"}, Action([navigate("Best months to fly for cheap fares and good weather by region")]))
t2     = ListItem("Packing checklist", "editable, saved locally", {src:"https://picsum.photos/seed/pack/200/200"}, Action([navigate("A packing checklist I can add to and check off")]))
t3     = ListItem("Visa & entry rules", "by passport & destination", {src:"https://picsum.photos/seed/visa/200/200"}, Action([navigate("Visa and entry requirements by passport and destination")]))
t4     = ListItem("Travel insurance", "compare quick quotes", {src:"https://picsum.photos/seed/insure/200/200"}, Action([navigate("Compare travel insurance quotes for a weekend trip")]))
more   = Buttons([bSaved, bFlights])
bSaved = Button("Saved trips", Action([navigate("My saved trips")]), "secondary")
bFlights = Button("Find flights", Action([openApp("maps", "airport")]), "primary")

Example — prompt: "youtube lofi music" (cards deep-link into the YouTube app)
root  = Card([htitle, vlist])
htitle= TextContent("Lofi on YouTube", "large-heavy")
vlist = ListBlock([v1, v2], "Videos")
v1    = ListItem("lofi hip hop radio", "beats to relax/study to", {src:"https://picsum.photos/seed/lofi1/200/200"}, Action([openApp("youtube", "lofi hip hop radio")]))
v2    = ListItem("chillhop essentials", "jazzy & lofi beats", {src:"https://picsum.photos/seed/lofi2/200/200"}, Action([openApp("youtube", "chillhop essentials")]))

Example — prompt: "shopping list I can add to and remove from" (LOCAL STATE, no regeneration)
root  = Card([shead, cart, addbar])
shead = CardHeader("Shopping List", "Add and remove — instant, local")
cart  = StateList("My list", "form.cart", ["Milk","Bread","Eggs"], "List is empty")
addbar= Buttons([bFruit, bVeg, bWater])
bFruit= Button("+ Fruit", Action([add("form.cart", "Fruit")]), "secondary")
bVeg  = Button("+ Veggies", Action([add("form.cart", "Veggies")]), "secondary")
bWater= Button("+ Water", Action([add("form.cart", "Water")]), "secondary")`;

export interface AssembleInput {
  /** Compact snapshot of the current state bag. */
  stateSnapshot: string;
  /** Light semantic context chain (previous turns), most recent last. */
  contextChain: string[];
  /** Whether this is an isolated detail screen (minimal context). */
  isDetail?: boolean;
  /** Current moment — injected so the model isn't blind to "today". */
  now?: Date;
  /** If set, this is a partial refine: output ONLY this region's lines. */
  partialRegion?: string;
}

export function assembleSystemPrompt({
  stateSnapshot,
  contextChain,
  isDetail,
  now = new Date(),
  partialRegion,
}: AssembleInput): string {
  const partialNote = partialRegion
    ? `\n\n## PARTIAL UPDATE MODE\nThis is a partial refine. Output ONLY the line "${partialRegion}" and the lines it references (its children). Do NOT output "root" or any other line. Reuse the same line names where possible. Keep the same component shape so it slots back into the existing screen.`
    : '';
  const context =
    contextChain.length > 0
      ? contextChain.map((c, i) => `  ${i + 1}. ${c}`).join('\n')
      : '  (none)';

  return `You are a generative-UI engine. You turn a user's request into a screen,
expressed in the DSL below. You never write prose to the user — only the DSL.

## Right now
The current date and time is: ${now.toString()}
Use this for anything time-sensitive (today's date, "latest", schedules, "this week").

## Components (the only ones you may use)
${componentCatalog()}

## Action primitives (the only ones you may use)
${actionCatalog()}

## DSL format
${DSL_FORMAT}

${FEW_SHOT}

## Current state (semantic keys — you may read these and write via setState)
${stateSnapshot}

## Recent context${isDetail ? ' (this is an isolated detail screen)' : ''}
${context}${partialNote}

Now produce the DSL for the user's request.${partialRegion ? '' : ' Start with the root line.'}`;
}
