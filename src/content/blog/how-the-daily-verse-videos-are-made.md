---
title: "How the Hey Bible daily verse videos are made"
description: "The workshop version of the morning clips: a 15-second Grok Imagine shot, a 10-second extend, an ElevenLabs bed, the mux, and the flip-in card."
pubDate: 2026-11-16
author: "Moses"
categories: ["Hey Bible"]
tags: ["hey-bible", "daily-verse", "grok-imagine", "elevenlabs", "ffmpeg", "venice"]
---

The product cut of this story is on the [Hey Bible blog](https://heybible.org/blog/daily-verse-videos). That post is the story of the morning clips, from the first landscape to where they are now. This one is the factory: models, lengths, the extend, and the overlay.

These are the social clips, one verse a morning at 7 AM Eastern. They are not Season 2. Season 2 is oil plates and Ken Burns timed to chapter audio. This lane is a photoreal landscape, a short instrumental, and a card.

## What a finished morning is

One scene, two files.

The wide cut is 16:9 and goes to Threads and Facebook. The tall cut is a center crop of that same video, 9:16, and goes to X, Instagram, YouTube, and TikTok. We do not generate a native portrait video. Imagine's 9:16 image-to-video has squashed a good still into a short, fat frame. Crop after the motion exists.

The card is composited **after** that crop. Overlay the wide file and then crop it, and the card and the watermark get sliced. We learned that on John 16:33.

Nothing in this lane is approved by the agent that made it. The task lands in review. A person posts it.

## Picture

Three steps, in order.

1. A photoreal still, 16:9, no people, no text. The prompt must not say "card", "caption", "band", or "stripe". Those words paint a placeholder: a white box, a hole in the road, a black bar across the frame. Ask for even light. If the middle needs to be dark so type can sit there later, that darkness has to be the scene (night, water, shade), not a zone drawn for type.

2. Fifteen seconds of image-to-video on `grok-imagine-video-1.5`, 1080p, 16:9, locked tripod. The Hermes video plugin clamps this call to 720p, so the 1080p shot is a direct POST to `/videos/generations`, not the plugin. The still has to be an HTTPS URL. A local path is rejected. If xAI's public-URL cap is full, upload the still somewhere else and pass that URL.

3. Ten more seconds with `xai_video_extend` on `grok-imagine-video`. Not 1.5. Extending with 1.5 returns HTTP 400. The extend input is the raw 15-second file, never the shipped cut. The card is burned into the shipped frames, and the model will continue the type.

The extend currently lands around 720p (about 1274×722). That is the length trade. We tried other extenders. A last-frame restart and a Flux extend both seamed. Length won. The shipped 25-second file is 720p because of this step, not because the first fifteen seconds were.

Two practical limits on that extend:

- The source must be under 52,428,800 bytes. A 15-second 1080p file can sit just over that (`53786353` is the number we hit). Slim it to 1280×720, baseline H.264, no audio, upload that, and extend the slim URL.
- The vidgen URL expires. Download it immediately.

The extend prompt has to name the thing that was moving. "Same slow drift, do not speed up" still accelerates clouds and still lets water die. If the tail raced, say that thing stays at the first-half speed or slower, and the wind does not increase. If the tail froze, say it must keep moving and must not go still. If debris blows across the grounds after 15 seconds, the camera stays locked, the clouds keep the first-half speed, and the grounds stay clean. Compare a frame just before 15 seconds with one just after, before you mux. A failed extend does not get a card.

## Music

New beds are Venice `elevenlabs-music-v2-5`, `force_instrumental: true`, `duration_seconds: 25`. `stable-audio-25` is retired for new work. One kept cut, Exodus 33:14, still sits on the old model because that cut was accepted as a whole. Do not "upgrade" it in passing.

The song is chosen from the still, after looking at it. A sunrise meadow gets sunny fingerstyle and light piano. A woods walk gets unhurried guitar, not brass. A quiet castle gets a continuous hymn, not horns. Horn prompts come back as on/off fanfare hits. A nature bed that gets called creepy or unsettling is done as a family. The next one is guitar and piano, even if the picture is a pasture. Do not ship the audio track that Grok Imagine bakes into the 15-second file. Those birds do not survive the extend.

Retrieve has to send `model` and `queue_id`. Poll until the body is actually audio. A JSON status body saved as `.mp3` is a silent failure later.

Level is a measured gain to about −36 dB mean. No `loudnorm`. Loudnorm crackles on these beds. Venice often sits near −65 dB for the first second or two, then the note hits. Trim that silence (leave about 30 ms), then a 0.05 second fade in. A 1.2 second fade on an untrimmed bed is why the music starts late. Fade out is 2.5 seconds near the end of the picture.

## Mux

Map video from the extend and audio from the bed. Nothing else.

```
ffmpeg -i extend25.mp4 -i bed.wav \
  -map 0:v:0 -map 1:a:0 \
  -vf "fps=24,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p" \
  -af "aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,atrim=start=${ONSET},asetpts=PTS-STARTPTS,volume=${GAIN}dB,alimiter=limit=0.89:attack=7:release=100:level=disabled,afade=t=in:st=0:d=0.05,afade=t=out:st=${FADE}:d=2.5" \
  -c:v libx264 -profile:v baseline -pix_fmt yuv420p -preset medium -crf 20 \
  -c:a aac -b:a 160k -ar 48000 -ac 2 \
  -shortest -movflags +faststart out.mp4
```

`GAIN` is `-36` minus the mean dB of the trimmed bed. Portrait is the same audio filter with `scale=-2:1280,crop=720:1280`. If a shipped cut only needs a new song, `-c:v copy` onto the file that already has the card. Do not remux the raw extend and do not re-overlay.

## The card

`overlay-verse-flip.py` runs on the clean mux, once, for each shape.

The verse is one cream Liberation Serif copy. There used to be a second draw, 2 pixels down and right, black at alpha 110. It only showed on round letters over a light patch, and it read as a doubled letter. That offset is gone. Do not put it back.

The plate is dark glass, fill `(18, 16, 12, 128)`, feather 3, no drop shadow. The hard edge people saw was the shadow layer, not the glass. A "little darker" pass for one task has used alpha 152 and a 1 pixel feather, then the script goes back to 128 / 3. Do not leave the script at 152.

The card flips in after about half a second. `@heybibleapp` sits bottom-right for the whole clip. The copyright line is the translation's real notice. The daily posts are CSB. Marketing pictures that bake verse text use KJV or WEB unless the licence allows the translation in the image.

## What stays out of the public post

Model names, the 720p extend, the 50 MB cap, and this mux. The morning post on heybible.org says the clips got longer, the song changed, the card got quieter, and approved older clips were left alone. That is the true short version. This is the one you would need if you had to build the next one.
