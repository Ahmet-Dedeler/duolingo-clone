# Open-Source Duolingo — Refined Plan

## Decisions (locked now)

1. **One learner client: Expo React Native.** The existing Next.js app becomes a
   content admin/preview tool only — no further investment in its lesson UI.
2. **Content lives in files, not Postgres.** Course content is YAML/JSON in git,
   compiled into versioned **content packs** (JSON + MP3s + images). The DB (and
   later, on-device SQLite) holds only user state: progress, streak, mistakes,
   SRS schedule.
3. **Local-first v1. No accounts, no API.** Content pack ships with the app;
   progress stays on-device. Sync, auth, and leaderboards are a later milestone.
4. **Audio is pre-generated, day one.** Batch TTS (OpenAI / hcai) → cached MP3s
   in the content pack. Device TTS is the offline fallback, not the MVP. Every
   target-language word/phrase/prompt has a speaker button and tap-to-hear.
5. **First course: Spanish for English speakers.**
6. **AI-draft + human-review is the primary content pipeline.** LibreLingo,
   Tatoeba, Wiktionary, and OER textbooks are raw material and reference, not
   the foundation. (Kills the LibreLingo-ES license blocker.)

## Content pack format (the keystone artifact)

```
Course → Section → Unit → Lesson → Exercise
                      ↘ Guidebook
Word / Phrase → { text, translation, alternatives, audioSrc, imageSrc, attribution }
```

- Versioned JSON schema in `packages/content-schema` (zod, shared by compiler,
  admin tool, and app).
- Compiler: `content/` YAML → `dist/packs/es-en.v1/` (JSON + media manifest).
- One source item (word + example phrase) fans out into many exercise types:
  picture choice, translate, reverse translate, word bank, fill-blank,
  type-what-you-hear, match pairs, flashcard, speak-repeat.
- Every asset row carries license + attribution. No mystery images.

## Milestones

### M0 — Skeleton (1–2 days)
- Monorepo layout: `apps/mobile` (Expo), `apps/admin` (current Next app, moved),
  `packages/content-schema`, `content/es-en/`.
- Content pack schema v0 + compiler stub.
- `docs/content-sources.md`: license audit ONLY for sources we actually use in M1.
- **Exit:** `bun run compile-content` produces a valid pack from one hand-written unit.

### M1 — Vertical slice (week 1)
- Expo app: path screen (sections → units → lesson nodes, locked/unlocked),
  lesson loop (prompt → answer → feedback → continue → completion).
- 5 exercise types: select (image choice), word bank translate, fill-blank,
  match pairs, type-what-you-hear.
- Pre-generated audio wired in; tap any target-language word to hear it.
- On-device progress: XP, streak, hearts (or not), lesson completion.
- Content: 1 unit, ~3 lessons, hand-reviewed.
- **Exit:** playable end-to-end on a real phone, with good audio.

### M2 — Content factory (weeks 2–3)
- AI drafting pipeline: prompt templates → YAML drafts → human review via PR →
  compile. Seed/cross-check with LibreLingo-ES structure and Tatoeba sentences.
- Exercise variant generator (one item → many exercise types, distractor
  selection from same-unit vocab).
- Image resolver: curated/generated pack → Wikimedia/Openverse (license
  verified) → consistent-style generated image → emoji/icon fallback.
- Batch TTS script with caching (only regenerate changed utterances).
- **Exit:** 1 full section (8–10 units) generated, reviewed, playable.

### M3 — Retention layer (week 4)
- Word list: every learned word, seen count, right/wrong history, exportable.
- Mistake review + SRS (SM-2-ish) as a first-class Practice tab.
- Unit guidebooks (markdown in content pack, rendered in-app).
- Daily goal, streak repair logic, local notifications (gentle, not dark-pattern).
- **Exit:** a returning user has a reason to open the app daily.

### M4 — Scale & differentiate
- Full course depth (3 sections), listening drills, speaking (STT) exercises.
- Placement test / test-out.
- Optional backend: auth + sync + leaderboards (only now does an API exist).
- Admin tool improvements for content review.

## Kill list (unchanged)
Paid tier, ads, energy mechanic, social feed, leagues, Duolingo Score,
math/music/chess, aggressive notifications.

## Legal boundary
Official Duolingo app = product reference only (structure, themes, interaction
patterns). Never copy their prompts, audio, images, characters, or curriculum
text. All shipped content must trace to `content-sources.md` or our own pipeline.
