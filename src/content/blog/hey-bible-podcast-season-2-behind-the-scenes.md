---
title: "Hey Bible Podcast Season 2: Behind the Scenes (Audio, Oil Stills & Ken Burns Video)"
description: "A technical preview of Season 2 — DeepVoiceMan narration via Venice, Grok Imagine oil-painting stills, verse-timed Ken Burns video, and the two-job pipeline that builds it."
pubDate: 2026-07-26
image: /blog-hero-hey-bible-podcast-s2.webp
author: "Moses"
categories: ["Hey Bible", "Podcast"]
tags: ["hey-bible", "podcast", "season-2", "venice", "grok-imagine", "ken-burns", "tts", "ffmpeg"]
---

## A sequel, not a replacement

[Season 1 of the Hey Bible Podcast](/blog/the-story-of-the-hey-bible-podcast) is still running: ElevenLabs **Bill**, verse-by-verse MP3s, monthly book releases, free on [✝️.fm](https://✝️.fm) / Spotify / Apple.

**Season 2** is a parallel build. Same show family, same free WEB text, but a higher-production track:

- A warmer HD narrator
- Classical oil-painting chapter art
- Full chapter **video** with slow Ken Burns motion timed to the verses

Public S2 release stays gated until S1 finishes all 66 books. Production is already deep into Genesis.

For a shorter product-facing version of this story, see the [Hey Bible blog post](https://heybible.org/blog/behind-the-scenes-season-2).

## Preview: Genesis 1

Here is a short preview cut from the finished Genesis 1 chapter video (oil plates + Ken Burns + chapter audio):

**[Watch ~90s Genesis 1 preview](https://files.wdh.sh/download/714884994c9671a73d7e207b)**  
**[Full Genesis 1 chapter video](https://files.wdh.sh/download/4d41fc9a5fb69eeed71ac8be)** · **[Chapter audio only](https://files.wdh.sh/download/94f6e3d87b4bc0431177133a)**

*(Preview links are temporary file hosts used while we finish packaging S2 for the main player.)*

![Genesis 1 oil plate](/blog-s2-genesis1-plate.webp)

## What changed vs Season 1

| | Season 1 | Season 2 |
|--|----------|----------|
| Voice | ElevenLabs Bill (Turbo) via Venice | **MiniMax HD · DeepVoiceMan** via Venice |
| Visuals | Cover / social stills | **Multi-plate oil stills per chapter** (Grok Imagine) |
| Video | — | **Verse-timed Ken Burns** chapter MP4s |
| Unit of work | Daily verse batch | **Job A: audio** → **Job B: photos + video** |
| Release | Live, accelerating book drops | Built now; **ship after S1 completes 66 books** |

## The two-job pipeline

S2 deliberately splits work so a slow render never blocks narration.

### Job A — Daily verse audio (evening)

Runs every day around **7:00 PM ET**.

1. Read the progress cursor (`state/progress.json`)
2. Pull the next WEB verse texts
3. Call Venice TTS: **MiniMax Speech 02 HD**, voice **DeepVoiceMan**
4. Write permanent verse files:
   ```
   audio/verses/{book}/{chapter}/{book}-{chapter}-{verse}-web.mp3
   ```
5. When a chapter’s verses are complete, stitch a chapter MP3 with ffmpeg:
   ```
   audio/chapters/{book}/{book}-{chapter}-web.mp3
   ```
6. Advance the cursor (batch size is large — hundreds of verses per day)

Same permanence rule as S1: **verse files are the library**. Chapters are stitched artifacts.

### Job B — Chapter media (stills + video)

Runs **30 minutes later** (~7:30 PM ET), as a durable script (no LLM required).

For every chapter that **has audio** but **missing video**:

1. Group verses into ~**18–30 second** chunks on verse boundaries
2. Generate one **oil-painting still** per chunk with **xAI Grok Imagine**
3. Render a Ken Burns segment per still
4. Crossfade segments, mux chapter audio, write:
   ```
   video/chapters/{book}/{book}-{chapter}.mp4
   ```

As of this writing, Genesis audio **1–40** and matching chapter videos are complete on the production box. The media job only fills gaps; it does not regenerate finished chapters.

## Style guide: classical European oil

We locked a visual language early:

- Classical European religious **oil painting** (old-master / baroque–romantic feel)
- Wide **16:9** native plates
- **No frames, mats, or borders**
- Content-aware: the plate prompt includes the verse text for that chunk
- Soft landscape fallback if a prompt trips moderation

The goal is “museum gallery quiet,” not cinematic photoreal CGI. Photoreal stills looked wrong next to Scripture narration; oil paint reads as intentional art.

## From still → Ken Burns → chapter video

This is the fun mechanical bit.

### 1. Chunk the chapter on verse boundaries

Probe each verse MP3 duration. Walk verses in order, packing them into chunks until the next verse would exceed ~30s (or we hit a soft floor around 18s). Picture changes only on **verse boundaries**, never mid-word.

### 2. Paint a plate per chunk

Each chunk gets a Grok Imagine still, saved under:

```
photos/chapters/{book}/{book}-{n}-chunks/chunk-01.jpg …
```

plus a small `chunks.json` metadata file (verse ranges + durations).

### 3. Animate with a “stable pan room” Ken Burns

Naive zoompan recipes jitter. The locked stack:

1. Upscale the still onto a large square working plate (~**4800px**)
2. Zoom **1.0 → 1.45** with a **smoothstep** ease (`u²(3−2u)`), not linear
3. Compute pan room from the **constant max zoom** (not from the live zoom) so x/y don’t fight the zoom
4. Render zoompan at **60 fps**, light **gblur (σ≈0.45)**, then downsample to **30 fps** 1280×720  
   (sub-frame temporal average hides 1px crawl)
5. Encode H.264 main profile for intermediate segments

Each segment is silent video only at this stage — audio comes later.

### 4. Crossfade and mux

- Concatenate segments with short **xfade** dissolves (~0.75s)
- Mux the stitched chapter MP3 underneath
- Write the final chapter MP4 for packaging later (book-level concat, YouTube masters, etc.)

That’s the whole picture path: **still → smooth KB segment → xfade reel → + audio**.

## Tooling map

| Layer | Provider / tool |
|-------|-----------------|
| Verse text | Hey Bible / WEB |
| TTS | Venice → MiniMax HD (DeepVoiceMan) |
| Oil stills | xAI Grok Imagine (image) |
| Motion + mux | ffmpeg (`zoompan`, `gblur`, `xfade`) |
| Orchestration | Hermes cron: audio job + media script job |
| Human social review | Automate It (Hey Bible workspace) |

## What we are *not* doing yet

- Shipping S2 to Spotify/Apple while S1 is incomplete
- Overwriting S1 R2 objects or feed GUIDs
- Public YouTube book drops for S2

When S1 finishes the 66, S2 can land on the same show with proper `itunes:season` metadata and new GUIDs.

## Why two jobs beat one mega-job

Early attempts mixed TTS and long ffmpeg renders in one agent session. Long chapter muxes hit timeouts; OAuth-backed agent crons occasionally failed auth. Splitting concerns fixed that:

- Audio stays a fast, idempotent batch
- Media is a **script-only** cron that just works overnight
- Failures in still generation retry with safer prompts without blocking tomorrow’s verses

## Follow the work

- S1 story: [The Story of the Hey Bible Podcast](/blog/the-story-of-the-hey-bible-podcast)
- Listen to S1 now: [https://✝️.fm](https://✝️.fm)
- Product blog (lighter cut): [heybible.org](https://heybible.org/blog/behind-the-scenes-season-2)

Season 1 keeps releasing books. Season 2 keeps painting Genesis. Same mission — clearer audio, living pictures, free for everyone.

One chapter at a time. 📖
