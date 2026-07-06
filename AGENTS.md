# Project Notes

Duolingo-style language learning. **The React Native app in `mobile/` is the product
we're building.** Everything else supports it.

- **`mobile/` (Expo SDK 56)** — the learner app. **8 languages** for English
  speakers (Spanish, French, German, Italian, Portuguese, Japanese, Korean,
  Chinese). Learn path, lesson engine, practice tab, SRS, profile. Local-first:
  progress lives on-device (zustand + AsyncStorage), per-course.
- **Root (Next.js)** — cloned web app kept for **inspiration and reference**
  (UI patterns, original course structure). Optionally useful as content
  admin/preview. Not where new lesson UX work happens. Runs with a hardcoded
  local user (no Clerk/Stripe).

## Content pipeline (the important part)

Content is files-in-git, compiled into per-course JSON packs the app bundles.
Never edit `mobile/src/content/packs/*.json` or `audio-manifest.ts` by hand.

1. `content/{code}-en/units/*.json` — unit sources (`target`/`native` fields,
   12 words + 10 phrases + guidebook). Generated with
   `scripts/gen-content-nvidia.ts` (NVIDIA MiniMax-M3, free) or
   `scripts/gen-content.sh` (hcai Gemini). CJK courses include `romanization`.
2. `bun scripts/compile-content.ts` — validates against `content/schema.ts`
   (zod) and fans each unit out into lessons/exercises →
   `mobile/src/content/packs/{course-id}.json` + `catalog.json`.
3. `bun scripts/gen-audio.ts` — pre-generates TTS MP3s per language:
   - **Mistral Voxtral** (`MISTRAL_API_KEY`) for es/fr/de/it/pt
   - **Edge TTS** (free) for ja/ko/zh
   Output: `mobile/assets/audio/{code}/` + `audio-manifest.ts`. Idempotent.

Supported languages config: `content/languages.ts`.

If the pack format changes, update BOTH `content/schema.ts` (source of truth)
and `mobile/src/lib/types.ts` (hand-mirrored copy — Metro can't import outside
`mobile/`).

## Commands

- Mobile dev: `cd mobile && bun install && bunx expo start` (web: `--web`)
- Typecheck mobile: `cd mobile && bunx tsc --noEmit`
- Generate content (NVIDIA): `NVIDIA_API_KEY=... bun scripts/gen-content-nvidia.ts [course-id]`
- Compile all packs: `bun scripts/compile-content.ts`
- Generate audio: `MISTRAL_API_KEY=... bun scripts/gen-audio.ts [course-id ...]`
- hcai daily spend cap is ~$3 — Claude models burn it fast; Gemini flash
  (`--reasoning` required) and TTS are cheap.

## Plan

See `docs/plan.md` for the full roadmap (milestones M0–M4, kill list,
legal boundary on Duolingo content).
