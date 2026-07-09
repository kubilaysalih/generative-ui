# Generative UI

> [!WARNING]
> **IF YOU TRY IT WITH YOUR OWN API KEY, USE A LOW-CREDIT / LIMITED KEY AND DELETE IT AFTER TESTING. OR BETTER, JUST CLONE THE REPO AND RUN IT YOURSELF.**

A mobile app where **every screen is written by an LLM at runtime**. You type what you want
into the bar at the bottom, and instead of answering with text, the model streams back a
**UI**, which the app parses and renders into real native components, top to bottom, as the
tokens arrive. Tap a card and it generates the next screen the same way.

No fixed screens. No hardcoded flows. Just: prompt goes in, live native UI comes out.

## Demo

https://github.com/kubilaysalih/generative-ui/raw/main/assets/demo.mp4

If it doesn't play above, [watch it here](https://github.com/kubilaysalih/generative-ui/raw/main/assets/demo.mp4).

## Try it in Expo Go

It's published as an Expo Update, so you can run it right now without building anything.
Install **Expo Go** (SDK 54) on your phone, then scan this QR or open the link:

<img src="./assets/expo-go-qr.png" width="200" alt="Scan with Expo Go" />

```
exp://u.expo.dev/f36ec469-0f0a-44f9-8beb-642030cc9554/group/990c9f15-a565-4fce-ac09-9f6f5d6c8a7a
```

Mock mode is on, so it works fully offline. Open Settings to plug in your own model.

## The idea

The trick is the format. The model doesn't emit React, or a giant JSON blob, or prose. It
emits a tiny custom DSL where **every line is one component and nesting happens by
reference**:

```
root  = Column([head, hero, list])
head  = CardHeader("Trending This Week", "Fresh picks")
hero  = ImageBlock("...")
list  = ListBlock([r1, r2, r3], "Popular")
r1    = ListItem("Echoes of Tomorrow", "Sci-Fi · 98%", {src:"..."}, Action([present("...")]))
...
```

Because each line is self-contained, it **streams** like JSONL. But because lines reference
each other, the tree can be arbitrarily deep like JSON. `root` arrives first, so we know the
shape and lay out skeleton slots; every line after that fills one slot. That's where the
nice top-down "fill-in" feeling comes from, for free.

The model only ever produces *intent* (data plus action descriptors). The app owns all the
*behavior*: a small closed pool of primitives (`navigate`, `present`, `add`, `toggle`,
`openApp`, `refine`, and friends) that the model composes. It can't run arbitrary code, and
anything it hallucinates just falls back to a skeleton instead of crashing.

## Honestly? It's fully vibe coded

I'm not going to pretend this was some carefully architected thing. It's **100% vibe coded.**

The core (the DSL, the streaming parser, the renderer, the whole prompt to UI loop) came out
of **a single prompt to Claude Opus 4.8, in about 10 minutes**, and it basically worked first
try. That part genuinely felt like magic.

Then I spent the next **4 to 5 hours** going "ok but the loading glow looks off... the
buttons wrap to the next line... the carousel gets clipped at the edge... the modal has no
close button... dark mode is too bright... the images are random..." over and over,
tightening one detail at a time until it actually felt good.

So: **10 minutes of magic, about 5 hours of taste.** That ratio is kind of the whole point.

## What it does

- 🧩 **Any screen from any prompt**, streamed and rendered live as native components.
- ⚡ **Local-first interactions**: add to a list, toggle, switch a filter, all instant with
  no round-trip to the model.
- 🪟 **Real navigation**: tap to push a screen or open one as an iOS modal sheet; Back is
  instant (cached, never regenerates).
- 🔀 **Partial refine**: change a filter and only that section reloads (with a soft loading
  glow), the rest of the screen stays put.
- 🎞️ **Rich components**: cards, carousels, photo cards, editable lists, key/value blocks,
  chips, deep links into YouTube, Maps, Spotify, and more.
- 🌗 **Light / dark / system theme**, with smooth reanimated transitions throughout.
- 🔌 **Bring your own model**: OpenRouter, OpenAI, or Anthropic, with a model picker. Or
  leave **Mock mode** on and run the whole thing offline.

## Stack

Expo SDK 54 · React Native 0.81 · React 19.1 · TypeScript · reanimated 4 · zustand · bun.

> Targeting SDK 54 because the App Store doesn't support 57 yet. 54 is the latest it
> supports.

## Run it

```bash
bun install
bunx expo start
```

Mock mode is on by default, so it runs fully offline out of the box. Tap a suggestion on the
home screen. To generate from a real model, open **Settings**, pick a provider, paste a key,
and turn Mock mode off.

## Fair warning

This is a **proof of concept**, not a product. It's a weekend-y experiment to see whether the
"model streams a UI" idea actually feels good on a phone. So expect rough edges: there are
almost certainly bugs, the model sometimes emits weird layouts, the placeholder images are
random, error handling is thin, and none of it is tuned for production. Don't ship it, don't
trust it with anything real, just poke at it and enjoy the magic-to-jank ratio.

## Under the hood

The DSL, component registry, action primitives, state model, navigation, rendering, and mock
setup are all written up in **[ARCHITECTURE.md](./ARCHITECTURE.md)**.
