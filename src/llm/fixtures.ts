// Baked demo screens for Mock mode.
//
// The mock is NOT one static page rendered for every prompt. Each default Home
// suggestion has its OWN baked screen here — authored once (what the model would
// return for that prompt) so the offline demo shows real, varied, full content.
// `fixtureFor(prompt)` picks the matching one by a distinctive keyword; anything
// else (custom prompts, detail seeds opened from a card) gets a generic detail.
//
// With Mock mode OFF + an API key, tapping a suggestion instead generates a fresh
// screen from the real model — exactly as if the user typed the prompt.

// --- Trending movies -------------------------------------------------------
const MOVIES = `root  = Column([head, chips, featured, list])
head  = CardHeader("Trending This Week", "Fresh picks · updated daily")
chips = Chips(["All","Sci-Fi","Action","Drama","Comedy"], "filter.genre", "All", "list")
featured = Carousel([f1, f2, f3, f4])
f1    = PhotoCard("Echoes of Tomorrow", "https://picsum.photos/seed/echoes/600/450", "Sci-Fi · 98% · 2h14m", Action([present("Echoes of Tomorrow — synopsis, cast, where to watch")]))
f2    = PhotoCard("The Last Horizon", "https://picsum.photos/seed/horizon/600/450", "Action · 94% · 2h31m", Action([present("The Last Horizon — synopsis, cast, where to watch")]))
f3    = PhotoCard("A Quiet Storm", "https://picsum.photos/seed/qstorm/600/450", "Drama · 89% · 1h58m", Action([present("A Quiet Storm — synopsis, cast, where to watch")]))
f4    = PhotoCard("Perfect Strangers 2", "https://picsum.photos/seed/strangers/600/450", "Comedy · 86% · 1h42m", Action([present("Perfect Strangers 2 — synopsis, cast, where to watch")]))
list  = ListBlock([r1, r2, r3, r4], "Also popular")
r1    = ListItem("Darkwater", "Thriller · 91% · 2h07m", {src:"https://picsum.photos/seed/darkwater/200/200"}, Action([present("Darkwater — synopsis, cast, where to watch")]))
r2    = ListItem("Golden Hour", "Romance · 88% · 1h49m", {src:"https://picsum.photos/seed/golden/200/200"}, Action([present("Golden Hour — synopsis, cast, where to watch")]))
r3    = ListItem("Iron Valley", "Western · 85% · 2h20m", {src:"https://picsum.photos/seed/ironv/200/200"}, Action([present("Iron Valley — synopsis, cast, where to watch")]))
r4    = ListItem("Neon Nights", "Crime · 83% · 2h02m", {src:"https://picsum.photos/seed/neon/200/200"}, Action([present("Neon Nights — synopsis, cast, where to watch")]))
`;

// --- Weekend getaways ------------------------------------------------------
const VACATION = `root   = Column([head, chips, deals, tips])
head   = CardHeader("Weekend Getaways", "Short trips · great value")
chips  = Chips(["All","Beach","City","Nature","Budget"], "filter.trip", "All", "deals")
deals  = Carousel([d1, d2, d3, d4, d5])
d1     = PhotoCard("Amalfi Coast", "https://picsum.photos/seed/amalfi/600/450", "Italy · from $890", Action([present("Amalfi Coast: best season, where to stay, things to do")]))
d2     = PhotoCard("Kyoto", "https://picsum.photos/seed/kyoto/600/450", "Japan · from $1,240", Action([present("Kyoto: temples, gardens, food, where to stay")]))
d3     = PhotoCard("Santorini", "https://picsum.photos/seed/santorini/600/450", "Greece · from $760", Action([present("Santorini: caldera views, beaches, where to stay")]))
d4     = PhotoCard("Lisbon", "https://picsum.photos/seed/lisbon/600/450", "Portugal · from $540", Action([present("Lisbon: trams, viewpoints, food, where to stay")]))
d5     = PhotoCard("Reykjavik", "https://picsum.photos/seed/reykjavik/600/450", "Iceland · from $980", Action([present("Reykjavik: northern lights, blue lagoon, ring road")]))
tips   = ListBlock([t1, t2, t3], "Plan it")
t1     = ListItem("Best months to fly", "cheapest fares & weather", {src:"https://picsum.photos/seed/fly/200/200"}, Action([present("Best months to fly for cheap fares and good weather")]))
t2     = ListItem("Packing checklist", "editable, saved locally", {src:"https://picsum.photos/seed/pack/200/200"}, Action([navigate("A packing checklist I can add to and check off")]))
t3     = ListItem("Visa & entry rules", "by passport & destination", {src:"https://picsum.photos/seed/visa/200/200"}, Action([present("Visa and entry requirements by passport and destination")]))
`;

