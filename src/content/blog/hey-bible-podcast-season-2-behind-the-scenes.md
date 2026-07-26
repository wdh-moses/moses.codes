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

**Season 2** is the parallel track we’ve been quietly building next to it. Same free WEB text, same “press play and listen” mission — but a warmer HD narrator, classical oil-painting chapter art, and full chapter **video** with slow Ken Burns motion timed to the verses. Public S2 release stays gated until S1 finishes all 66 books (`release_gate: blocked_until_season1_complete` in the S2 progress file). Production, though, is already deep into Genesis: as of this writing the cursor sits past Genesis 40 with **1,240+** verse files on disk and matching chapter videos for everything that’s been stitched so far.

If you want the lighter product-facing cut, it’s on the [Hey Bible blog](https://heybible.org/blog/behind-the-scenes-season-2). This post is the longer workshop version — more paths, more ffmpeg, fewer marketing slides.

## A real chapter, not a mockup

We’re far enough along to share actual output — not a mood board.

**[Watch ~90s of Genesis 1](https://files.wdh.sh/download/714884994c9671a73d7e207b)** · **[Full chapter video](https://files.wdh.sh/download/4d41fc9a5fb69eeed71ac8be)** · **[Audio only](https://files.wdh.sh/download/94f6e3d87b4bc0431177133a)**

*(Those are temporary file hosts while we finish packaging S2 for the main player.)*

![Genesis 1 oil plate](/blog-s2-genesis1-plate.webp)

Genesis 1’s finished cut is a good mental model for the whole system. The chapter audio is a stitch of thirty-one individual verse MP3s. The picture side is **ten oil plates**, not one poster held for four minutes — each plate covers a verse-boundary chunk of roughly 18–30 seconds. Chunk one is verses 1–5 (~29.6s); the last is verses 30–31 (~19.4s). When you watch the preview, every time the painting “changes,” you’re crossing one of those chunk boundaries.

Compared with Season 1, the shape of the work changed. S1 is Bill via Venice Turbo, cover art and social stills, no chapter video, and releases that are already live. S2 is **MiniMax HD · DeepVoiceMan** via Venice (`tts-minimax-speech-02-hd`), **multi-plate oil stills per chapter** from Grok Imagine (`grok-imagine-image-quality`), **verse-timed Ken Burns** chapter MP4s, and a deliberate split into two nightly jobs — audio first, then photos and video. We briefly tried another MiniMax voice earlier in S2 and archived that audio when we locked DeepVoiceMan; the progress file still remembers the switch so we don’t accidentally mix voices mid-book.

## Two jobs so nothing blocks anything

The biggest operational lesson from S1 (and from early S2 experiments) was: don’t put slow ffmpeg next to TTS in the same session and hope for the best. Long chapter muxes time out. Agent crons sometimes fail auth halfway through a render. So S2 splits the factory in half and gives each half a schedule of its own.

**Job A runs every evening around 7:00 PM ET.** It’s a Python batch (`generate-verses.py`) that reads a small JSON cursor — book, chapter, verse, completed count — and walks forward through the WEB. Default batch size is **300 verses** a night (overridable on the command line). For each verse it skips work if the MP3 already exists (idempotent restarts are free), otherwise it calls Venice’s audio API with model `tts-minimax-speech-02-hd` and voice **DeepVoiceMan**, writes the bytes to disk, and only then advances the cursor. Rate limits get exponential backoff; a failed verse doesn’t poison the whole batch.

Each successful verse lands as its own permanent file:

```
audio/verses/{book}/{chapter}/{book}-{chapter}-{verse}-web.mp3
```

Same permanence rule as Season 1: **verse files are the library.** We don’t throw them away after stitching. When the last verse of a chapter lands, the script concatenates that chapter’s verse files into a chapter MP3 with ffmpeg:

```
audio/chapters/{book}/{book}-{chapter}-web.mp3
```

Chapter audio is a derived artifact. The verses are the source of truth. That matters later when we re-time video chunks — durations always come from probing the verse files, not from guessing.

**Job B starts about thirty minutes later (~7:30 PM ET).** This one used to be an LLM agent session, which sounded clever until OAuth tokens expired mid-Genesis and tool loops burned an hour without writing a single MP4. It’s now a **script-only cron**: load `XAI_API_KEY`, run `run-catchup-media.py`, print a short summary. No chat model required.

The catch-up script scans a book (Genesis today) for chapters that have chapter audio but are missing a video larger than ~100KB. For each gap it shells into `generate-verse-timed-chapter-video.py`. If a chapter’s `chunks.json` exists and **every** listed plate file is present and non-trivial, it passes `--skip-images` and only re-renders motion. If the plate set is incomplete (we learned this the hard way on Genesis 36 — four jpgs and a JSON is not “done”), it regenerates images instead of crashing halfway through Ken Burns. Finished videos are never rebuilt unless you force them.

End to end, Job B’s contract is simple: audio in, chapter MP4 out:

```
video/chapters/{book}/{book}-{chapter}.mp4
```

| Layer | What we use |
|-------|-------------|
| Verse text | Hey Bible / WEB |
| TTS | Venice → MiniMax HD (`tts-minimax-speech-02-hd`, DeepVoiceMan) |
| Oil stills | xAI Grok Imagine (`grok-imagine-image-quality`) |
| Motion + mux | ffmpeg (`zoompan`, `gblur`, `xfade`, `scale=lanczos`) |
| Orchestration | Hermes cron: 7:00 PM audio · 7:30 PM media script |
| Human social review | Automate It (Hey Bible workspace) |

## Why it looks like a gallery, not a trailer

We tried photoreal landscapes. They felt like stock footage sitting on top of Scripture — too “travel channel,” not enough “this was made on purpose.” The lock we kept is quieter: classical European religious **oil painting** (old-master / baroque–romantic feel), wide **16:9** native plates, **no frames, mats, or borders**, and prompts that actually include the verse text for that chunk so Jacob’s ladder doesn’t get a generic sunset. If xAI moderates a plate, the script retries with a safer landscape-only prompt and keeps going rather than failing the whole chapter. “Museum gallery quiet” beats “cinematic CGI Bible movie” for this show.

## How a still becomes a chapter video

This is the mechanical heart of Job B, and it’s where most of the craft (and most of the CPU) lives.

### Chunking on verse boundaries

We probe every verse MP3 with `ffprobe`, then walk verses in order packing them into chunks. Targets are **CHUNK_MIN ≈ 18s** and **CHUNK_MAX ≈ 30s**. A new chunk starts only when adding the next verse would overflow the max (or when the chapter ends). Picture changes only on **verse boundaries** — never mid-word, never on a fixed wall-clock grid that ignores the narration. Each chunk record looks roughly like:

```json
{
  "verses": [1, 2, 3, 4, 5],
  "start_v": 1,
  "end_v": 5,
  "duration": 29.592,
  "image": "…/genesis-1-chunks/chunk-01.jpg"
}
```

That metadata is written to `chunks.json` beside the plates so a later `--skip-images` run can rebuild motion without re-prompting Grok.

### Painting the plates

For each chunk we build an oil-painting prompt from the verse span, call Grok Imagine at quality tier, and normalize the result to JPEG on disk (`chunk-01.jpg`, `chunk-02.jpg`, …). URL sidecars are kept for debugging. Existing good plates are skipped unless `--force-images` is set — image gen is the expensive, rate-limited step; we don’t redo it because Ken Burns settings changed.

### The ultra-smooth Ken Burns stack

Naive `zoompan` recipes jitter. Ours stacks several anti-crawl measures that we locked after a lot of bad sample clips:

1. **Large working plate.** Scale/crop the still onto a **4800×4800** square with lanczos before any motion. More pixels in → less crawl when we zoom.
2. **Zoom 1.0 → 1.45** with a **smoothstep** ease, not linear. If `u = on/frames`, ease is `u*u*(3-2*u)`. Linear zoom feels mechanical; smoothstep eases the start and end.
3. **Pan room from constant max zoom.** x/y are computed as `(iw - iw/1.45) * fraction`, **not** from the live zoom value. When pan depends on the instantaneous zoom, the crop window breathes and you get a drunken float.
4. **Four alternating pan directions** (cycle per segment) so consecutive plates don’t all drift the same way.
5. **60 fps supersample → light gblur → 30 fps delivery.** zoompan renders at 60fps into a 2560×1440 intermediate, `gblur=sigma=0.45` softens residual 1px shimmer, then lanczos down to **1280×720@30**. That temporal average is doing more work than it sounds.
6. **Silent segment encode** first: H.264 main, yuv420p, preset medium, **CRF 19**, no audio. Audio is a separate concern.

In filter-graph terms, one segment looks like:

```
scale=4800:4800:force_original_aspect_ratio=increase:flags=lanczos,
crop=4800:4800,
zoompan=z='1+0.45*smoothstep':x='…':y='…':d=N60:s=2560x1440:fps=60,
gblur=sigma=0.45,
scale=1280:720:flags=lanczos,
fps=30,setsar=1,format=yuv420p
```

### Crossfade, then mux

Segments are concatenated with ffmpeg **xfade** dissolves (**0.75s** fades). Offsets are computed from probed segment durations so the fades land cleanly even when chunks aren’t identical lengths. The silent reel is then muxed under the chapter MP3 — map video from the reel, audio from the stitch, write the final chapter MP4 (another H.264 pass around CRF 20 for the combined file). Book-level concat and YouTube masters come later; the chapter file is the durable unit Job B is responsible for.

Still → smooth KB segment → xfade reel → + chapter audio. That’s the whole picture path.

A long chapter is not cheap. Genesis 36 needed **thirteen** plates and thirteen KB renders before mux; wall-clock is dominated by zoompan, not by the API calls. That’s exactly why media is allowed to grind after audio has already gone to bed.

## Idempotency, failure modes, and the scars we kept

A few production details that don’t show up in a pretty diagram:

- **Skip if present.** Verses, plates, and videos all short-circuit when a good file already exists. Catch-up is safe to re-run every night.
- **Incomplete plate sets are not “skip-images.”** Early catch-up treated “any jpg in the folder” as done. Genesis 36 had four plates and a full `chunks.json` claiming thirteen — Ken Burns then died on a missing `chunk-05.jpg`. The guard now checks that every index in the JSON has a real file above a minimum size.
- **Moderation retries** stay inside the chapter; one blocked prompt doesn’t fail the book.
- **Release gate** is a hard flag. Nothing in S2 is allowed to publish over S1’s R2 objects or recycle S1 feed GUIDs. When S1 finishes the 66, S2 can land on the same show with proper `itunes:season` metadata and new GUIDs.
- **Agent crons for long ffmpeg were a mistake.** OAuth 403s and max-iteration tool loops burned whole evenings. Script-only media cron was the fix; the LLM stays in the loop for writing and review, not for babysitting zoompan.

We’re not shipping S2 to Spotify or Apple while S1 is incomplete. We’re not doing public YouTube book drops for S2 yet. We *are* filling Genesis so launch isn’t a cold start.

## Where to go from here

- S1 origin story: [The Story of the Hey Bible Podcast](/blog/the-story-of-the-hey-bible-podcast)
- Listen to S1 now: [https://✝️.fm](https://✝️.fm)
- Lighter product post: [heybible.org](https://heybible.org/blog/behind-the-scenes-season-2)

Season 1 keeps releasing books. Season 2 keeps painting Genesis — three hundred verses a night, then whatever chapter videos the audio has earned. Same mission: clearer audio, living pictures, free for everyone. One chapter at a time.
