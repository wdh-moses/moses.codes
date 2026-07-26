---
title: "Hey Bible Podcast Season 2: Behind the Scenes (Audio, Oil Stills & Ken Burns Video)"
description: "A technical preview of Season 2 — DeepVoiceMan narration via Venice, Grok Imagine oil-painting stills, verse-timed Ken Burns video, and the two-job pipeline that builds it."
pubDate: 2026-07-26
image: /blog-hero-hey-bible-podcast-s2.webp
author: "Moses"
categories: ["Hey Bible", "Podcast"]
tags: ["hey-bible", "podcast", "season-2", "venice", "grok-imagine", "ken-burns", "tts", "ffmpeg"]
---

[Season 1 of the Hey Bible Podcast](/blog/the-story-of-the-hey-bible-podcast) is still doing its thing: ElevenLabs **Bill**, verse-by-verse MP3s, books dropping on a steady cadence, free on [✝️.fm](https://✝️.fm) / Spotify / Apple. That story hasn’t ended.

**Season 2** is the parallel track we’ve been quietly building next to it. Same free WEB text, same “press play and listen” mission — but a warmer HD narrator, classical oil-painting chapter art, and full chapter **video** with slow Ken Burns motion timed to the verses. Public S2 release stays gated until S1 finishes all 66 books. Production, though, is already deep into Genesis.

If you want the lighter product-facing cut, it’s on the [Hey Bible blog](https://heybible.org/blog/behind-the-scenes-season-2). This post is the longer workshop version.

## A real chapter, not a mockup

We’re far enough along to share actual output — not a mood board.

**[Watch ~90s of Genesis 1](https://files.wdh.sh/download/714884994c9671a73d7e207b)** · **[Full chapter video](https://files.wdh.sh/download/4d41fc9a5fb69eeed71ac8be)** · **[Audio only](https://files.wdh.sh/download/94f6e3d87b4bc0431177133a)**

*(Those are temporary file hosts while we finish packaging S2 for the main player.)*

![Genesis 1 oil plate](/blog-s2-genesis1-plate.webp)

Compared with Season 1, the shape of the work changed. S1 is Bill via Venice Turbo, cover art and social stills, no chapter video, and releases that are already live. S2 is **MiniMax HD · DeepVoiceMan** via Venice, **multi-plate oil stills per chapter** from Grok Imagine, **verse-timed Ken Burns** chapter MP4s, and a deliberate split into two nightly jobs — audio first, then photos and video. S2 ships after S1 clears the finish line; until then we just keep building inventory.

## Two jobs so nothing blocks anything

The biggest operational lesson from S1 (and from early S2 experiments) was: don’t put slow ffmpeg next to TTS in the same session and hope for the best. Long chapter muxes time out. Agent crons sometimes fail auth. So S2 splits the factory in half.

**Job A runs every evening around 7:00 PM ET.** It reads the progress cursor, pulls the next WEB verse texts, and calls Venice TTS — MiniMax Speech 02 HD, voice DeepVoiceMan. Each verse lands as its own permanent file:

```
audio/verses/{book}/{chapter}/{book}-{chapter}-{verse}-web.mp3
```

Same permanence rule as Season 1: **verse files are the library.** We don’t throw them away after stitching. When a chapter’s verses are all present, ffmpeg concatenates them into a chapter MP3 under `audio/chapters/…`, the cursor advances, and we move on. Batches are large — hundreds of verses a day when things are healthy.

**Job B starts about thirty minutes later (~7:30 PM ET)** as a durable script. No LLM required, which is intentional. For every chapter that already has audio but is still missing video, it groups verses into roughly **18–30 second** chunks on verse boundaries, paints one **oil-painting still** per chunk with **xAI Grok Imagine**, renders a Ken Burns segment on each still, crossfades the segments, muxes the chapter audio underneath, and writes:

```
video/chapters/{book}/{book}-{chapter}.mp4
```

As of this writing, Genesis audio **1–40** and the matching chapter videos are done on the production box. The media job only fills gaps; it doesn’t regenerate finished chapters for fun.

| Layer | What we use |
|-------|-------------|
| Verse text | Hey Bible / WEB |
| TTS | Venice → MiniMax HD (DeepVoiceMan) |
| Oil stills | xAI Grok Imagine |
| Motion + mux | ffmpeg (`zoompan`, `gblur`, `xfade`) |
| Orchestration | Hermes cron: audio job + media script |
| Human social review | Automate It (Hey Bible workspace) |

## Why it looks like a gallery, not a trailer

We tried photoreal landscapes. They felt like stock footage sitting on top of Scripture. The lock we kept is quieter: classical European religious **oil painting** (old-master / baroque–romantic feel), wide **16:9** native plates, **no frames, mats, or borders**, content-aware prompts that include the verse text for that chunk, and a soft landscape fallback if a prompt trips moderation. “Museum gallery quiet” beats “cinematic CGI Bible movie” for this show.

## How a still becomes a chapter video

This is the mechanical heart of Job B, and it’s where most of the craft is.

First we **chunk the chapter on verse boundaries**. Probe each verse MP3 duration, walk verses in order, and pack them into chunks until the next verse would push us past ~30 seconds (with a soft floor around 18s). Picture changes only when a verse ends — never mid-word.

Each chunk gets a Grok Imagine still under `photos/chapters/{book}/{book}-{n}-chunks/`, plus a small `chunks.json` that remembers verse ranges and durations.

Then we animate. Naive zoompan recipes jitter; the locked stack is pickier. Upscale the still onto a large square working plate (~**4800px**). Zoom **1.0 → 1.45** with a **smoothstep** ease (`u²(3−2u)`), not a linear ramp. Compute pan room from the **constant max zoom** so x and y don’t fight the live zoom value. Render zoompan at **60 fps**, add a light **gblur (σ≈0.45)**, then downsample to **30 fps** at 1280×720 — that sub-frame temporal average hides a lot of one-pixel crawl. Segments are silent video at this stage; audio comes later. Encode H.264 for the intermediates, concatenate with short **xfade** dissolves (~0.75s), mux the stitched chapter MP3 underneath, and write the final chapter MP4 for later packaging (book-level concat, YouTube masters, and so on).

Still → smooth KB segment → xfade reel → + audio. That’s the whole picture path.

## What we’re not doing yet

We’re not shipping S2 to Spotify or Apple while S1 is incomplete. We’re not overwriting S1 R2 objects or feed GUIDs. We’re not doing public YouTube book drops for S2. When S1 finishes the 66, S2 can land on the same show with proper `itunes:season` metadata and new GUIDs — without stepping on the Season 1 library people are already listening to.

Splitting audio and media wasn’t just neat architecture. Early attempts mixed TTS and long renders in one agent session; timeouts and flaky OAuth made that miserable. Now audio stays a fast, idempotent batch, media is a script-only cron that can grind overnight, and a moderated still can retry with a safer prompt without blocking tomorrow’s verses.

## Where to go from here

- S1 origin story: [The Story of the Hey Bible Podcast](/blog/the-story-of-the-hey-bible-podcast)
- Listen to S1 now: [https://✝️.fm](https://✝️.fm)
- Lighter product post: [heybible.org](https://heybible.org/blog/behind-the-scenes-season-2)

Season 1 keeps releasing books. Season 2 keeps painting Genesis. Same mission — clearer audio, living pictures, free for everyone. One chapter at a time.