// --- Shopping list (local state) -------------------------------------------
const SHOPPING = `root  = Column([head, cart, addA, addB])
head  = CardHeader("Shopping List", "Tap + to add · × to remove — all local, instant")
cart  = StateList("My list", "form.cart", ["Milk","Eggs","Bread","Coffee"], "List is empty")
addA  = Buttons([bFruit, bVeg, bDairy])
bFruit= Button("+ Fruit", Action([add("form.cart", "Fruit")]), "secondary")
bVeg  = Button("+ Veggies", Action([add("form.cart", "Veggies")]), "secondary")
bDairy= Button("+ Dairy", Action([add("form.cart", "Dairy")]), "secondary")
addB  = Buttons([bWater, bSnacks, bBread])
bWater= Button("+ Water", Action([add("form.cart", "Water")]), "secondary")
bSnacks = Button("+ Snacks", Action([add("form.cart", "Snacks")]), "secondary")
bBread= Button("+ Bread", Action([add("form.cart", "Bread")]), "secondary")
`;

// --- Lofi on YouTube -------------------------------------------------------
const LOFI = `root  = Column([head, featured, list])
head  = CardHeader("Lofi on YouTube", "Beats to relax & study")
featured = Carousel([c1, c2, c3])
c1    = PhotoCard("lofi hip hop radio", "https://picsum.photos/seed/lofi1/600/450", "24/7 · beats to study to", Action([openApp("youtube", "lofi hip hop radio")]))
c2    = PhotoCard("chillhop essentials", "https://picsum.photos/seed/lofi2/600/450", "jazzy & lofi beats", Action([openApp("youtube", "chillhop essentials")]))
c3    = PhotoCard("synthwave night", "https://picsum.photos/seed/lofi3/600/450", "retro synth vibes", Action([openApp("youtube", "synthwave night drive")]))
list  = ListBlock([v1, v2, v3, v4], "More mixes")
v1    = ListItem("Rainy day jazz", "mellow café piano", {src:"https://picsum.photos/seed/jazz/200/200"}, Action([openApp("youtube", "rainy day jazz cafe")]))
v2    = ListItem("Deep focus", "no lyrics, all flow", {src:"https://picsum.photos/seed/focus/200/200"}, Action([openApp("youtube", "deep focus lofi")]))
v3    = ListItem("Sleepy lofi", "slow beats for night", {src:"https://picsum.photos/seed/sleep/200/200"}, Action([openApp("youtube", "sleepy lofi mix")]))
v4    = ListItem("Coding beats", "keep the flow going", {src:"https://picsum.photos/seed/code/200/200"}, Action([openApp("youtube", "coding lofi beats")]))
`;

// --- Generic detail (custom prompts + detail seeds opened from a card) ------
const FALLBACK = `root  = Column([head, hero, facts, body, cta])
head  = CardHeader("Details", "Offline preview")
hero  = ImageBlock("https://picsum.photos/seed/detail/800/440")
facts = KVList("Overview", {Rating:"4.6 / 5", Length:"About 2h", Updated:"This week"})
body  = TextContent("This is an offline mock preview — the layout is real, the content is generic. Turn Mock mode off in Settings and add an API key to generate live screens from any prompt.", "body")
cta   = Buttons([bRelated, bOpen])
bRelated = Button("Related", Action([navigate("A related preview screen")]), "secondary")
bOpen = Button("Open on YouTube", Action([openApp("youtube", "preview")]), "primary")
`;

interface Fixture {
  keywords: string[];
  dsl: string;
}

// Distinctive keywords — chosen so detail seeds (opened from cards) do NOT match
// a suggestion fixture and fall through to FALLBACK instead.
const FIXTURES: Fixture[] = [
  { keywords: ['trending', 'movie', 'film'], dsl: MOVIES },
  { keywords: ['getaway', 'vacation', 'holiday'], dsl: VACATION },
  { keywords: ['shopping'], dsl: SHOPPING },
  { keywords: ['lofi'], dsl: LOFI },
];

/** Pick the baked screen for a prompt (Mock mode only). */
export function fixtureFor(prompt: string): string {
  const p = prompt.toLowerCase();
  const hit = FIXTURES.find((f) => f.keywords.some((k) => p.includes(k)));
  return hit ? hit.dsl : FALLBACK;
}
