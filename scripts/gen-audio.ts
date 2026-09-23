/**
 * Pre-generate TTS MP3s for all courses and emit a combined audio manifest.
 *
 * Providers:
 *   - Mistral Voxtral TTS — es, fr, de, it, pt (MISTRAL_API_KEY required)
 *   - Edge TTS (Microsoft neural voices) — ja, ko, zh (free, no key)
 *
 * Run: MISTRAL_API_KEY=... bun scripts/gen-audio.ts [course-id ...]
 */
import { createHash } from "crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { join } from "path";

import { getLanguage } from "../content/languages";

const ROOT = join(import.meta.dir, "..");
const PACKS_DIR = join(ROOT, "mobile/src/content/packs");
const MANIFEST = join(ROOT, "mobile/src/content/audio-manifest.ts");
const MISTRAL_MODEL = "voxtral-mini-tts-2603";
const MISTRAL_URL = "https://api.mistral.ai/v1/audio/speech";
const CONCURRENCY = 3;

type Pack = {
  id: string;
  targetCode: string;
  sections: {
    units: {
      words: { target: string }[];
      lessons: { exercises: Record<string, unknown>[] }[];
    }[];
  }[];
};

function collectTexts(pack: Pack): string[] {
  const texts = new Set<string>();
  for (const section of pack.sections) {
    for (const unit of section.units) {
      for (const word of unit.words) texts.add(word.target);
      for (const lesson of unit.lessons) {
        for (const exercise of lesson.exercises) {
          if (typeof exercise.audioTarget === "string") texts.add(exercise.audioTarget);
        }
      }
    }
  }
  return [...texts].sort();
}

const fileFor = (text: string) =>
  createHash("sha1").update(text).digest("hex").slice(0, 16) + ".mp3";

const manifestKey = (courseId: string, text: string) => `${courseId}:${text}`;

async function synthMistral(
  text: string,
  outPath: string,
  voiceId: string,
  apiKey: string
): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(MISTRAL_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MISTRAL_MODEL,
          input: text,
          voice_id: voiceId,
          response_format: "mp3",
        }),
      });
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
        continue;
      }
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`${res.status}: ${err.slice(0, 300)}`);
      }
      const data = (await res.json()) as { audio_data?: string };
      if (!data.audio_data) throw new Error("no audio_data in response");
      const buf = Buffer.from(data.audio_data, "base64");
      if (buf.length < 500) throw new Error(`audio too small (${buf.length}b)`);
      writeFileSync(outPath, buf);
      return true;
    } catch (err) {
      console.error(
        `mistral attempt ${attempt + 1} failed for "${text.slice(0, 40)}": ${err}`
      );
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return false;
}

/** Edge TTS via WebSocket — no API key, works for CJK. */
async function synthEdge(text: string, outPath: string, voice: string): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { EdgeTTS } = await import("edge-tts-universal");
      const tts = new EdgeTTS(text, voice);
      const result = await tts.synthesize();
      const buf = Buffer.from(await result.audio.arrayBuffer());
      if (buf.length < 500) throw new Error(`audio too small (${buf.length}b)`);
      writeFileSync(outPath, buf);
      return true;
    } catch (err) {
      console.error(
        `edge attempt ${attempt + 1} failed for "${text.slice(0, 40)}": ${err}`
      );
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return false;
}

async function synth(
  text: string,
  outPath: string,
  targetCode: string,
  apiKey: string | undefined
): Promise<boolean> {
  const lang = getLanguage(targetCode);
  if (lang.mistralVoice) {
    if (!apiKey) return false;
    return synthMistral(text, outPath, lang.mistralVoice, apiKey);
  }
  const edgeVoice = lang.edgeVoice;
  if (edgeVoice) return synthEdge(text, outPath, edgeVoice);
  console.error(`No TTS provider for ${targetCode}`);
  return false;
}

async function main() {
  const apiKey = process.env.MISTRAL_API_KEY;

  const requested = process.argv.slice(2);
  const allPacks = readdirSync(PACKS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));
  const packFiles = allPacks.filter(
    (id) => requested.length === 0 || requested.some((r) => id.startsWith(r))
  );

  type Job = { courseId: string; text: string; outPath: string; targetCode: string };
  const jobs: Job[] = [];

  for (const courseId of packFiles) {
    const pack = JSON.parse(
      readFileSync(join(PACKS_DIR, `${courseId}.json`), "utf8")
    ) as Pack;
    const outDir = join(ROOT, `mobile/assets/audio/${pack.targetCode}`);
    mkdirSync(outDir, { recursive: true });
    for (const text of collectTexts(pack)) {
      const outPath = join(outDir, fileFor(text));
      if (!existsSync(outPath) || statSync(outPath).size < 500) {
        jobs.push({ courseId, text, outPath, targetCode: pack.targetCode });
      }
    }
  }

  console.log(`${jobs.length} utterances to generate across ${packFiles.length} courses.`);
  if (!apiKey && jobs.some((j) => getLanguage(j.targetCode).mistralVoice)) {
    console.error("Set MISTRAL_API_KEY for es/fr/de/it/pt audio (or pass only ja/ko/zh course ids).");
    process.exit(1);
  }

  let failed = 0;
  let done = 0;
  const queue = [...jobs];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length > 0) {
        const job = queue.shift()!;
        const ok = await synth(job.text, job.outPath, job.targetCode, apiKey);
        if (!ok) failed++;
        done++;
        if (done % 20 === 0) console.log(`${done}/${jobs.length}...`);
      }
    })
  );

  // The manifest always covers every course, so a partial run never drops clips.
  const entries: string[] = [];
  for (const courseId of allPacks) {
    const pack = JSON.parse(
      readFileSync(join(PACKS_DIR, `${courseId}.json`), "utf8")
    ) as Pack;
    const langCode = pack.targetCode;
    for (const text of collectTexts(pack)) {
      const rel = `../../assets/audio/${langCode}/${fileFor(text)}`;
      const path = join(ROOT, "mobile/assets/audio", langCode, fileFor(text));
      if (existsSync(path) && statSync(path).size >= 500) {
        entries.push(`  ${JSON.stringify(manifestKey(courseId, text))}: require("${rel}"),`);
      }
    }
  }

  writeFileSync(
    MANIFEST,
    `// Generated by scripts/gen-audio.ts — do not edit by hand.\n` +
      `export const audioManifest: Record<string, number> = {\n${entries.join("\n")}\n};\n`
  );
  console.log(`Done. ${entries.length} manifest entries, ${failed} failures.`);
  if (failed > 0) process.exit(1);
}

await main();
