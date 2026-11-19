# Coral Cover — GTA-style cover art maker

Entry for make.fun bounty **gta6-cover-art-01** ("Make GTA 6 Cover Art", $250).

A fully offline web app that turns a person's photo and a caption into
GTA-style multi-panel cover art, exported as a PNG to share.

## What it does

- **Any photo:** upload your own photos into 3 panels, or use the 4 bundled
  AI-made sample photos (boulevard, pier, neon street, beach). Each panel
  crops and positions independently — drag the preview to pan, scroll to
  zoom, or use the Zoom / Pan sliders.
- **Multi-panel poster look:** Poster (hero + two panels), One hero photo,
  or Diagonal split layouts, with white gutters, a sunset/neon/dusk colour
  grade, a soft sun-disc motif (hidden on the neon grade, where a pale sun
  over a night scene would look pasted on) and a fictional "Coral Bay" badge.
- **Bold caption lettering:** big outlined capitals with a tracked subtitle
  bar, in the genre's style — your own words, never Rockstar's.
- **Fast and easy:** photo → cover in a couple of clicks; export PNG in
  1080×1080, 1080×1350 or 1920×1080.

## Originality

Everything is the entrant's own work: the cover engine (`app/src/cover.js`)
draws every panel, grade, motif and letter from code; the sample photos were
made with an image model for this entry; no Rockstar Games logo, wordmark,
official artwork, character or font is used anywhere. Not affiliated with
Rockstar Games.

## Run it

```sh
node serve.ts        # serves app/ on http://localhost:8080
```

## Hand it in (kit check)

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
node ../gta6-cover-art-01-kit/cli/makefun.mjs check --kit ../gta6-cover-art-01-kit --repo .
```

## Screenshots

`shots.json` stages the four scenes; `node screenshot.mjs` captures them
into `screenshots/` (1-cover.jpg is the landscape cover, 2-editor.jpg the
editor with photos loaded, 3-cover-square.jpg and 4-cover-portrait.jpg the
other export sizes).

## License

MIT — see LICENSE.
